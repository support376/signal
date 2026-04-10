import { NextResponse } from 'next/server';
import { getUser, getIntegratedVector } from '@/lib/db';
import { callClaude, parseJsonResponse } from '@/lib/anthropic';
import { AXIS_LABELS_KO, type Axis } from '@/lib/types';
import { setChallenge } from '@/lib/fingerprint-store';

export async function POST(req: Request) {
  try {
    const { userId, attempt = 1 } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const user = await getUser(userId);
    if (!user) return NextResponse.json({ error: '사용자를 찾을 수 없어' }, { status: 404 });

    if (!user.fingerprint_enabled) {
      return NextResponse.json({ fingerprintRequired: false });
    }

    const vector = await getIntegratedVector(userId);
    if (!vector) {
      return NextResponse.json({ fingerprintRequired: false });
    }

    // 벡터에서 신뢰도 높은 축 선택
    const strongAxes: { axis: Axis; value: number; label: string }[] = [];
    for (const [axis, m] of Object.entries(vector.axes)) {
      if (m && m.confidence >= 0.4 && m.value !== undefined) {
        strongAxes.push({
          axis: axis as Axis,
          value: m.value,
          label: AXIS_LABELS_KO[axis as Axis],
        });
      }
    }

    if (strongAxes.length < 2) {
      return NextResponse.json({ fingerprintRequired: false });
    }

    // 시도 횟수에 따라 다른 축 조합 사용 (다양한 질문 생성)
    strongAxes.sort((a, b) => b.value - a.value);
    const offset = ((attempt - 1) * 2) % strongAxes.length;
    const shuffled = [...strongAxes.slice(offset), ...strongAxes.slice(0, offset)];
    const topAxes = shuffled.slice(0, 5);

    const vectorSummary = topAxes
      .map((a) => `${a.label}: ${a.value}/100`)
      .join('\n');

    // 시도 횟수가 높을수록 더 쉬운 질문 요청
    const difficultyNote = attempt >= 3
      ? '\n중요: 이전 시도에서 실패했어. 더 일상적이고 쉬운 질문을 만들어. 극단적 상황보다 평범한 일상 선택을 물어봐.'
      : attempt >= 2
      ? '\n참고: 이전 시도에서 실패했어. 조금 더 직관적인 질문으로 만들어.'
      : '';

    const raw = await callClaude({
      system: `너는 인격지문 인증 시스템이야.
사용자의 심리 벡터를 기반으로 "이 사람만 자연스럽게 대답할 수 있는" 상황 질문 1개를 만들어.

규칙:
- 질문은 일상적 상황 판단이나 감정 반응을 묻는 형태여야 해
- 정답이 하나가 아니라, "이 벡터를 가진 사람이면 이런 방향으로 답할 것"이라는 것을 판단할 수 있어야 해
- 질문 자체에서 벡터 정보가 드러나면 안 돼 (축 이름, 점수 언급 금지)
- 한국어로, 2-3문장 이내 상황 설명 + 질문
- 너무 쉽거나 누구나 같은 답을 할 질문은 피해
- 이전 질문과 다른 상황을 사용해${difficultyNote}

JSON으로 답해:
{
  "question": "상황 + 질문 텍스트",
  "key_axes": ["사용할 축 이름들"],
  "expected_direction": "이 벡터를 가진 사람이라면 이런 방향의 답변을 할 것이라는 내부 판단 기준 (사용자에게 안 보임)"
}`,
      messages: [
        {
          role: 'user',
          content: `이 사용자의 심리 벡터:\n${vectorSummary}\n\n인격지문 인증 질문 1개를 생성해줘. (${attempt}번째 시도)`,
        },
      ],
      maxTokens: 512,
      temperature: 0.9,
    });

    const parsed = parseJsonResponse<{
      question: string;
      key_axes: string[];
      expected_direction: string;
    }>(raw);

    const challengeId = `fp_${userId}_${Date.now()}`;
    await setChallenge(challengeId, {
      userId,
      question: parsed.question,
      keyAxes: parsed.key_axes,
      expectedDirection: parsed.expected_direction,
      vectorSummary,
      attempt,
    });

    return NextResponse.json({
      fingerprintRequired: true,
      challengeId,
      question: parsed.question,
      attempt,
      maxAttempts: 5,
    });
  } catch (e: any) {
    console.error('[fingerprint/challenge]', e);
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
