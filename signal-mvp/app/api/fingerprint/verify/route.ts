import { NextResponse } from 'next/server';
import { callClaude, parseJsonResponse } from '@/lib/anthropic';
import { getChallenge, deleteChallenge } from '@/lib/fingerprint-store';

export async function POST(req: Request) {
  try {
    const { challengeId, answer } = await req.json();
    if (!challengeId || !answer) {
      return NextResponse.json({ error: 'challengeId and answer required' }, { status: 400 });
    }

    const challenge = getChallenge(challengeId);
    if (!challenge) {
      return NextResponse.json({ error: '인증 세션이 만료됐어. 다시 시도해줘.' }, { status: 400 });
    }

    // 5분 만료 체크
    if (Date.now() - challenge.createdAt > 5 * 60 * 1000) {
      deleteChallenge(challengeId);
      return NextResponse.json({ error: '시간 초과. 다시 시도해줘.' }, { status: 400 });
    }

    const raw = await callClaude({
      system: `너는 인격지문 인증 판정관이야.
사용자의 심리 벡터, 질문, 예상 방향, 그리고 실제 답변을 비교해서 본인인지 판정해.

판정 기준:
- 벡터가 나타내는 성격/가치관의 방향과 답변이 일관되는지 본다
- 정확한 문장 매칭이 아니라, "이 성격의 사람이라면 이런 방향으로 답할 것인가"를 본다
- 너무 엄격하지 않게 — 70% 이상 일치하면 통과
- 너무 짧거나 성의 없는 답변(1-2단어)은 판단 불가로 처리

JSON으로 답해:
{
  "pass": true/false,
  "confidence": 0.0~1.0,
  "reason": "판정 이유 (사용자에게 보여줄 1-2문장)",
  "detail": "내부 분석 (사용자에게 안 보임)"
}`,
      messages: [
        {
          role: 'user',
          content: `## 사용자 벡터
${challenge.vectorSummary}

## 질문
${challenge.question}

## 예상 방향 (이 벡터를 가진 사람이라면)
${challenge.expectedDirection}

## 실제 답변
${answer}

판정해줘.`,
        },
      ],
      maxTokens: 512,
      temperature: 0.3,
    });

    const result = parseJsonResponse<{
      pass: boolean;
      confidence: number;
      reason: string;
      detail: string;
    }>(raw);

    // 사용 후 챌린지 삭제
    deleteChallenge(challengeId);

    return NextResponse.json({
      pass: result.pass,
      confidence: result.confidence,
      reason: result.reason,
      userId: challenge.userId,
    });
  } catch (e: any) {
    console.error('[fingerprint/verify]', e);
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
