import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ensureSchema } from '@/lib/db';

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const body = await req.json();
    const { userId } = body;
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    // 기존 필드
    if (body.bio !== undefined) {
      await sql`UPDATE users SET bio = ${body.bio} WHERE id = ${userId};`;
    }
    if (body.instagram !== undefined) {
      const clean = (body.instagram || '').replace(/^@/, '').trim().toLowerCase();
      await sql`UPDATE users SET instagram = ${clean || null} WHERE id = ${userId};`;
    }
    if (body.sns_links !== undefined) {
      await sql`UPDATE users SET sns_links = ${JSON.stringify(body.sns_links)} WHERE id = ${userId};`;
    }
    if (body.link_type !== undefined) {
      await sql`UPDATE users SET link_type = ${body.link_type} WHERE id = ${userId};`;
    }
    if (body.link_price !== undefined) {
      await sql`UPDATE users SET link_price = ${Math.max(1, Number(body.link_price) || 1)} WHERE id = ${userId};`;
    }
    if (body.fingerprint_enabled !== undefined) {
      await sql`UPDATE users SET fingerprint_enabled = ${!!body.fingerprint_enabled} WHERE id = ${userId};`;
    }

    // ── 신규 프로필 필드 ──
    if (body.email !== undefined) {
      await sql`UPDATE users SET email = ${body.email || null} WHERE id = ${userId};`;
    }
    if (body.birth_year !== undefined) {
      const year = body.birth_year ? parseInt(body.birth_year) : null;
      await sql`UPDATE users SET birth_year = ${year} WHERE id = ${userId};`;
    }
    if (body.gender !== undefined) {
      await sql`UPDATE users SET gender = ${body.gender || null} WHERE id = ${userId};`;
    }
    if (body.nationality !== undefined) {
      await sql`UPDATE users SET nationality = ${body.nationality || null} WHERE id = ${userId};`;
    }
    if (body.location_current !== undefined) {
      await sql`UPDATE users SET location_current = ${body.location_current ? JSON.stringify(body.location_current) : null} WHERE id = ${userId};`;
    }

    // ── 매칭 설정 ──
    if (body.search_visibility !== undefined) {
      const valid = ['public', 'match_only', 'private'];
      const val = valid.includes(body.search_visibility) ? body.search_visibility : 'public';
      await sql`UPDATE users SET search_visibility = ${val} WHERE id = ${userId};`;
    }
    if (body.gender_preference !== undefined) {
      await sql`UPDATE users SET gender_preference = ${body.gender_preference || 'any'} WHERE id = ${userId};`;
    }
    if (body.age_range !== undefined) {
      await sql`UPDATE users SET age_range = ${body.age_range ? JSON.stringify(body.age_range) : null} WHERE id = ${userId};`;
    }

    // ── 프라이버시 설정 ──
    if (body.privacy_settings !== undefined) {
      await sql`UPDATE users SET privacy_settings = ${JSON.stringify(body.privacy_settings)} WHERE id = ${userId};`;
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
