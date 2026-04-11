import { NextResponse } from 'next/server';
import { getVoiceTurns } from '@/lib/db';
import type { ScenarioId } from '@/lib/types';
import { SCENARIOS } from '@/lib/types';
import { TURN_LIMIT } from '@/lib/prompts/scenarios';

export async function POST(req: Request) {
  try {
    const { userId, scenarioId } = await req.json();
    if (!userId || !scenarioId) {
      return NextResponse.json({ error: 'userId, scenarioId required' }, { status: 400 });
    }
    if (!SCENARIOS.includes(scenarioId as ScenarioId)) {
      return NextResponse.json({ error: 'invalid scenarioId' }, { status: 400 });
    }

    const turns = await getVoiceTurns(userId, scenarioId as ScenarioId);
    const lastTurn = turns[turns.length - 1];
    const finished = lastTurn
      ? lastTurn.turn_idx >= TURN_LIMIT && lastTurn.user_msg !== null
      : false;

    return NextResponse.json({ turns, finished });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
