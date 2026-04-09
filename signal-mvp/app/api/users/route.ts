import { NextResponse } from 'next/server';
import { listUsersWithProgress } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { excludeId } = await req.json();
    const users = await listUsersWithProgress(excludeId);
    return NextResponse.json({ users });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
