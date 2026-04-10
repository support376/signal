import { NextResponse } from 'next/server';
import { callClaude, parseJsonResponse } from '@/lib/anthropic';
import { getChallenge, deleteChallenge } from '@/lib/fingerprint-store';
import { getIntegratedVector } from '@/lib/db';
import { AXES, AXIS_LABELS_KO, type Axis } from '@/lib/types';

/**
 * 코사인 유사도: 두 벡터가 같은 방향이면 1, 반대면 -1
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * 가중 유클리드 거리 (confidence가 높은 축에 더 가중)
 */
function weightedDistance(stored: number[], extracted: number[], weights: number[]): number {
  let sum = 0, wSum = 0;
  for (let i = 0; i < stored.length; i++) {
    const diff = stored[i] - extracted[i];
    sum += weights[i] * diff * diff;
    wSum += weights[i];
  }
  return wSum > 0 ? Math.sqrt(sum / wSum) : 100;
}

export async function POST(req: Request) {
  try {
    const { challengeId, answer } = await req.json();
    if (!challengeId || !answer) {
      return NextResponse.json({ error: 'challengeId and answer required' }, { status: 400 });
    }

    const challenge = await getChallenge(challengeId);
    if (!challenge) {
      return NextResponse.json({ error: 'expired', message: '세션을 찾을 수 없어. 새 질문을 받아줘.' }, { status: 400 });
    }

    // 1. 답변에서 벡터 추출 (LLM → 15축 수치)
    const axisListKo = AXES.map(a => `"${AXIS_LABELS_KO[a]}"`).join(', ');

    const raw = await callClaude({
      system: `너는 심리 벡터 추출기야.
사용자의 답변에서 성격/가치관 신호를 읽고 15축 벡터로 변환해.

15축: ${axisListKo}

규칙:
- 각 축에 0~100 값을 부여해 (50 = 중립/판단 불가)
- 답변에서 신호가 분명한 축만 50에서 벗어나게 해
- 답변이 짧아도 드러나는 경향이 있으면 추출해
- 추출할 수 없는 축은 정확히 50으로

JSON으로 답해:
{
  "axes": {
    "value_security": 수치,
    "value_benevolence": 수치,
    "value_self_direction": 수치,
    "value_achievement": 수치,
    "value_universalism": 수치,
    "value_tradition": 수치,
    "big5_neuroticism": 수치,
    "big5_agreeableness": 수치,
    "big5_conscientiousness": 수치,
    "attach_anxiety": 수치,
    "attach_avoidance": 수치,
    "moral_loyalty": 수치,
    "moral_care": 수치,
    "conflict_style": 수치,
    "repair_capacity": 수치
  },
  "detected_axes": ["신호가 분명한 축 이름들"],
  "reasoning": "추출 근거 1-2문장"
}`,
      messages: [
        {
          role: 'user',
          content: `## 질문 맥락
${challenge.question}

## 사용자 답변
${answer}

이 답변에서 15축 벡터를 추출해줘.`,
        },
      ],
      maxTokens: 600,
      temperature: 0.2,
    });

    const extracted = parseJsonResponse<{
      axes: Record<string, number>;
      detected_axes: string[];
      reasoning: string;
    }>(raw);

    // 2. 저장된 벡터 로드
    const storedVector = await getIntegratedVector(challenge.userId);
    if (!storedVector) {
      await deleteChallenge(challengeId);
      return NextResponse.json({ pass: true, confidence: 0, reason: '벡터 없음 — 우회', userId: challenge.userId, attempt: challenge.attempt });
    }

    // 3. 벡터 비교 (코사인 유사도 + 가중 거리)
    const storedValues: number[] = [];
    const extractedValues: number[] = [];
    const weights: number[] = [];

    for (const axis of AXES) {
      const sv = storedVector.axes[axis];
      storedValues.push(sv.value);
      extractedValues.push(extracted.axes[axis] ?? 50);
      // confidence가 높고, 답변에서 감지된 축에 더 높은 가중치
      const isDetected = extracted.detected_axes.some(d =>
        d === axis || d === AXIS_LABELS_KO[axis]
      );
      weights.push(isDetected ? sv.confidence * 2 : sv.confidence * 0.3);
    }

    const cosine = cosineSimilarity(storedValues, extractedValues);
    const wDist = weightedDistance(storedValues, extractedValues, weights);

    // 감지된 축만 따로 비교 (핵심 판정)
    const detectedCosine = (() => {
      const sVals: number[] = [];
      const eVals: number[] = [];
      for (const axis of AXES) {
        const isDetected = extracted.detected_axes.some(d =>
          d === axis || d === AXIS_LABELS_KO[axis]
        );
        if (isDetected) {
          sVals.push(storedVector.axes[axis].value);
          eVals.push(extracted.axes[axis] ?? 50);
        }
      }
      return sVals.length >= 2 ? cosineSimilarity(sVals, eVals) : cosine;
    })();

    // 4. 판정
    // cosine: 1에 가까울수록 같은 방향
    // wDist: 낮을수록 가까움 (0~100 스케일)
    // detectedCosine: 신호 있는 축만의 유사도
    const pass = detectedCosine >= 0.75 || (cosine >= 0.85 && wDist < 25);
    const confidence = Math.round(((detectedCosine + cosine) / 2) * 100) / 100;

    let reason: string;
    if (pass) {
      reason = `벡터 일치도 ${Math.round(detectedCosine * 100)}% — 본인으로 판정`;
    } else {
      reason = `벡터 일치도 ${Math.round(detectedCosine * 100)}% — 기준 미달 (75% 필요)`;
    }

    await deleteChallenge(challengeId);

    return NextResponse.json({
      pass,
      confidence,
      reason,
      userId: challenge.userId,
      attempt: challenge.attempt,
      debug: {
        cosine: Math.round(cosine * 1000) / 1000,
        detectedCosine: Math.round(detectedCosine * 1000) / 1000,
        weightedDistance: Math.round(wDist * 10) / 10,
        detectedAxes: extracted.detected_axes,
        reasoning: extracted.reasoning,
      },
    });
  } catch (e: any) {
    console.error('[fingerprint/verify]', e);
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
