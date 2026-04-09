import { NextResponse } from 'next/server';
import { callClaude, type ChatMessage } from '@/lib/anthropic';
import { SCENARIO_PROMPTS, TURN_LIMIT } from '@/lib/prompts/scenarios';
import { getTurns, appendTurn } from '@/lib/db';
import type { ScenarioId } from '@/lib/types';
import { SCENARIOS } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const { userId, scenarioId, userMessage } = await req.json();

    if (!userId || !scenarioId) {
      return NextResponse.json({ error: 'userId, scenarioId required' }, { status: 400 });
    }
    if (!SCENARIOS.includes(scenarioId)) {
      return NextResponse.json({ error: 'invalid scenarioId' }, { status: 400 });
    }

    const sid = scenarioId as ScenarioId;
    const system = SCENARIO_PROMPTS[sid];

    // 현재까지의 turn 기록
    const existing = await getTurns(userId, sid);

    // ───────────────────────────────────────
    // CASE 1: 첫 호출 (userMessage 없음, existing 0)
    // → agent의 첫 메시지(T1) 생성하고 저장
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
    // CASE 2: 사용자가 응답 보냄
    // → 마지막 turn에 user_msg 채우고, 다음 agent turn 생성 (또는 종료)
    // ───────────────────────────────────────
    if (!userMessage) {
      return NextResponse.json({ error: 'userMessage required' }, { status: 400 });
    }

    const lastTurn = existing[existing.length - 1];
    if (lastTurn.user_msg !== null) {
      return NextResponse.json({ error: 'last turn already has user_msg' }, { status: 400 });
    }

    // 마지막 turn 갱신
    await appendTurn(userId, sid, lastTurn.turn_idx, lastTurn.agent_msg, userMessage);

    // 5턴 마쳤으면 종료
    if (lastTurn.turn_idx >= TURN_LIMIT) {
      return NextResponse.json({
        turn_idx: lastTurn.turn_idx,
        agent_msg: null,
        finished: true,
      });
    }

    // 다음 agent turn 생성 (대화 히스토리 구성)
    const history: ChatMessage[] = [{ role: 'user', content: '시작하라.' }];
    for (const t of existing) {
      // assistant: agent 발화
      history.push({ role: 'assistant', content: t.agent_msg });
      // user: 사용자 응답 (마지막 turn은 방금 갱신한 userMessage)
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
    });
  } catch (e: any) {
    console.error('[scenario/turn] error', e);
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
