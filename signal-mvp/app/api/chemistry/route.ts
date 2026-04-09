import { NextResponse } from 'next/server';
import { callClaude } from '@/lib/anthropic';
import { CHEMISTRY_NARRATIVE_SYSTEM, buildChemistryUserMessage } from '@/lib/prompts/chemistry-narrative';
import { computeChemistry } from '@/lib/chemistry-math';
import { getIntegratedVector, getChemistry, saveChemistry, getUser } from '@/lib/db';
import { LENSES, type Lens } from '@/lib/types';

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
        });
      }
    }

    const vA = await getIntegratedVector(userAId);
    const vB = await getIntegratedVector(userBId);
    if (!vA || !vB) {
      return NextResponse.json(
        { error: '두 사용자 모두 5개 시나리오 완료해야 함.' },
        { status: 400 }
      );
    }

    const userA = await getUser(userAId);
    const userB = await getUser(userBId);
    const nameA = userA?.name || userAId;
    const nameB = userB?.name || userBId;

    // Layer 2: 수학
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

    await saveChemistry(userAId, userBId, lens as Lens, math.display, narrative, math);

    return NextResponse.json({
      score: math.display,
      narrative,
      raw_data: math,
      cached: false,
    });
  } catch (e: any) {
    console.error('[chemistry] error', e);
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
