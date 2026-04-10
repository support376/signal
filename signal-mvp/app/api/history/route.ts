import { NextResponse } from 'next/server';
import { listMyChemistries } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    const chemistries = await listMyChemistries(userId);
    return NextResponse.json({ chemistries });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
