import { NextResponse } from 'next/server';
import { callClaude, type ChatMessage } from '@/lib/anthropic';
import { SCENARIO_PROMPTS, TURN_LIMIT } from '@/lib/prompts/scenarios';
import { getTurns, appendTurn } from '@/lib/db';
import type { ScenarioId } from '@/lib/types';
import { SCENARIOS } from '@/lib/types';
import { checkAuthenticity, type InputMetadata } from '@/lib/input-meta';

export async function POST(req: Request) {
  try {
    const { userId, scenarioId, userMessage, inputMeta } = await req.json();

    if (!userId || !scenarioId) {
      return NextResponse.json({ error: 'userId, scenarioId required' }, { status: 400 });
    }
    if (!SCENARIOS.includes(scenarioId)) {
      return NextResponse.json({ error: 'invalid scenarioId' }, { status: 400 });
    }

    const sid = scenarioId as ScenarioId;
    const system = SCENARIO_PROMPTS[sid];
    const existing = await getTurns(userId, sid);

    // ───────────────────────────────────────
    // CASE 1: 첫 호출 (agent T1 생성)
    // ───────────────────────────────────────
    if (existing.length === 0 && !userMessage) {
      const messages: ChatMessage[] = [{ role: 'user', content: '시작하라.' }];
      const agentMsg = await callClaude({ system, messages, maxTokens: 1024 });
      await appendTurn(userId, sid, 1, agentMsg, null);
      return NextResponse.json({
        turn_idx: 1,
        agent_msg: agentMsg,
        finished: false,
      });
    }

    // ───────────────────────────────────────
    // CASE 2: 사용자 응답
    // ───────────────────────────────────────
    if (!userMessage) {
      return NextResponse.json({ error: 'userMessage required' }, { status: 400 });
    }

    const lastTurn = existing[existing.length - 1];
    if (lastTurn.user_msg !== null) {
      return NextResponse.json({ error: 'last turn already has user_msg' }, { status: 400 });
    }

    // ── 진정성 체크 (inputMeta가 있으면) ──
    let authenticity = null;
    let enrichedMeta = null;
    if (inputMeta) {
      authenticity = checkAuthenticity(inputMeta as InputMetadata);
      enrichedMeta = { ...inputMeta, authenticity };

      // suspect verdict → 경고는 하되 차단은 안 함 (데이터 수집 단계)
      // 나중에 verdict === 'suspect' 일 때 차단 가능
      if (authenticity.verdict === 'suspect') {
        console.warn(
          `[authenticity] SUSPECT: user=${userId} scenario=${sid} turn=${lastTurn.turn_idx}`,
          `score=${authenticity.score}`,
          authenticity.flags.map((f) => f.type).join(', ')
        );
      }
    }

    // 마지막 turn 갱신 (user_msg + input_meta)
    await appendTurn(userId, sid, lastTurn.turn_idx, lastTurn.agent_msg, userMessage, enrichedMeta);

    // 5턴 마쳤으면 종료
    if (lastTurn.turn_idx >= TURN_LIMIT) {
      return NextResponse.json({
        turn_idx: lastTurn.turn_idx,
        agent_msg: null,
        finished: true,
        authenticity: authenticity ? { score: authenticity.score, verdict: authenticity.verdict } : null,
      });
    }

    // 다음 agent turn 생성
    const history: ChatMessage[] = [{ role: 'user', content: '시작하라.' }];
    for (const t of existing) {
      history.push({ role: 'assistant', content: t.agent_msg });
      const u = t.turn_idx === lastTurn.turn_idx ? userMessage : t.user_msg;
      if (u) history.push({ role: 'user', content: u });
    }

    const nextAgentMsg = await callClaude({ system, messages: history, maxTokens: 1024 });
    const nextTurnIdx = lastTurn.turn_idx + 1;
    await appendTurn(userId, sid, nextTurnIdx, nextAgentMsg, null);

    return NextResponse.json({
      turn_idx: nextTurnIdx,
      agent_msg: nextAgentMsg,
      finished: false,
      authenticity: authenticity ? { score: authenticity.score, verdict: authenticity.verdict } : null,
    });
  } catch (e: any) {
    console.error('[scenario/turn] error', e);
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
