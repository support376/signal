import { NextResponse } from 'next/server';
import { getIntegratedVector, snsConnectedUsersWithVectors } from '@/lib/db';
import { computeChemistry } from '@/lib/chemistry-math';
import type { IntegratedVector } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const myVector = await getIntegratedVector(userId);
    if (!myVector) return NextResponse.json({ matches: [] });

    const users = await snsConnectedUsersWithVectors(userId, 10);
    const matches = users
      .filter((u) => u.vector)
      .map((u) => ({
        id: u.id,
        slug: u.slug || u.id,
        score: computeChemistry(myVector, u.vector as IntegratedVector, 'romantic').display,
        instagram: u.instagram,
        snsLinks: u.sns_links || {},
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    return NextResponse.json({ matches });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
