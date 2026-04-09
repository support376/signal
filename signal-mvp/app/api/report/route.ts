import { NextResponse } from 'next/server';
import { callClaude } from '@/lib/anthropic';
import { SELF_REPORT_SYSTEM, buildSelfReportUserMessage } from '@/lib/prompts/self-report';
import { getIntegratedVector, getSelfReport, saveSelfReport, getUser } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { userId, force } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    // Cache hit
    if (!force) {
      const cached = await getSelfReport(userId);
      if (cached) return NextResponse.json({ narrative: cached, cached: true });
    }

    const vector = await getIntegratedVector(userId);
    if (!vector) {
      return NextResponse.json({ error: '통합 벡터 없음. 5개 시나리오 모두 풀어야 함.' }, { status: 400 });
    }

    const user = await getUser(userId);
    const userName = user?.name || userId;

    const narrative = await callClaude({
      system: SELF_REPORT_SYSTEM,
      messages: [{ role: 'user', content: buildSelfReportUserMessage({ userName, vector }) }],
      maxTokens: 3000,
      temperature: 0.7,
    });

    await saveSelfReport(userId, narrative);
    return NextResponse.json({ narrative, cached: false });
  } catch (e: any) {
    console.error('[report] error', e);
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 });
  }
}
