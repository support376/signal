import { NextResponse } from 'next/server';
import { callClaude, parseJsonResponse } from '@/lib/anthropic';
import { getChallenge, deleteChallenge } from '@/lib/fingerprint-store';

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

    const raw = await callClaude({
      system: `너는 인격지문 인증 판정관이야.
사용자의 심리 벡터, 질문, 예상 방향, 그리고 실제 답변을 비교해서 본인인지 판정해.

판정 기준:
- 벡터가 나타내는 성격/가치관의 방향과 답변이 일관되는지 본다
- 정확한 문장 매칭이 아니라, "이 성격의 사람이라면 이런 방향으로 답할 것인가"를 본다
- 관대하게 판정해 — 60% 이상 방향이 맞으면 통과시켜
- 답변이 짧아도 방향만 맞으면 통과
- 너무 짧거나 성의 없는 답변(1-2단어)만 판단 불가로 처리

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
    await deleteChallenge(challengeId);

    return NextResponse.json({
      pass: result.pass,
      confidence: result.confidence,
      reason: result.reason,
      userId: challenge.userId,
      attempt: challenge.attempt,
    });
  } catch (e: any) {
    console.error('[fingerprint/verify]', e);
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
