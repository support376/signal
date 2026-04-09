import { NextResponse } from 'next/server';
import { getTurns } from '@/lib/db';
import { SCENARIOS, type ScenarioId } from '@/lib/types';
import { TURN_LIMIT } from '@/lib/prompts/scenarios';

export async function POST(req: Request) {
  try {
    const { userId, scenarioId } = await req.json();
    if (!userId || !scenarioId || !SCENARIOS.includes(scenarioId)) {
      return NextResponse.json({ error: 'invalid input' }, { status: 400 });
    }
    const turns = await getTurns(userId, scenarioId as ScenarioId);
    const lastTurn = turns[turns.length - 1];
    const finished =
      turns.length >= TURN_LIMIT && lastTurn && lastTurn.user_msg !== null;
    return NextResponse.json({ turns, finished });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
