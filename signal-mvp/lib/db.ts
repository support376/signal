import { sql } from '@vercel/postgres';
import type { ScenarioId, ScenarioPayload, IntegratedVector, Turn, Lens } from './types';

// ──────────────────────────────────────────
// Schema bootstrap (idempotent)
// ──────────────────────────────────────────
export async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
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
export async function upsertUser(id: string, name: string) {
  await ensureSchema();
  await sql`
    INSERT INTO users (id, name) VALUES (${id}, ${name})
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
  `;
}

export async function listUsers(excludeId?: string) {
  await ensureSchema();
  const result = excludeId
    ? await sql`SELECT id, name FROM users WHERE id != ${excludeId} ORDER BY created_at DESC;`
    : await sql`SELECT id, name FROM users ORDER BY created_at DESC;`;
  return result.rows as { id: string; name: string }[];
}

export async function getUser(id: string) {
  const r = await sql`SELECT id, name FROM users WHERE id = ${id};`;
  return r.rows[0] as { id: string; name: string } | undefined;
}

// ──────────────────────────────────────────
// Scenario runs (turn-by-turn conversation)
// ──────────────────────────────────────────
export async function getTurns(userId: string, scenarioId: ScenarioId): Promise<Turn[]> {
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
  await sql`
    UPDATE scenario_runs SET user_msg = ${userMsg}
    WHERE user_id = ${userId} AND scenario_id = ${scenarioId} AND turn_idx = ${turnIdx};
  `;
}

// ──────────────────────────────────────────
// Scenario payloads (extracted vectors)
// ──────────────────────────────────────────
export async function savePayload(userId: string, scenarioId: ScenarioId, payload: ScenarioPayload) {
  await sql`
    INSERT INTO scenario_payloads (user_id, scenario_id, payload)
    VALUES (${userId}, ${scenarioId}, ${JSON.stringify(payload)})
    ON CONFLICT (user_id, scenario_id)
    DO UPDATE SET payload = EXCLUDED.payload, created_at = NOW();
  `;
}

export async function getPayloads(userId: string): Promise<ScenarioPayload[]> {
  const r = await sql`
    SELECT payload FROM scenario_payloads WHERE user_id = ${userId};
  `;
  return r.rows.map((row: any) => row.payload as ScenarioPayload);
}

export async function getCompletedScenarios(userId: string): Promise<ScenarioId[]> {
  const r = await sql`
    SELECT scenario_id FROM scenario_payloads WHERE user_id = ${userId};
  `;
  return r.rows.map((row: any) => row.scenario_id as ScenarioId);
}

// ──────────────────────────────────────────
// Integrated vectors
// ──────────────────────────────────────────
export async function saveIntegratedVector(userId: string, vector: IntegratedVector) {
  await sql`
    INSERT INTO integrated_vectors (user_id, vector)
    VALUES (${userId}, ${JSON.stringify(vector)})
    ON CONFLICT (user_id) DO UPDATE SET vector = EXCLUDED.vector, created_at = NOW();
  `;
}

export async function getIntegratedVector(userId: string): Promise<IntegratedVector | null> {
  const r = await sql`SELECT vector FROM integrated_vectors WHERE user_id = ${userId};`;
  if (r.rows.length === 0) return null;
  return r.rows[0].vector as IntegratedVector;
}

// ──────────────────────────────────────────
// Self-reports
// ──────────────────────────────────────────
export async function saveSelfReport(userId: string, narrative: string) {
  await sql`
    INSERT INTO self_reports (user_id, narrative)
    VALUES (${userId}, ${narrative})
    ON CONFLICT (user_id) DO UPDATE SET narrative = EXCLUDED.narrative, created_at = NOW();
  `;
}

export async function getSelfReport(userId: string): Promise<string | null> {
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
  const [x, y] = pairKey(aId, bId);
  const r = await sql`
    SELECT score, narrative, raw_data FROM chemistry_results
    WHERE user_a_id = ${x} AND user_b_id = ${y} AND lens = ${lens};
  `;
  if (r.rows.length === 0) return null;
  return r.rows[0] as { score: number; narrative: string; raw_data: any };
}
