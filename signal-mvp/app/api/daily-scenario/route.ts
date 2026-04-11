import { NextResponse } from 'next/server';
import { getDailyScenario, getDailyTurns, getDailyHistory } from '@/lib/db';

/**
 * GET /api/daily-scenario?userId=xxx
 * 오늘의 시나리오 + 사용자 진행 상태 반환
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const dateKey = new Date().toISOString().slice(0, 10);
    const scenario = await getDailyScenario(dateKey);

    if (!scenario) {
      return NextResponse.json({ available: false, dateKey, message: '오늘의 시나리오가 아직 준비되지 않았습니다.' });
    }

    const turns = await getDailyTurns(userId, dateKey);
    const lastTurn = turns[turns.length - 1];
    const finished = lastTurn ? lastTurn.turn_idx >= 5 && lastTurn.user_msg !== null : false;

    // 최근 히스토리 (최근 7일)
    const history = await getDailyHistory(userId);

    return NextResponse.json({
      available: true,
      dateKey,
      scenario: {
        agentName: scenario.agent_name,
        agentLabel: scenario.agent_label,
        trigger: scenario.trigger_text,
        domainHint: scenario.domain_hint,
        targetAxes: scenario.target_axes,
      },
      turns,
      finished,
      streak: computeStreak(history),
      totalDays: history.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}

/** 연속 참여일수 계산 */
function computeStreak(history: { date_key: string }[]): number {
  if (history.length === 0) return 0;
  const dates = history.map((h) => h.date_key).sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;
  let expected = today;

  for (const d of dates) {
    if (d === expected) {
      streak++;
      // 전날로 이동
      const prev = new Date(expected);
      prev.setDate(prev.getDate() - 1);
      expected = prev.toISOString().slice(0, 10);
    } else if (d < expected) {
      break;
    }
  }
  return streak;
}
