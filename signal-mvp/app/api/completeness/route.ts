import { NextResponse } from 'next/server';
import { getIntegratedVector } from '@/lib/db';
import { computeCompleteness } from '@/lib/integrator';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    const vector = await getIntegratedVector(userId);
    const completeness = computeCompleteness(vector);
    return NextResponse.json({ completeness });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
