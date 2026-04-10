import { NextResponse } from 'next/server';
import { callClaude } from '@/lib/anthropic';
import { CHEMISTRY_NARRATIVE_SYSTEM, buildChemistryUserMessage } from '@/lib/prompts/chemistry-narrative';
import { computeChemistry } from '@/lib/chemistry-math';
import { getIntegratedVector, getChemistry, saveChemistry, getUser, getCredits, useCredit } from '@/lib/db';
import { LENSES, type Lens } from '@/lib/types';
import { sanitizeNarrative, logSanitizerReport } from '@/lib/sanitizer';
import { computeCompleteness } from '@/lib/integrator';

export async function POST(req: Request) {
  try {
    const { userAId, userBId, lens, force } = await req.json();
    if (!userAId || !userBId || !lens) {
      return NextResponse.json({ error: 'userAId, userBId, lens required' }, { status: 400 });
    }
    if (!LENSES.includes(lens)) {
      return NextResponse.json({ error: 'invalid lens' }, { status: 400 });
    }
    if (userAId === userBId) {
      return NextResponse.json({ error: 'cannot test chemistry with self' }, { status: 400 });
    }

    // Cache hit
    if (!force) {
      const cached = await getChemistry(userAId, userBId, lens as Lens);
      if (cached) {
        return NextResponse.json({
          score: cached.score,
          narrative: cached.narrative,
          raw_data: cached.raw_data,
          cached: true,
          source: 'cache',
        });
      }
    }

    const vA = await getIntegratedVector(userAId);
    const vB = await getIntegratedVector(userBId);
    if (!vA || !vB) {
      return NextResponse.json(
        { error: '두 사용자 모두 최소 1개 이상의 시나리오를 완료해야 함.' },
        { status: 400 }
      );
    }

    // 크레딧 확인 (LLM 호출 전)
    const credits = await getCredits(userAId);
    if (credits <= 0) {
      return NextResponse.json({
        error: 'credit_exhausted',
        message: '무료 분석 크레딧이 없어. 친구를 초대하면 크레딧을 받을 수 있어.',
        credits: 0,
      }, { status: 402 });
    }

    const userA = await getUser(userAId);
    const userB = await getUser(userBId);
    const nameA = userA?.name || userAId;
    const nameB = userB?.name || userBId;

    const compA = computeCompleteness(vA);
    const compB = computeCompleteness(vB);

    // Layer 2: 수학 (confidence-weighted, 부분 벡터 지원)
    const math = computeChemistry(vA, vB, lens as Lens);

    // Layer 3: narrative
    const narrative = await callClaude({
      system: CHEMISTRY_NARRATIVE_SYSTEM,
      messages: [
        {
          role: 'user',
          content: buildChemistryUserMessage({
            personA: { name: nameA, vector: vA },
            personB: { name: nameB, vector: vB },
            lens: lens as Lens,
            math,
          }),
        },
      ],
      maxTokens: 4000,
      temperature: 0.7,
    });

    // Output sanitizer (관찰 모드 — 위반 발견 시 console.warn)
    const report = sanitizeNarrative(narrative);
    logSanitizerReport(`chemistry ${nameA}×${nameB}/${lens}`, report);

    const enrichedRaw = {
      ...math,
      completeness_a: compA,
      completeness_b: compB,
      sanitizer_violations: report.total_violations,
    };

    // 크레딧 차감 (LLM 호출 성공 후)
    const creditResult = await useCredit(userAId);

    await saveChemistry(userAId, userBId, lens as Lens, math.display, narrative, enrichedRaw);

    return NextResponse.json({
      score: math.display,
      narrative,
      raw_data: enrichedRaw,
      cached: false,
      source: 'llm',
      reliability: math.reliability_label,
      completeness_a: compA,
      completeness_b: compB,
      credits_remaining: creditResult.remaining,
    });
  } catch (e: any) {
    console.error('[chemistry] error', e);
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
