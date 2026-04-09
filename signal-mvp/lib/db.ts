import { sql } from '@vercel/postgres';
import type { ScenarioId, ScenarioPayload, IntegratedVector, Turn, Lens } from './types';

// ──────────────────────────────────────────
// Schema bootstrap (idempotent + cached)
// 한 번 성공하면 다시 안 돔. 모든 read/write 함수에서 호출.
// ──────────────────────────────────────────
let schemaPromise: Promise<void> | null = null;

export async function ensureSchema(): Promise<void> {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    await runSchemaBootstrap();
  })().catch((e) => {
    schemaPromise = null; // 실패 시 다음 호출에서 재시도
    throw e;
  });
  return schemaPromise;
}

async function runSchemaBootstrap() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  // Phase 1 referral additions (idempotent)
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by TEXT;`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;`;
  await sql`
    CREATE TABLE IF NOT EXISTS referral_events (
      id SERIAL PRIMARY KEY,
      inviter_id TEXT NOT NULL,
      invitee_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_referral_events_inviter
    ON referral_events(inviter_id);
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS scenario_runs (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scenario_id TEXT NOT NULL,
      turn_idx INT NOT NULL,
      agent_msg TEXT NOT NULL,
      user_msg TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, scenario_id, turn_idx)
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS scenario_payloads (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scenario_id TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, scenario_id)
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS integrated_vectors (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      vector JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS self_reports (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      narrative TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS chemistry_results (
      user_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lens TEXT NOT NULL,
      score INT NOT NULL,
      narrative TEXT NOT NULL,
      raw_data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_a_id, user_b_id, lens)
    );
  `;
}

// ──────────────────────────────────────────
// Users
// ──────────────────────────────────────────
export async function upsertUser(
  id: string,
  name: string,
  opts?: { slug?: string; referredBy?: string }
) {
  await ensureSchema();
  // Slug 생성 — 안 주면 user.id 그대로 (소문자 normalize)
  const initialSlug = (opts?.slug || id).toLowerCase().replace(/[^a-z0-9_-]+/g, '_').slice(0, 20);
  // 충돌 처리: 첫 시도에 실패하면 _2, _3 ...
  let finalSlug = initialSlug;
  let attempt = 1;
  while (true) {
    const existing = await sql`SELECT id FROM users WHERE slug = ${finalSlug} AND id != ${id};`;
    if (existing.rows.length === 0) break;
    attempt++;
    finalSlug = `${initialSlug}_${attempt}`.slice(0, 20);
    if (attempt > 50) break; // 안전망
  }

  await sql`
    INSERT INTO users (id, name, slug, referred_by)
    VALUES (${id}, ${name}, ${finalSlug}, ${opts?.referredBy ?? null})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      slug = COALESCE(users.slug, EXCLUDED.slug),
      referred_by = COALESCE(users.referred_by, EXCLUDED.referred_by);
  `;

  // 신규 가입 + referrer 있으면 referral_event 기록
  if (opts?.referredBy) {
    const wasNew = await sql`
      SELECT 1 FROM users WHERE id = ${id} AND referred_by = ${opts.referredBy};
    `;
    if (wasNew.rows.length > 0) {
      // 중복 기록 방지: 같은 (inviter, invitee, signup) 이미 있으면 skip
      const dupe = await sql`
        SELECT 1 FROM referral_events
        WHERE inviter_id = ${opts.referredBy}
          AND invitee_id = ${id}
          AND event_type = 'signup';
      `;
      if (dupe.rows.length === 0) {
        await sql`
          INSERT INTO referral_events (inviter_id, invitee_id, event_type, metadata)
          VALUES (${opts.referredBy}, ${id}, 'signup', ${JSON.stringify({ via: 'cookie' })});
        `;
      }
    }
  }
}

export async function getUserBySlug(slug: string) {
  await ensureSchema();
  const r = await sql`
    SELECT id, name, slug, bio, referred_by, created_at FROM users WHERE slug = ${slug};
  `;
  return r.rows[0] as
    | { id: string; name: string; slug: string; bio: string | null; referred_by: string | null; created_at: string }
    | undefined;
}

export async function updateSlug(userId: string, newSlug: string): Promise<{ ok: boolean; error?: string }> {
  await ensureSchema();
  // Uniqueness check
  const existing = await sql`SELECT id FROM users WHERE slug = ${newSlug} AND id != ${userId};`;
  if (existing.rows.length > 0) {
    return { ok: false, error: '이미 사용 중인 링크' };
  }
  await sql`UPDATE users SET slug = ${newSlug} WHERE id = ${userId};`;
  return { ok: true };
}

