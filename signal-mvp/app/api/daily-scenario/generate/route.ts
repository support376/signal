import { NextResponse } from 'next/server';
import { callClaude, parseJsonResponse } from '@/lib/anthropic';
import { getDailyScenario, saveDailyScenario } from '@/lib/db';
import { buildGeneratorPrompt, selectTargetAxes, DAILY_COMMON_RULES } from '@/lib/prompts/daily-generator';

/**
 * POST /api/daily-scenario/generate
 * 오늘의 시나리오를 생성. 이미 존재하면 스킵.
 * 크론(스케줄) 또는 수동 호출 가능.
 * 인증: API_SECRET 헤더 또는 dateKey 파라미터로 호출.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const dateKey = body.dateKey || getTodayKey();

    // 이미 존재하면 스킵
    const existing = await getDailyScenario(dateKey);
    if (existing) {
      return NextResponse.json({ ok: true, status: 'exists', dateKey });
    }

    // 타겟 축 선택
    const targetAxes = selectTargetAxes(dateKey);

    // Claude에게 시나리오 생성 요청
    const generatorPrompt = buildGeneratorPrompt(dateKey, targetAxes);
    const raw = await callClaude({
      system: '너는 Signalogy 시나리오 설계자다. JSON만 출력한다.',
      messages: [{ role: 'user', content: generatorPrompt }],
      maxTokens: 4096,
      temperature: 0.9,
    });

    const scenario = parseJsonResponse(raw);
    if (!scenario?.agent_name || !scenario?.scenario_prompt || !scenario?.agent_label || !scenario?.trigger || !scenario?.domain_hint) {
      throw new Error('Invalid scenario JSON — missing required fields: agent_name, agent_label, trigger, domain_hint, scenario_prompt');
    }

    // prompt에 공통 규칙 추가
    const fullPrompt = scenario.scenario_prompt + '\n\n' + DAILY_COMMON_RULES;

    await saveDailyScenario({
      dateKey,
      scenarioPrompt: fullPrompt,
      agentName: scenario.agent_name,
      agentLabel: scenario.agent_label,
      triggerText: scenario.trigger,
      domainHint: scenario.domain_hint,
      targetAxes: targetAxes as string[],
    });

    return NextResponse.json({ ok: true, status: 'created', dateKey, agentName: scenario.agent_name });
  } catch (e: any) {
    console.error('[daily-scenario/generate] error', e);
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}

function getTodayKey(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}
