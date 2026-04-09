import { NextResponse } from 'next/server';
import { upsertUser } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { id, name } = await req.json();
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }
    const cleanId = id.trim().toLowerCase();
    const cleanName = (name || id).toString().trim();
    await upsertUser(cleanId, cleanName);
    return NextResponse.json({ ok: true, id: cleanId, name: cleanName });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