export async function listMyReferrals(inviterId: string) {
  await ensureSchema();
  const r = await sql`
    SELECT
      u.id, u.name, u.slug, u.created_at,
      (SELECT COUNT(*)::int FROM scenario_payloads sp WHERE sp.user_id = u.id) AS completed_count
    FROM users u
    WHERE u.referred_by = ${inviterId}
    ORDER BY u.created_at DESC;
  `;
  return r.rows as { id: string; name: string; slug: string; created_at: string; completed_count: number }[];
}

export async function countMyReferrals(inviterId: string) {
  await ensureSchema();
  const r = await sql`SELECT COUNT(*)::int AS c FROM users WHERE referred_by = ${inviterId};`;
  return (r.rows[0] as { c: number }).c;
}

export async function listUsers(excludeId?: string) {
  await ensureSchema();
  const result = excludeId
    ? await sql`SELECT id, name FROM users WHERE id != ${excludeId} ORDER BY created_at DESC;`
    : await sql`SELECT id, name FROM users ORDER BY created_at DESC;`;
  return result.rows as { id: string; name: string }[];
}

/**
 * 사용자 + 각자의 시나리오 완료 수를 한 번에 가져옴.
 * 케미 페이지에서 "5/5 완료한 사람만 비교 가능" 표시용.
 */
export async function listUsersWithProgress(excludeId?: string) {
  await ensureSchema();
  const result = excludeId
    ? await sql`
        SELECT u.id, u.name, COUNT(sp.scenario_id)::int AS completed_count
        FROM users u
        LEFT JOIN scenario_payloads sp ON sp.user_id = u.id
        WHERE u.id != ${excludeId}
        GROUP BY u.id, u.name, u.created_at
        ORDER BY u.created_at DESC;
      `
    : await sql`
        SELECT u.id, u.name, COUNT(sp.scenario_id)::int AS completed_count
        FROM users u
        LEFT JOIN scenario_payloads sp ON sp.user_id = u.id
        GROUP BY u.id, u.name, u.created_at
        ORDER BY u.created_at DESC;
      `;
  return result.rows as { id: string; name: string; completed_count: number }[];
}

export async function getUser(id: string) {
  await ensureSchema();
  const r = await sql`SELECT id, name, slug, bio, referred_by FROM users WHERE id = ${id};`;
  return r.rows[0] as
    | { id: string; name: string; slug: string | null; bio: string | null; referred_by: string | null }
    | undefined;
}

// ──────────────────────────────────────────
// Scenario runs (turn-by-turn conversation)
// ──────────────────────────────────────────
export async function getTurns(userId: string, scenarioId: ScenarioId): Promise<Turn[]> {
  await ensureSchema();
  const r = await sql`
    SELECT turn_idx, agent_msg, user_msg FROM scenario_runs
    WHERE user_id = ${userId} AND scenario_id = ${scenarioId}
    ORDER BY turn_idx ASC;
  `;
  return r.rows as Turn[];
}

export async function appendTurn(
  userId: string,
  scenarioId: ScenarioId,
  turnIdx: number,
  agentMsg: string,
  userMsg: string | null
) {
  await ensureSchema();
  await sql`
    INSERT INTO scenario_runs (user_id, scenario_id, turn_idx, agent_msg, user_msg)
    VALUES (${userId}, ${scenarioId}, ${turnIdx}, ${agentMsg}, ${userMsg})
    ON CONFLICT (user_id, scenario_id, turn_idx)
    DO UPDATE SET agent_msg = EXCLUDED.agent_msg, user_msg = EXCLUDED.user_msg;
  `;
}

export async function setUserResponse(
  userId: string,
  scenarioId: ScenarioId,
  turnIdx: number,
  userMsg: string
) {
  await ensureSchema();
  await sql`
    UPDATE scenario_runs SET user_msg = ${userMsg}
    WHERE user_id = ${userId} AND scenario_id = ${scenarioId} AND turn_idx = ${turnIdx};
  `;
}

// ──────────────────────────────────────────
// Scenario payloads (extracted vectors)
// ──────────────────────────────────────────
export async function savePayload(userId: string, scenarioId: ScenarioId, payload: ScenarioPayload) {
  await ensureSchema();
  await sql`
    INSERT INTO scenario_payloads (user_id, scenario_id, payload)
    VALUES (${userId}, ${scenarioId}, ${JSON.stringify(payload)})
    ON CONFLICT (user_id, scenario_id)
    DO UPDATE SET payload = EXCLUDED.payload, created_at = NOW();
  `;
}

