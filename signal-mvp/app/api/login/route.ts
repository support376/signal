import { NextResponse } from 'next/server';
import { upsertUser, getUser, getUserBySlug } from '@/lib/db';
import { normalizeToSlug } from '@/lib/slug';

export async function POST(req: Request) {
  try {
    const { id, name, gender, referrerSlug } = await req.json();
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }
    const cleanId = normalizeToSlug(id.trim()) || id.trim().toLowerCase();
    const cleanName = (name || id).toString().trim();

    // Referrer 처리: slug → user.id 변환
    let referredBy: string | undefined;
    if (referrerSlug && typeof referrerSlug === 'string') {
      const referrer = await getUserBySlug(referrerSlug.toLowerCase());
      if (referrer && referrer.id !== cleanId) {
        referredBy = referrer.id;
      }
    }

    // 기존 사용자인지 확인 — 기존이면 referredBy 적용 X (이미 가입 완료)
    const existing = await getUser(cleanId);
    if (existing) {
      // 단순 로그인: 이름 갱신만
      await upsertUser(cleanId, cleanName);
      return NextResponse.json({ ok: true, id: cleanId, name: cleanName, isNew: false });
    }

    // 신규 가입
    await upsertUser(cleanId, cleanName, { referredBy, gender: gender || undefined });
    return NextResponse.json({
      ok: true,
      id: cleanId,
      name: cleanName,
      isNew: true,
      referredBy: referredBy || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
