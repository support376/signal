import { NextResponse } from 'next/server';
import { getCompletedScenarios } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    const completed = await getCompletedScenarios(userId);
    return NextResponse.json({ completed });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
