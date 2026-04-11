import { sql } from '@vercel/postgres';
import type { ScenarioId, ScenarioPayload, IntegratedVector, Turn, Lens } from './types';

// ──────────────────────────────────────────
// Schema bootstrap (idempotent + cached + fast-path)
// 한 번 성공하면 다시 안 돔. fast-path: 1개 SELECT로 schema 존재 확인
// → 있으면 모든 ALTER 스킵. cold start 마다 ~500ms-1s 절약.
// ──────────────────────────────────────────
let schemaPromise: Promise<void> | null = null;

async function schemaFastCheck(): Promise<boolean> {
  try {
    // 가장 최근에 추가된 컬럼을 체크 — 이게 있으면 모든 ALTER 완료된 상태
    const r = await sql`
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'daily_scenarios'
      LIMIT 1;
    `;
    return r.rows.length > 0;
  } catch {
    return false;
  }
}

export async function ensureSchema(): Promise<void> {
  // Production에서 schema 이미 만들어졌으면 완전 스킵
  if (process.env.SKIP_SCHEMA_CHECK === '1') return;

  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    if (await schemaFastCheck()) return;
    await runSchemaBootstrap();
  })().catch((e) => {
    schemaPromise = null;
    throw e;
  });
  return schemaPromise;
}

// 각 statement가 독립적으로 실행 + 실패 시 명확한 에러 로그.
// UNIQUE constraint는 인라인 X (Neon에서 ALTER ADD COLUMN UNIQUE 가 묘하게 실패하는 케이스 회피)
// 대신 partial unique index로 분리.
async function safeRun(label: string, run: () => Promise<unknown>) {
  try {
    await run();
  } catch (e: any) {
    console.error(`[ensureSchema] ${label} failed:`, e?.message || e);
    throw e;
  }
}

