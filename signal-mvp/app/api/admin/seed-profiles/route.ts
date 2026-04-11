import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ensureSchema } from '@/lib/db';

/**
 * POST /api/admin/seed-profiles
 * 기존 유저들에게 임의 개인정보를 넣는 일회성 API.
 */
export async function POST() {
  try {
    await ensureSchema();

    // 기존 유저 목록 조회
    const users = await sql`SELECT id, name FROM users ORDER BY created_at ASC;`;

    const profiles = [
      {
        birth_year: 1994, gender: 'M', nationality: '한국',
        location_current: { label: '서울, 강남구', precision: 'district' },
        instagram: 'junhyeok.park', sns_links: { instagram: { handle: 'junhyeok.park', verified: false }, threads: { handle: 'junhyeok.p', verified: false } },
      },
      {
        birth_year: 1997, gender: 'F', nationality: '한국',
        location_current: { label: '서울, 마포구', precision: 'district' },
        instagram: 'taesung.k', sns_links: { instagram: { handle: 'taesung.k', verified: false }, twitter: { handle: 'taesung_k', verified: false } },
      },
      {
        birth_year: 1999, gender: 'F', nationality: '한국',
        location_current: { label: '부산, 해운대구', precision: 'district' },
        instagram: 'yuna.jung', sns_links: { instagram: { handle: 'yuna.jung', verified: false }, tiktok: { handle: 'yuna.j', verified: false } },
      },
      {
        birth_year: 1996, gender: 'M', nationality: '한국',
        location_current: { label: '서울, 서초구', precision: 'district' },
        instagram: 'sumin.lee', sns_links: { instagram: { handle: 'sumin.lee', verified: false }, youtube: { handle: 'suminlee', verified: false } },
      },
      {
        birth_year: 1993, gender: 'M', nationality: '미국',
        location_current: { label: '서울, 용산구', precision: 'district' },
        instagram: 'daniel.cho', sns_links: { instagram: { handle: 'daniel.cho', verified: false }, twitter: { handle: 'danielcho', verified: false } },
      },
      {
        birth_year: 1998, gender: 'F', nationality: '한국',
        location_current: { label: '인천, 연수구', precision: 'district' },
        instagram: 'minji.kim', sns_links: { instagram: { handle: 'minji.kim', verified: false }, threads: { handle: 'minji.k', verified: false } },
      },
      {
        birth_year: 1995, gender: 'NB', nationality: '한국',
        location_current: { label: '대전, 유성구', precision: 'district' },
        instagram: 'haru.moon', sns_links: { instagram: { handle: 'haru.moon', verified: false } },
      },
      {
        birth_year: 1992, gender: 'M', nationality: '한국',
        location_current: { label: '서울, 성동구', precision: 'district' },
        instagram: 'woojin.han', sns_links: { instagram: { handle: 'woojin.han', verified: false }, youtube: { handle: 'woojin_h', verified: false } },
      },
    ];

    let updated = 0;
    for (let i = 0; i < users.rows.length && i < profiles.length; i++) {
      const u = users.rows[i];
      const p = profiles[i];
      await sql`
        UPDATE users SET
          birth_year = ${p.birth_year},
          gender = ${p.gender},
          nationality = ${p.nationality},
          location_current = ${JSON.stringify(p.location_current)},
          instagram = ${p.instagram},
          sns_links = ${JSON.stringify(p.sns_links)}
        WHERE id = ${u.id};
      `;
      updated++;
    }

    return NextResponse.json({ ok: true, updated, total: users.rows.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
