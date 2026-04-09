import { NextResponse } from 'next/server';
import { callClaude, parseJsonResponse } from '@/lib/anthropic';
import { buildAnalysisSystemPrompt, buildAnalysisUserMessage } from '@/lib/prompts/analysis';
import { getTurns, savePayload, getPayloads, saveIntegratedVector, getUser } from '@/lib/db';
import { integrate } from '@/lib/integrator';
import type { ScenarioId, ScenarioPayload } from '@/lib/types';
import { SCENARIOS } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const { userId, scenarioId } = await req.json();
    if (!userId || !scenarioId || !SCENARIOS.includes(scenarioId)) {
      return NextResponse.json({ error: 'invalid input' }, { status: 400 });
    }

    const sid = scenarioId as ScenarioId;
    const turns = await getTurns(userId, sid);
    if (turns.length < 5) {
      return NextResponse.json({ error: 'scenario not complete (need 5 turns)' }, { status: 400 });
    }

    // 1. 분석 LLM 호출
    const system = buildAnalysisSystemPrompt(sid);
    const user = await getUser(userId);
    const userMsg = buildAnalysisUserMessage({
      personaId: user?.name || userId,
      scenarioId: sid,
      turns: turns.map((t) => ({ agent_msg: t.agent_msg, user_msg: t.user_msg })),
    });

    const raw = await callClaude({
      system,
      messages: [{ role: 'user', content: userMsg }],
      maxTokens: 2048,
      temperature: 0.3,
    });

    const payload = parseJsonResponse<ScenarioPayload>(raw);
    payload.scenario_id = sid; // 안전망

    // 2. 저장
    await savePayload(userId, sid, payload);

    // 3. 매 시나리오마다 자동 통합 (1개부터 5개까지 모두)
    // 부분 통합 벡터로도 self-report / chemistry 가능
    const allPayloads = await getPayloads(userId);
    const integrated = integrate(allPayloads, user?.name || userId);
    await saveIntegratedVector(userId, integrated);

    return NextResponse.json({
      ok: true,
      payload,
      completed_count: allPayloads.length,
      integrated: true,
      completeness: integrated.summary,
    });
  } catch (e: any) {
    console.error('[scenario/finalize] error', e);
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