async function runSchemaBootstrap() {
  await safeRun('users table', () => sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Phase 1 referral 컬럼들 — UNIQUE 제거, 단순 ADD COLUMN
  await safeRun('users.slug column', () =>
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS slug TEXT;`
  );
  await safeRun('users.referred_by column', () =>
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by TEXT;`
  );
  await safeRun('users.bio column', () =>
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;`
  );

  // Slug uniqueness — partial unique index (NULL 다중 허용)
  await safeRun('users.slug unique index', () => sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_slug_unique
    ON users(slug) WHERE slug IS NOT NULL;
  `);

  await safeRun('referral_events table', () => sql`
    CREATE TABLE IF NOT EXISTS referral_events (
      id SERIAL PRIMARY KEY,
      inviter_id TEXT NOT NULL,
      invitee_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await safeRun('referral_events index', () => sql`
    CREATE INDEX IF NOT EXISTS idx_referral_events_inviter
    ON referral_events(inviter_id);
  `);

  // input_metadata 컬럼 — 타이핑 행동 + AI 탐지
  await safeRun('scenario_runs.input_meta column', () =>
    sql`ALTER TABLE scenario_runs ADD COLUMN IF NOT EXISTS input_meta JSONB;`
  );

  // 크레딧 시스템
  await safeRun('users.free_credits column', () =>
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS free_credits INT DEFAULT 3;`
  );

  // 성별
  await safeRun('users.gender column', () =>
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;`
  );

  // SNS + 링크 유형
  await safeRun('users.instagram column', () =>
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram TEXT;`
  );
  await safeRun('users.sns_links column', () =>
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS sns_links JSONB DEFAULT '{}';`
  );
  await safeRun('users.link_type column', () =>
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS link_type TEXT DEFAULT 'personal';`
  );
  await safeRun('users.link_price column', () =>
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS link_price DECIMAL(10,2) DEFAULT 1.00;`
  );
  await safeRun('users.fingerprint_enabled column', () =>
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS fingerprint_enabled BOOLEAN DEFAULT FALSE;`
  );

  // ── Phase 2: 프로필 + 매칭 + 프라이버시 ──
  await safeRun('users.email column', () =>
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;`
  );
  await safeRun('users.birth_year column', () =>
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_year INT;`
  );
  await safeRun('users.nationality column', () =>
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality TEXT;`
  );
  await safeRun('users.location_current column', () =>
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS location_current JSONB;`
  );
  // search_visibility: 'public' | 'match_only' | 'private'
  await safeRun('users.search_visibility column', () =>
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS search_visibility TEXT DEFAULT 'public';`
  );
  await safeRun('users.gender_preference column', () =>
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender_preference TEXT DEFAULT 'any';`
  );
  // age_range: { min: number, max: number }
  await safeRun('users.age_range column', () =>
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS age_range JSONB;`
  );
  await safeRun('users.trust_score column', () =>
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_score REAL DEFAULT 0;`
  );
  // privacy_settings: { birth_year, gender, nationality, location, sns_handles } → 'public' | 'match_only' | 'private'
  await safeRun('users.privacy_settings column', () =>
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{}';`
  );

  // vector_history — 시점별 벡터 이력 (append-only)
  await safeRun('vector_history table', () => sql`
    CREATE TABLE IF NOT EXISTS vector_history (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vector JSONB NOT NULL,
      scenario_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await safeRun('vector_history index', () => sql`
    CREATE INDEX IF NOT EXISTS idx_vector_history_user
    ON vector_history(user_id, created_at DESC);
  `);

  // 사용자 측정 시작일 (시계열 기준점)
  await safeRun('users.measurement_start column', () =>
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS measurement_start TIMESTAMPTZ;`
  );

  // daily_scenarios — 매일 자동 생성되는 시나리오
  await safeRun('daily_scenarios table', () => sql`
    CREATE TABLE IF NOT EXISTS daily_scenarios (
      id SERIAL PRIMARY KEY,
      date_key TEXT NOT NULL UNIQUE,
      scenario_prompt TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      agent_label TEXT NOT NULL,
      trigger_text TEXT NOT NULL,
      domain_hint TEXT NOT NULL,
      target_axes JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // daily_scenario_runs — 데일리 시나리오 풀이 (append-only, 삭제 불가)
  await safeRun('daily_scenario_runs table', () => sql`
    CREATE TABLE IF NOT EXISTS daily_scenario_runs (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date_key TEXT NOT NULL,
      turn_idx INT NOT NULL,
      agent_msg TEXT NOT NULL,
      user_msg TEXT,
      input_meta JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, date_key, turn_idx)
    );
  `);

  // daily_scenario_payloads — 데일리 분석 결과 (append-only)
  await safeRun('daily_scenario_payloads table', () => sql`
    CREATE TABLE IF NOT EXISTS daily_scenario_payloads (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date_key TEXT NOT NULL,
      payload JSONB NOT NULL,
      authenticity_score REAL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, date_key)
    );
  `);

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
  opts?: { slug?: string; referredBy?: string; gender?: string }
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
    INSERT INTO users (id, name, slug, referred_by, gender)
    VALUES (${id}, ${name}, ${finalSlug}, ${opts?.referredBy ?? null}, ${opts?.gender ?? null})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      slug = COALESCE(users.slug, EXCLUDED.slug),
      referred_by = COALESCE(users.referred_by, EXCLUDED.referred_by),
      gender = COALESCE(users.gender, EXCLUDED.gender);
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
        // 초대자에게 크레딧 +1
        await sql`UPDATE users SET free_credits = COALESCE(free_credits, 3) + 1 WHERE id = ${opts.referredBy};`;
      }
    }
  }
}

/** 최근 가입 사용자 (Home용) */
export async function recentUsers(excludeId: string, limit: number = 5) {
  await ensureSchema();
  const r = await sql`
    SELECT id, name, slug, gender, created_at FROM users
    WHERE id != ${excludeId}
    ORDER BY created_at DESC LIMIT ${limit};
  `;
  return r.rows as { id: string; name: string; slug: string | null; gender: string | null; created_at: string }[];
}

/** SNS 연결된 사용자 + 벡터 (Home에서 케미 계산용) */
export async function snsConnectedUsersWithVectors(excludeId: string, limit: number = 10) {
  await ensureSchema();
  const r = await sql`
    SELECT u.id, u.name, u.slug, u.instagram, u.sns_links, u.gender, iv.vector
    FROM users u
    LEFT JOIN integrated_vectors iv ON iv.user_id = u.id
    WHERE u.id != ${excludeId}
      AND (u.instagram IS NOT NULL OR u.sns_links != '{}')
      AND iv.vector IS NOT NULL
    ORDER BY u.created_at DESC
    LIMIT ${limit};
  `;
  return r.rows as {
    id: string; name: string; slug: string | null;
    instagram: string | null; sns_links: any; gender: string | null;
    vector: IntegratedVector | null;
  }[];
}

export async function getUserBySlug(slug: string) {
  await ensureSchema();
  const r = await sql`
    SELECT id, name, slug, bio, referred_by, created_at, instagram, sns_links, link_type, link_price, gender FROM users WHERE slug = ${slug};
  `;
  return r.rows[0] as
    | { id: string; name: string; slug: string; bio: string | null; referred_by: string | null; created_at: string; instagram: string | null; sns_links: Record<string, { handle: string; verified: boolean }> | null; link_type: string | null; link_price: number | null; gender: string | null }
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
  const r = await sql`SELECT id, name, slug, bio, referred_by, free_credits, gender, instagram, sns_links, link_type, link_price, fingerprint_enabled, email, birth_year, nationality, location_current, search_visibility, gender_preference, age_range, trust_score, privacy_settings, measurement_start FROM users WHERE id = ${id};`;
  return r.rows[0] as
    | { id: string; name: string; slug: string | null; bio: string | null; referred_by: string | null; free_credits: number | null; gender: string | null; instagram: string | null; sns_links: Record<string, { handle: string; verified: boolean }> | null; link_type: string | null; link_price: number | null; fingerprint_enabled: boolean | null; email: string | null; birth_year: number | null; nationality: string | null; location_current: { label: string; precision: string } | null; search_visibility: string | null; gender_preference: string | null; age_range: { min: number; max: number } | null; trust_score: number | null; privacy_settings: Record<string, string> | null; measurement_start: string | null }
    | undefined;
}

export async function setFingerprintEnabled(userId: string, enabled: boolean) {
  await ensureSchema();
  await sql`UPDATE users SET fingerprint_enabled = ${enabled} WHERE id = ${userId};`;
}

// ──────────────────────────────────────────
// Credits
// ──────────────────────────────────────────
export async function getCredits(userId: string): Promise<number> {
  await ensureSchema();
  const r = await sql`SELECT COALESCE(free_credits, 3) AS c FROM users WHERE id = ${userId};`;
  if (r.rows.length === 0) return 0;
  return (r.rows[0] as { c: number }).c;
}

export async function useCredit(userId: string): Promise<{ ok: boolean; remaining: number }> {
  await ensureSchema();
  const current = await getCredits(userId);
  if (current <= 0) return { ok: false, remaining: 0 };
  await sql`UPDATE users SET free_credits = COALESCE(free_credits, 3) - 1 WHERE id = ${userId} AND COALESCE(free_credits, 3) > 0;`;
  return { ok: true, remaining: current - 1 };
}

export async function addCredit(userId: string, amount: number = 1) {
  await ensureSchema();
  await sql`UPDATE users SET free_credits = COALESCE(free_credits, 3) + ${amount} WHERE id = ${userId};`;
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
  userMsg: string | null,
  inputMeta?: object | null
) {
  await ensureSchema();
  await sql`
    INSERT INTO scenario_runs (user_id, scenario_id, turn_idx, agent_msg, user_msg, input_meta)
    VALUES (${userId}, ${scenarioId}, ${turnIdx}, ${agentMsg}, ${userMsg}, ${inputMeta ? JSON.stringify(inputMeta) : null})
    ON CONFLICT (user_id, scenario_id, turn_idx)
    DO UPDATE SET agent_msg = EXCLUDED.agent_msg, user_msg = EXCLUDED.user_msg,
                  input_meta = COALESCE(EXCLUDED.input_meta, scenario_runs.input_meta);
  `;
}

/** 시나리오 다시 하기 — 기존 대화 + payload 삭제 */
export async function resetScenario(userId: string, scenarioId: ScenarioId) {
  await ensureSchema();
  await sql`DELETE FROM scenario_runs WHERE user_id = ${userId} AND scenario_id = ${scenarioId};`;
  await sql`DELETE FROM scenario_payloads WHERE user_id = ${userId} AND scenario_id = ${scenarioId};`;
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
  const vectorJson = JSON.stringify(vector);
  await sql`
    INSERT INTO integrated_vectors (user_id, vector)
    VALUES (${userId}, ${vectorJson})
    ON CONFLICT (user_id) DO UPDATE SET vector = EXCLUDED.vector, created_at = NOW();
  `;
  // vector_history에도 append (시계열 이력)
  const scenarioCount = vector.scenarios_completed?.length ?? 0;
  await sql`
    INSERT INTO vector_history (user_id, vector, scenario_count)
    VALUES (${userId}, ${vectorJson}, ${scenarioCount});
  `;
}

export async function getIntegratedVector(userId: string): Promise<IntegratedVector | null> {
  await ensureSchema();
  const r = await sql`SELECT vector FROM integrated_vectors WHERE user_id = ${userId};`;
  if (r.rows.length === 0) return null;
  return r.rows[0].vector as IntegratedVector;
}

/**
 * 전체 사용자 + integrated_vector + 시나리오 진행도 한 번에.
 * 친구찾기 (수학 기반 즉시 매칭) 페이지용.
 */
export async function listAllUsersWithVectors(excludeId?: string) {
  await ensureSchema();
  const r = excludeId
    ? await sql`
        SELECT u.id, u.name, u.slug, u.instagram, u.sns_links, iv.vector,
               (SELECT COUNT(*)::int FROM scenario_payloads sp WHERE sp.user_id = u.id) AS completed_count
        FROM users u
        LEFT JOIN integrated_vectors iv ON iv.user_id = u.id
        WHERE u.id != ${excludeId}
        ORDER BY u.created_at DESC;
      `
    : await sql`
        SELECT u.id, u.name, u.slug, u.instagram, u.sns_links, iv.vector,
               (SELECT COUNT(*)::int FROM scenario_payloads sp WHERE sp.user_id = u.id) AS completed_count
        FROM users u
        LEFT JOIN integrated_vectors iv ON iv.user_id = u.id
        ORDER BY u.created_at DESC;
      `;
  return r.rows as {
    id: string;
    name: string;
    slug: string | null;
    instagram: string | null;
    sns_links: Record<string, { handle: string; verified: boolean }> | null;
    vector: IntegratedVector | null;
    completed_count: number;
  }[];
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

// ──────────────────────────────────────────
// Daily Scenarios
// ──────────────────────────────────────────

/** 오늘(dateKey)의 시나리오 조회 */
export async function getDailyScenario(dateKey: string) {
  await ensureSchema();
  const r = await sql`SELECT * FROM daily_scenarios WHERE date_key = ${dateKey};`;
  return r.rows[0] as {
    id: number; date_key: string; scenario_prompt: string;
    agent_name: string; agent_label: string; trigger_text: string;
    domain_hint: string; target_axes: string[];
  } | undefined;
}

/** 시나리오 저장 (생성 API에서 호출) */
export async function saveDailyScenario(data: {
  dateKey: string; scenarioPrompt: string;
  agentName: string; agentLabel: string; triggerText: string;
  domainHint: string; targetAxes: string[];
}) {
  await ensureSchema();
  await sql`
    INSERT INTO daily_scenarios (date_key, scenario_prompt, agent_name, agent_label, trigger_text, domain_hint, target_axes)
    VALUES (${data.dateKey}, ${data.scenarioPrompt}, ${data.agentName}, ${data.agentLabel}, ${data.triggerText}, ${data.domainHint}, ${JSON.stringify(data.targetAxes)})
    ON CONFLICT (date_key) DO NOTHING;
  `;
}

/** 사용자의 오늘 데일리 턴 조회 */
export async function getDailyTurns(userId: string, dateKey: string) {
  await ensureSchema();
  const r = await sql`
    SELECT turn_idx, agent_msg, user_msg FROM daily_scenario_runs
    WHERE user_id = ${userId} AND date_key = ${dateKey}
    ORDER BY turn_idx ASC;
  `;
  return r.rows as { turn_idx: number; agent_msg: string; user_msg: string | null }[];
}

/** 데일리 턴 append (update/delete 불가 — append-only) */
export async function appendDailyTurn(
  userId: string, dateKey: string, turnIdx: number,
  agentMsg: string, userMsg: string | null, inputMeta?: object | null
) {
  await ensureSchema();
  await sql`
    INSERT INTO daily_scenario_runs (user_id, date_key, turn_idx, agent_msg, user_msg, input_meta)
    VALUES (${userId}, ${dateKey}, ${turnIdx}, ${agentMsg}, ${userMsg}, ${inputMeta ? JSON.stringify(inputMeta) : null})
    ON CONFLICT (user_id, date_key, turn_idx)
    DO UPDATE SET user_msg = COALESCE(EXCLUDED.user_msg, daily_scenario_runs.user_msg),
                  input_meta = COALESCE(EXCLUDED.input_meta, daily_scenario_runs.input_meta);
  `;
}

/** 데일리 분석 결과 저장 (append-only) */
export async function saveDailyPayload(
  userId: string, dateKey: string, payload: object, authenticityScore: number | null
) {
  await ensureSchema();
  await sql`
    INSERT INTO daily_scenario_payloads (user_id, date_key, payload, authenticity_score)
    VALUES (${userId}, ${dateKey}, ${JSON.stringify(payload)}, ${authenticityScore})
    ON CONFLICT (user_id, date_key) DO NOTHING;
  `;
}

/** 사용자의 측정 시작일 설정 (최초 시나리오 완료 시 1회) */
export async function setMeasurementStart(userId: string) {
  await ensureSchema();
  await sql`
    UPDATE users SET measurement_start = NOW()
    WHERE id = ${userId} AND measurement_start IS NULL;
  `;
}

/** 사용자의 데일리 완료 히스토리 (날짜 목록) */
export async function getDailyHistory(userId: string) {
  await ensureSchema();
  const r = await sql`
    SELECT date_key, authenticity_score, created_at
    FROM daily_scenario_payloads
    WHERE user_id = ${userId}
    ORDER BY date_key DESC;
  `;
  return r.rows as { date_key: string; authenticity_score: number | null; created_at: string }[];
}
