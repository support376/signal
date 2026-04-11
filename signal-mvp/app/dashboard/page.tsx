import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  getCompletedScenarios, getUser, getIntegratedVector,
  getDailyHistory, getPayloads,
} from '@/lib/db';
import { computeCompleteness } from '@/lib/integrator';
import { SCENARIO_ORDER, SCENARIO_CONTEXTS } from '@/lib/scenario-meta';
import { AXES, AXIS_LABELS_KO, type Axis, type ScenarioPayload } from '@/lib/types';
import DailyScenarioCard from '@/app/components/daily-scenario-card';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const userId = cookies().get('signal_user_id')?.value;
  if (!userId) redirect('/');
  const user = await getUser(userId);
  if (!user) redirect('/');

  const [completed, vector, dailyHistory, payloads] = await Promise.all([
    getCompletedScenarios(userId),
    getIntegratedVector(userId),
    getDailyHistory(userId),
    getPayloads(userId),
  ]);

  const completeness = computeCompleteness(vector);
  const completedSet = new Set(completed);
  const nextSid = SCENARIO_ORDER.find((sid) => !completedSet.has(sid));
  const done = completed.length;
  const totalDays = done + dailyHistory.length;

  // payload를 시나리오별로 매핑
  const payloadMap = new Map<string, ScenarioPayload>();
  for (const p of payloads) payloadMap.set(p.scenario_id, p);

  // 15축 전체 상태
  const allAxes: { axis: Axis; label: string; value: number; confidence: number }[] = [];
  if (vector?.axes) {
    for (const axis of AXES) {
      const m = (vector.axes as any)[axis];
      if (m && m.confidence > 0) {
        allAxes.push({ axis, label: AXIS_LABELS_KO[axis], value: m.value, confidence: m.confidence });
      }
    }
  }
  allAxes.sort((a, b) => b.confidence - a.confidence);

  const avgConfidence = vector?.summary?.average_confidence ?? 0;
  const trustPct = Math.round(avgConfidence * 100);

  return (
    <div className="max-w-md mx-auto px-5 py-8 pb-20">
      <p className="text-lg font-bold mb-6 text-fg">Signalogy</p>

      {/* ━━━ 신뢰도 상태 ━━━ */}
      <section className="p-5 border border-line rounded-xl mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-dim">나의 signal 신뢰도</p>
          <p className="text-sm font-mono text-fg">{trustPct}%</p>
        </div>
        <div className="h-1 bg-line rounded-full mb-2">
          <div className="h-full bg-fg rounded-full transition-all" style={{ width: `${trustPct}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-faint">
          <span>{completeness.measured_axes}/15 축 측정</span>
          <span>{totalDays}일째</span>
        </div>
      </section>

      {/* ━━━ 오늘의 신호 ━━━ */}
      {done >= 5 && <DailyScenarioCard userId={userId} />}

      {/* ━━━ 시나리오 타임라인 (Day 1~5 + 데일리) ━━━ */}
      <section className="mb-6">
        <p className="text-xs text-dim mb-3">측정 기록</p>
        <div className="space-y-2">
          {SCENARIO_ORDER.map((sid, idx) => {
            const isDone = completedSet.has(sid);
            const isNext = sid === nextSid;
            const ctx = SCENARIO_CONTEXTS[sid];
            const payload = payloadMap.get(sid);

            // 이 시나리오에서 측정된 축들
            const measuredAxes = payload
              ? Object.entries(payload.axes_measured)
                  .filter(([, m]) => m && m.confidence > 0)
                  .map(([axis, m]: [string, any]) => ({
                    label: AXIS_LABELS_KO[axis as Axis] || axis,
                    value: m.value,
                    confidence: Math.round(m.confidence * 100),
                  }))
                  .sort((a, b) => b.confidence - a.confidence)
              : [];

            return (
              <div key={sid} className={`border rounded-xl ${isNext ? 'border-fg' : 'border-line'}`}>
                <div className="p-3">
                  {/* 헤더 */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-faint">Day {idx + 1}</span>
                      <p className={`text-xs ${isDone ? 'text-fg' : isNext ? 'text-fg' : 'text-faint'}`}>
                        {ctx.domainHint}
                      </p>
                    </div>
                    {isDone && <span className="text-[10px] text-faint">done</span>}
                  </div>

                  {/* 완료된 시나리오: 측정된 축 요약 */}
                  {isDone && measuredAxes.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {measuredAxes.map((a) => (
                        <div key={a.label} className="flex items-center justify-between">
                          <span className="text-[10px] text-dim">{a.label}</span>
                          <span className="text-[10px] font-mono text-faint">{a.value} / {a.confidence}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 완료된 시나리오: 버튼 */}
                  {isDone && (
                    <div className="flex gap-2 mt-2">
                      <Link href={`/scenario/${sid}/vector`}
                        className="text-[10px] text-faint hover:text-dim">상세</Link>
                      <Link href={`/scenario/${sid}?redo=1`}
                        className="text-[10px] text-faint hover:text-dim">재측정</Link>
                    </div>
                  )}

                  {/* 다음 시나리오: CTA */}
                  {isNext && (
                    <Link href={`/scenario/${sid}`}
                      className="block text-center py-2 mt-2 border border-fg rounded-lg text-xs text-fg hover:bg-card transition">
                      측정 시작
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ━━━ 현재 signal 상태 (15축) ━━━ */}
      {allAxes.length > 0 && (
        <section className="p-5 border border-line rounded-xl mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-dim">현재 signal</p>
            <Link href="/me" className="text-[10px] text-faint hover:text-dim">자세히 →</Link>
          </div>
          <div className="space-y-1.5">
            {allAxes.map((a) => (
              <div key={a.axis} className="flex items-center justify-between">
                <span className="text-[10px] text-dim flex-1">{a.label}</span>
                <div className="w-24 h-1 bg-line rounded-full mx-2">
                  <div className="h-full bg-fg rounded-full" style={{ width: `${a.value}%` }} />
                </div>
                <span className="text-[10px] font-mono text-faint w-14 text-right">{a.value} / {Math.round(a.confidence * 100)}%</span>
              </div>
            ))}
          </div>
          {15 - allAxes.length > 0 && (
            <p className="text-[10px] text-faint mt-2">미측정 {15 - allAxes.length}개</p>
          )}
        </section>
      )}

      {/* ━━━ 시간 속의 나 ━━━ */}
      <section className="p-5 border border-line rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-dim">시간 속의 나</p>
          <Link href="/me" className="text-[10px] text-faint hover:text-dim">자세히 →</Link>
        </div>

        {totalDays > 0 ? (
          <>
            <div className="flex items-end gap-1 h-12 mb-2">
              {/* 고정 시나리오를 Day 1~5로 표시 */}
              {SCENARIO_ORDER.map((sid, i) => (
                <div key={sid} className="flex-1 flex flex-col justify-end">
                  <div
                    className={`rounded-sm min-h-[2px] ${completedSet.has(sid) ? 'bg-fg' : 'bg-line'}`}
                    style={{ height: completedSet.has(sid) ? '60%' : '3%' }}
                  />
                </div>
              ))}
              {/* 데일리 히스토리 */}
              {dailyHistory.slice(0, 9).reverse().map((d, i) => (
                <div key={`d-${i}`} className="flex-1 flex flex-col justify-end">
                  <div className="bg-fg rounded-sm min-h-[2px]"
                    style={{ height: `${Math.max(15, (d.authenticity_score || 0.5) * 100)}%` }} />
                </div>
              ))}
              {/* 빈 슬롯 */}
              {Array.from({ length: Math.max(0, 14 - done - dailyHistory.length) }).map((_, i) => (
                <div key={`e-${i}`} className="flex-1 flex flex-col justify-end">
                  <div className="bg-line rounded-sm h-[2px]" />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-faint">{totalDays}일 측정</p>
          </>
        ) : (
          <p className="text-xs text-faint text-center py-4">매일 신호를 보내면 여기에 변화가 그려집니다.</p>
        )}

        {user.measurement_start && (
          <p className="text-[10px] text-faint mt-1">
            시작: {new Date(user.measurement_start).toLocaleDateString('ko-KR')}
          </p>
        )}
      </section>
    </div>
  );
}
