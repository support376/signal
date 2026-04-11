import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    const user = await getUser(userId);
    if (!user) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(user);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
