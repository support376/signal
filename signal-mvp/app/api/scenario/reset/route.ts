import { NextResponse } from 'next/server';
import { resetScenario, getPayloads, saveIntegratedVector, getUser } from '@/lib/db';
import { integrate } from '@/lib/integrator';
import { SCENARIOS, type ScenarioId } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const { userId, scenarioId } = await req.json();
    if (!userId || !scenarioId || !SCENARIOS.includes(scenarioId)) {
      return NextResponse.json({ error: 'invalid input' }, { status: 400 });
    }

    // 기존 대화 + payload 삭제
    await resetScenario(userId, scenarioId as ScenarioId);

    // 통합 벡터 재계산 (남은 payload로)
    const remaining = await getPayloads(userId);
    if (remaining.length > 0) {
      const user = await getUser(userId);
      const vector = integrate(remaining, user?.name || userId);
      await saveIntegratedVector(userId, vector);
    }

    return NextResponse.json({ ok: true, remaining_scenarios: remaining.length });
  } catch (e: any) {
    console.error('[scenario/reset] error', e);
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
