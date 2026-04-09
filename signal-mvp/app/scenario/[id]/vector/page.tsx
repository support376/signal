import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getTurns, getPayload, getUser } from '@/lib/db';
import { SCENARIO_LABELS, SCENARIO_CONTEXTS } from '@/lib/scenario-meta';
import { SCENARIOS, AXIS_LABELS_KO, type ScenarioId, type Axis } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STRENGTH_COLOR: Record<string, string> = {
  weak: 'text-dim',
  medium: 'text-accent3',
  strong: 'text-accent',
};

export default async function ScenarioVectorPage({
  params,
}: {
  params: { id: string };
}) {
  const userId = cookies().get('signal_user_id')?.value;
  if (!userId) redirect('/');

  if (!SCENARIOS.includes(params.id as any)) notFound();
  const scenarioId = params.id as ScenarioId;

  const user = await getUser(userId);
  if (!user) redirect('/');

  const turns = await getTurns(userId, scenarioId);
  const payload = await getPayload(userId, scenarioId);
  const ctx = SCENARIO_CONTEXTS[scenarioId];

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/history" className="text-xs text-dim hover:text-accent">← 과거 내역</Link>

      <header className="mt-4 mb-8">
        <p className="text-xs text-dim uppercase tracking-wider">{ctx.domainHint}</p>
        <h1 className="text-2xl font-bold mt-1">{SCENARIO_LABELS[scenarioId]}</h1>
        <p className="text-sm text-dim mt-2">상대: {ctx.agentLabel}</p>
      </header>

      {/* ─────── 대화 ─────── */}
      <section className="mb-12">
        <h2 className="text-sm font-semibold text-accent uppercase tracking-wider mb-4">
          대화 ({turns.length}/5턴)
        </h2>
        {turns.length === 0 && (
          <p className="text-dim text-sm">아직 대화 없음.</p>
        )}
        <div className="space-y-4">
          {turns.map((t) => (
            <div key={t.turn_idx} className="space-y-2">
              <div className="bg-card border border-line rounded-2xl rounded-tl-sm p-4 max-w-[85%]">
                <p className="text-xs text-dim mb-1">T{t.turn_idx} · {ctx.agentName}</p>
                <p className="whitespace-pre-wrap leading-relaxed text-sm">{t.agent_msg}</p>
              </div>
              {t.user_msg && (
                <div className="bg-accent/10 border border-accent/30 rounded-2xl rounded-tr-sm p-4 max-w-[85%] ml-auto">
                  <p className="text-xs text-accent mb-1">T{t.turn_idx} · 나</p>
                  <p className="whitespace-pre-wrap leading-relaxed text-sm">{t.user_msg}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─────── 추출된 벡터 ─────── */}
      <section className="mb-12">
        <h2 className="text-sm font-semibold text-accent uppercase tracking-wider mb-4">
          추출된 벡터 (Layer 1)
        </h2>
        {!payload && (
          <p className="text-dim text-sm">
            아직 분석 안 됨. 5턴 대화를 마치고 *분석하기* 버튼을 눌러야 추출돼.
          </p>
        )}
        {payload && (
          <div className="space-y-3">
            <div className="text-xs text-dim mb-3">
              scenario_id: <code className="text-accent3">{payload.scenario_id}</code>
              {' · '}
              측정 축: {Object.keys(payload.axes_measured).length}개
              {' · '}
              skip: {payload.axes_skipped.length}개
            </div>

            {Object.entries(payload.axes_measured).map(([axis, m]) => {
              if (!m) return null;
              const koLabel = AXIS_LABELS_KO[axis as Axis];
              return (
                <div
                  key={axis}
                  className="bg-card border border-line rounded-xl p-4"
                >
                  <div className="flex items-baseline justify-between mb-2 gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-fg">{koLabel}</p>
                      <p className="font-mono text-xs text-dim mt-0.5">{axis}</p>
                    </div>
                    <div className="flex items-baseline gap-3 text-xs whitespace-nowrap">
                      <span className="text-accent3 font-semibold">{m.value}</span>
                      <span className="text-dim">conf {m.confidence.toFixed(2)}</span>
                      {m.strength && (
                        <span className={STRENGTH_COLOR[m.strength] || 'text-dim'}>
                          {m.strength}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Value bar */}
                  <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-accent to-accent2"
                      style={{ width: `${m.value}%` }}
                    />
                  </div>
                  <p className="text-xs text-dim leading-relaxed">{m.evidence}</p>
                  {m.turns_with_signal && m.turns_with_signal.length > 0 && (
                    <p className="text-xs text-dim mt-1">
                      turns: {m.turns_with_signal.map((t) => `T${t}`).join(', ')}
                    </p>
                  )}
                </div>
              );
            })}

            {payload.axes_skipped.length > 0 && (
              <div className="text-xs text-dim mt-4">
                <p className="uppercase tracking-wider mb-1">측정 안 된 축</p>
                <p className="leading-relaxed">
                  {payload.axes_skipped.map((a) => AXIS_LABELS_KO[a]).join(' · ')}
                </p>
              </div>
            )}

            {payload.notes && (
              <div className="mt-6 p-4 bg-bg border border-line rounded-xl">
                <p className="text-xs text-dim uppercase tracking-wider mb-2">분석 노트</p>
                <p className="text-sm leading-relaxed">{payload.notes}</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
