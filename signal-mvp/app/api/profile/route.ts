import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ensureSchema } from '@/lib/db';

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const { userId, bio, instagram, sns_links, link_type, link_price, fingerprint_enabled } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    if (bio !== undefined) {
      await sql`UPDATE users SET bio = ${bio} WHERE id = ${userId};`;
    }
    if (instagram !== undefined) {
      const clean = (instagram || '').replace(/^@/, '').trim().toLowerCase();
      await sql`UPDATE users SET instagram = ${clean || null} WHERE id = ${userId};`;
    }
    if (sns_links !== undefined) {
      // sns_links: { instagram: { handle, verified }, threads: { handle, verified }, ... }
      await sql`UPDATE users SET sns_links = ${JSON.stringify(sns_links)} WHERE id = ${userId};`;
    }
    if (link_type !== undefined) {
      await sql`UPDATE users SET link_type = ${link_type} WHERE id = ${userId};`;
    }
    if (link_price !== undefined) {
      await sql`UPDATE users SET link_price = ${Math.max(1, Number(link_price) || 1)} WHERE id = ${userId};`;
    }
    if (fingerprint_enabled !== undefined) {
      await sql`UPDATE users SET fingerprint_enabled = ${!!fingerprint_enabled} WHERE id = ${userId};`;
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
