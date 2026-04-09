import { NextResponse } from 'next/server';
import { getIntegratedVector, listAllUsersWithVectors } from '@/lib/db';
import { computeChemistry } from '@/lib/chemistry-math';
import { LENSES, type Lens } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const { userId, lens } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    if (!lens || !LENSES.includes(lens)) {
      return NextResponse.json({ error: 'invalid lens' }, { status: 400 });
    }

    const myVector = await getIntegratedVector(userId);
    if (!myVector) {
      return NextResponse.json(
        { error: '먼저 시나리오 1개 이상 풀어야 함', users: [] },
        { status: 400 }
      );
    }

    // 한 번의 쿼리로 모든 사용자 + 벡터 가져옴
    const all = await listAllUsersWithVectors(userId);

    // 각 사용자에 대해 수학만 계산 (LLM 0)
    const scored = all.map((u) => {
      if (!u.vector) {
        return {
          id: u.id,
          name: u.name,
          slug: u.slug || u.id,
          completed_count: u.completed_count,
          score: null,
          reliability: null,
          effective_axes: 0,
          major_conflicts_count: 0,
        };
      }
      const math = computeChemistry(myVector, u.vector, lens as Lens);
      return {
        id: u.id,
        name: u.name,
        slug: u.slug || u.id,
        completed_count: u.completed_count,
        score: math.display,
        reliability: math.reliability_label,
        effective_axes: math.effective_axes,
        major_conflicts_count: math.major_conflicts.length,
      };
    });

    // 점수 있는 거 우선, 점수 내림차순. 점수 없으면 뒤로.
    scored.sort((a, b) => {
      if (a.score === null && b.score === null) return 0;
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return b.score - a.score;
    });

    return NextResponse.json({
      users: scored,
      lens,
      my_completed: myVector.scenarios_completed.length,
    });
  } catch (e: any) {
    console.error('[chemistry/scores] error', e);
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