export async function getPayloads(userId: string): Promise<ScenarioPayload[]> {
  await ensureSchema();
  const r = await sql`
    SELECT payload FROM scenario_payloads WHERE user_id = ${userId};
  `;
  return r.rows.map((row: any) => row.payload as ScenarioPayload);
}

export async function getPayload(
  userId: string,
  scenarioId: ScenarioId
): Promise<ScenarioPayload | null> {
  await ensureSchema();
  const r = await sql`
    SELECT payload FROM scenario_payloads
    WHERE user_id = ${userId} AND scenario_id = ${scenarioId};
  `;
  if (r.rows.length === 0) return null;
  return r.rows[0].payload as ScenarioPayload;
}

export async function getCompletedScenarios(userId: string): Promise<ScenarioId[]> {
  await ensureSchema();
  const r = await sql`
    SELECT scenario_id FROM scenario_payloads WHERE user_id = ${userId};
  `;
  return r.rows.map((row: any) => row.scenario_id as ScenarioId);
}

// ──────────────────────────────────────────
// Integrated vectors
// ──────────────────────────────────────────
export async function saveIntegratedVector(userId: string, vector: IntegratedVector) {
  await ensureSchema();
  await sql`
    INSERT INTO integrated_vectors (user_id, vector)
    VALUES (${userId}, ${JSON.stringify(vector)})
    ON CONFLICT (user_id) DO UPDATE SET vector = EXCLUDED.vector, created_at = NOW();
  `;
}

export async function getIntegratedVector(userId: string): Promise<IntegratedVector | null> {
  await ensureSchema();
  const r = await sql`SELECT vector FROM integrated_vectors WHERE user_id = ${userId};`;
  if (r.rows.length === 0) return null;
  return r.rows[0].vector as IntegratedVector;
}

// ──────────────────────────────────────────
// Self-reports
// ──────────────────────────────────────────
export async function saveSelfReport(userId: string, narrative: string) {
  await ensureSchema();
  await sql`
    INSERT INTO self_reports (user_id, narrative)
    VALUES (${userId}, ${narrative})
    ON CONFLICT (user_id) DO UPDATE SET narrative = EXCLUDED.narrative, created_at = NOW();
  `;
}

export async function getSelfReport(userId: string): Promise<string | null> {
  await ensureSchema();
  const r = await sql`SELECT narrative FROM self_reports WHERE user_id = ${userId};`;
  if (r.rows.length === 0) return null;
  return r.rows[0].narrative as string;
}

// ──────────────────────────────────────────
// Chemistry results (sorted pair to dedupe direction)
// ──────────────────────────────────────────
function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function saveChemistry(
  aId: string,
  bId: string,
  lens: Lens,
  score: number,
  narrative: string,
  rawData: object
) {
  await ensureSchema();
  const [x, y] = pairKey(aId, bId);
  await sql`
    INSERT INTO chemistry_results (user_a_id, user_b_id, lens, score, narrative, raw_data)
    VALUES (${x}, ${y}, ${lens}, ${score}, ${narrative}, ${JSON.stringify(rawData)})
    ON CONFLICT (user_a_id, user_b_id, lens)
    DO UPDATE SET score = EXCLUDED.score, narrative = EXCLUDED.narrative,
                  raw_data = EXCLUDED.raw_data, created_at = NOW();
  `;
}

export async function getChemistry(aId: string, bId: string, lens: Lens) {
  await ensureSchema();
  const [x, y] = pairKey(aId, bId);
  const r = await sql`
    SELECT score, narrative, raw_data FROM chemistry_results
    WHERE user_a_id = ${x} AND user_b_id = ${y} AND lens = ${lens};
  `;
  if (r.rows.length === 0) return null;
  return r.rows[0] as { score: number; narrative: string; raw_data: any };
}

/**
 * 사용자가 참여한 모든 케미 결과 + 상대방 이름.
 * 과거 내역 페이지용.
 */
export async function listMyChemistries(userId: string) {
  await ensureSchema();
  const r = await sql`
    SELECT
      cr.user_a_id, cr.user_b_id, cr.lens, cr.score, cr.created_at,
      ua.name AS user_a_name,
      ub.name AS user_b_name
    FROM chemistry_results cr
    JOIN users ua ON ua.id = cr.user_a_id
    JOIN users ub ON ub.id = cr.user_b_id
    WHERE cr.user_a_id = ${userId} OR cr.user_b_id = ${userId}
    ORDER BY cr.created_at DESC;
  `;
  return r.rows as {
    user_a_id: string;
    user_b_id: string;
    user_a_name: string;
    user_b_name: string;
    lens: string;
    score: number;
    created_at: string;
  }[];
}
