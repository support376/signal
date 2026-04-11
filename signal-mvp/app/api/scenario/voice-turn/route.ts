import { NextResponse } from 'next/server';
import { callClaude, type ChatMessage } from '@/lib/anthropic';
import { SCENARIO_PROMPTS, TURN_LIMIT } from '@/lib/prompts/scenarios';
import { getVoiceTurns, appendVoiceTurn, type VoiceFeatures } from '@/lib/db';
import type { ScenarioId } from '@/lib/types';
import { SCENARIOS } from '@/lib/types';

/**
 * Voice 시나리오 턴 API
 * - 텍스트 시나리오와 완전 별개 테이블 (voice_scenario_runs)
 * - audio blob을 FormData로 받아서 BYTEA로 저장
 * - 브라우저에서 추출한 voice features (pitch 등)를 함께 저장
 */
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // ── FormData (음성 데이터 포함) ──
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const userId = form.get('userId') as string;
      const scenarioId = form.get('scenarioId') as string;
      const userMessage = form.get('userMessage') as string | null;
      const audioFile = form.get('audio') as File | null;
      const voiceFeaturesRaw = form.get('voiceFeatures') as string | null;
      const audioDuration = parseFloat(form.get('audioDuration') as string) || null;

      if (!userId || !scenarioId) {
        return NextResponse.json({ error: 'userId, scenarioId required' }, { status: 400 });
      }
      if (!SCENARIOS.includes(scenarioId as ScenarioId)) {
        return NextResponse.json({ error: 'invalid scenarioId' }, { status: 400 });
      }

      const sid = scenarioId as ScenarioId;
      const existing = await getVoiceTurns(userId, sid);

      // 음성 데이터 → base64
      let audioBase64: string | null = null;
      if (audioFile) {
        const arrayBuf = await audioFile.arrayBuffer();
        audioBase64 = Buffer.from(arrayBuf).toString('base64');
      }

      // voice features (프론트에서 Web Audio API로 추출)
      let voiceFeatures: VoiceFeatures | null = null;
      if (voiceFeaturesRaw) {
        try {
          voiceFeatures = JSON.parse(voiceFeaturesRaw);
        } catch { /* ignore */ }
      }

      // 사용자 응답이 있는 경우
      if (userMessage || audioFile) {
        const lastTurn = existing[existing.length - 1];
        if (!lastTurn || lastTurn.user_msg !== null) {
          return NextResponse.json({ error: 'no pending turn for user response' }, { status: 400 });
        }

        // 마지막 turn 갱신
        await appendVoiceTurn(
          userId, sid, lastTurn.turn_idx, lastTurn.agent_msg,
          userMessage || '🎙 음성 응답',
          audioBase64, audioDuration, voiceFeatures
        );

        // 5턴 마쳤으면 종료
        if (lastTurn.turn_idx >= TURN_LIMIT) {
          return NextResponse.json({ turn_idx: lastTurn.turn_idx, agent_msg: null, finished: true });
        }

        // 다음 agent turn 생성
        const history: ChatMessage[] = [{ role: 'user', content: '시작하라.' }];
        for (const t of existing) {
          history.push({ role: 'assistant', content: t.agent_msg });
          const u = t.turn_idx === lastTurn.turn_idx ? (userMessage || '🎙 음성 응답') : t.user_msg;
          if (u) history.push({ role: 'user', content: u });
        }

        const system = SCENARIO_PROMPTS[sid];
        const nextAgentMsg = await callClaude({ system, messages: history, maxTokens: 1024 });
        const nextTurnIdx = lastTurn.turn_idx + 1;
        await appendVoiceTurn(userId, sid, nextTurnIdx, nextAgentMsg, null, null, null, null);

        return NextResponse.json({ turn_idx: nextTurnIdx, agent_msg: nextAgentMsg, finished: false });
      }

      // 첫 호출 (agent T1)
      return await handleFirstTurn(userId, sid, existing);
    }

    // ── JSON (첫 호출 등) ──
    const { userId, scenarioId } = await req.json();
    if (!userId || !scenarioId) {
      return NextResponse.json({ error: 'userId, scenarioId required' }, { status: 400 });
    }
    if (!SCENARIOS.includes(scenarioId as ScenarioId)) {
      return NextResponse.json({ error: 'invalid scenarioId' }, { status: 400 });
    }

    const sid = scenarioId as ScenarioId;
    const existing = await getVoiceTurns(userId, sid);
    return await handleFirstTurn(userId, sid, existing);
  } catch (e: any) {
    console.error('[scenario/voice-turn] error', e);
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}

async function handleFirstTurn(userId: string, sid: ScenarioId, existing: any[]) {
  if (existing.length === 0) {
    const system = SCENARIO_PROMPTS[sid];
    const messages: ChatMessage[] = [{ role: 'user', content: '시작하라.' }];
    const agentMsg = await callClaude({ system, messages, maxTokens: 1024 });
    await appendVoiceTurn(userId, sid, 1, agentMsg, null, null, null, null);
    return NextResponse.json({ turn_idx: 1, agent_msg: agentMsg, finished: false });
  }
  // 이미 진행 중이면 마지막 상태 반환
  const last = existing[existing.length - 1];
  return NextResponse.json({ turn_idx: last.turn_idx, agent_msg: last.agent_msg, finished: false });
}
