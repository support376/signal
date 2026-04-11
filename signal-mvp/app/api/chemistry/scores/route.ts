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
    // SNS 핸들 목록 수집 (검색용)
    function collectHandles(u: typeof all[0]): string[] {
      const handles: string[] = [];
      if (u.instagram) handles.push(u.instagram);
      if (u.sns_links) {
        for (const v of Object.values(u.sns_links)) {
          if (v?.handle) handles.push(v.handle);
        }
      }
      return handles;
    }

    const scored = all.map((u) => {
      const sns_handles = collectHandles(u);
      const trustPct = u.vector?.summary?.average_confidence
        ? Math.round(u.vector.summary.average_confidence * 100)
        : 0;

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
          trust_pct: 0,
          instagram: u.instagram,
          birth_year: u.birth_year,
          gender: u.gender,
          sns_handles,
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
        trust_pct: trustPct,
        instagram: u.instagram,
        birth_year: u.birth_year,
        gender: u.gender,
        sns_handles,
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
