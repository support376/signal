// 인격지문 챌린지를 DB에 저장 (서버리스 환경 대응)
import { sql } from '@vercel/postgres';
import { ensureSchema } from './db';

export interface FingerprintChallenge {
  userId: string;
  question: string;
  keyAxes: string[];
  expectedDirection: string;
  vectorSummary: string;
  attempt: number;
}

// DB 테이블 생성 (ensureSchema에서 호출)
export async function ensureFingerprintTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS fingerprint_challenges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  // 오래된 챌린지 자동 정리 (10분 이상)
  await sql`
    DELETE FROM fingerprint_challenges
    WHERE created_at < NOW() - INTERVAL '10 minutes';
  `;
}

export async function setChallenge(id: string, challenge: FingerprintChallenge) {
  try { await ensureFingerprintTable(); } catch {}
  await sql`
    INSERT INTO fingerprint_challenges (id, user_id, data)
    VALUES (${id}, ${challenge.userId}, ${JSON.stringify(challenge)})
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, created_at = NOW();
  `;
}

export async function getChallenge(id: string): Promise<FingerprintChallenge | null> {
  try { await ensureFingerprintTable(); } catch {}
  const r = await sql`
    SELECT data FROM fingerprint_challenges
    WHERE id = ${id} AND created_at > NOW() - INTERVAL '10 minutes';
  `;
  if (r.rows.length === 0) return null;
  return r.rows[0].data as FingerprintChallenge;
}

export async function deleteChallenge(id: string) {
  try {
    await sql`DELETE FROM fingerprint_challenges WHERE id = ${id};`;
  } catch {}
}
