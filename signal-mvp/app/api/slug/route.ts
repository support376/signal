import { NextResponse } from 'next/server';
import { updateSlug } from '@/lib/db';
import { isValidSlug, slugError } from '@/lib/slug';

export async function POST(req: Request) {
  try {
    const { userId, newSlug } = await req.json();
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    if (!newSlug || typeof newSlug !== 'string') {
      return NextResponse.json({ error: 'newSlug required' }, { status: 400 });
    }

    const slug = newSlug.toLowerCase().trim();
    const err = slugError(slug);
    if (err) {
      return NextResponse.json({ error: err }, { status: 400 });
    }
    if (!isValidSlug(slug)) {
      return NextResponse.json({ error: '유효하지 않은 slug' }, { status: 400 });
    }

    const result = await updateSlug(userId, slug);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json({ ok: true, slug });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
