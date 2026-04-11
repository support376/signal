import { NextResponse } from 'next/server';
import { callClaude, type ChatMessage } from '@/lib/anthropic';
import { getDailyScenario, getDailyTurns, appendDailyTurn, saveDailyPayload, setMeasurementStart } from '@/lib/db';
import { checkAuthenticity, type InputMetadata } from '@/lib/input-meta';

const TURN_LIMIT = 5;

/**
 * POST /api/daily-scenario/turn
 * 데일리 시나리오 턴 처리. 기존 시나리오 턴 API와 동일한 패턴이지만
 * daily_scenario_runs 테이블 사용 (append-only).
 */
export async function POST(req: Request) {
  try {
    const { userId, userMessage, inputMeta } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const dateKey = new Date().toISOString().slice(0, 10);
    const scenario = await getDailyScenario(dateKey);
    if (!scenario) {
      return NextResponse.json({ error: '오늘의 시나리오가 아직 없습니다' }, { status: 404 });
    }

    const existing = await getDailyTurns(userId, dateKey);

    // CASE 1: 첫 호출 — agent T1 생성
    if (existing.length === 0 && !userMessage) {
      const messages: ChatMessage[] = [{ role: 'user', content: '시작하라.' }];
      const agentMsg = await callClaude({
        system: scenario.scenario_prompt,
        messages,
        maxTokens: 1024,
      });
      await appendDailyTurn(userId, dateKey, 1, agentMsg, null);
      // 측정 시작일 설정 (최초 1회)
      await setMeasurementStart(userId);
      return NextResponse.json({ turn_idx: 1, agent_msg: agentMsg, finished: false });
    }

    // CASE 2: 사용자 응답
    if (!userMessage) {
      return NextResponse.json({ error: 'userMessage required' }, { status: 400 });
    }

    const lastTurn = existing[existing.length - 1];
    if (!lastTurn || lastTurn.user_msg !== null) {
      return NextResponse.json({ error: 'no pending turn' }, { status: 400 });
    }

    // 진정성 체크
    let authenticity = null;
    let enrichedMeta = null;
    if (inputMeta) {
      authenticity = checkAuthenticity(inputMeta as InputMetadata);
      enrichedMeta = { ...inputMeta, authenticity };
    }

    await appendDailyTurn(userId, dateKey, lastTurn.turn_idx, lastTurn.agent_msg, userMessage, enrichedMeta);

    // 5턴 마쳤으면 종료
    if (lastTurn.turn_idx >= TURN_LIMIT) {
      return NextResponse.json({
        turn_idx: lastTurn.turn_idx,
        agent_msg: null,
        finished: true,
        authenticity: authenticity ? { score: authenticity.score, verdict: authenticity.verdict } : null,
      });
    }

    // 다음 agent turn
    const history: ChatMessage[] = [{ role: 'user', content: '시작하라.' }];
    for (const t of existing) {
      history.push({ role: 'assistant', content: t.agent_msg });
      const u = t.turn_idx === lastTurn.turn_idx ? userMessage : t.user_msg;
      if (u) history.push({ role: 'user', content: u });
    }

    const nextAgentMsg = await callClaude({
      system: scenario.scenario_prompt,
      messages: history,
      maxTokens: 1024,
    });
    const nextTurnIdx = lastTurn.turn_idx + 1;
    await appendDailyTurn(userId, dateKey, nextTurnIdx, nextAgentMsg, null);

    return NextResponse.json({
      turn_idx: nextTurnIdx,
      agent_msg: nextAgentMsg,
      finished: false,
      authenticity: authenticity ? { score: authenticity.score, verdict: authenticity.verdict } : null,
    });
  } catch (e: any) {
    console.error('[daily-scenario/turn] error', e);
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
