import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  getCompletedScenarios, getUser, getIntegratedVector, getDailyHistory,
} from '@/lib/db';
import { computeCompleteness } from '@/lib/integrator';
import { SCENARIO_ORDER, SCENARIO_CONTEXTS } from '@/lib/scenario-meta';
import { AXIS_LABELS_KO, AXES } from '@/lib/types';
import DailyScenarioCard from '@/app/components/daily-scenario-card';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const userId = cookies().get('signal_user_id')?.value;
  if (!userId) redirect('/');
  const user = await getUser(userId);
  if (!user) redirect('/');

  const [completed, vector, dailyHistory] = await Promise.all([
    getCompletedScenarios(userId),
    getIntegratedVector(userId),
    getDailyHistory(userId),
  ]);
  const completeness = computeCompleteness(vector);
  const done = completeness.scenarios_completed;
  const completedSet = new Set(completed);
  const nextSid = SCENARIO_ORDER.find((sid) => !completedSet.has(sid));
  const calibrated = done >= 5;

  // 벡터에서 top 축 추출 (confidence 높은 순)
  const topAxes = vector?.axes
    ? Object.entries(vector.axes)
        .filter(([, m]: [string, any]) => m && m.confidence >= 0.5)
        .sort(([, a]: [string, any], [, b]: [string, any]) => b.confidence - a.confidence)
        .slice(0, 3)
        .map(([axis, m]: [string, any]) => ({
          axis,
          label: AXIS_LABELS_KO[axis as keyof typeof AXIS_LABELS_KO] || axis,
          value: m.value,
          confidence: m.confidence,
        }))
    : [];

  const avgConfidence = vector?.summary?.average_confidence ?? 0;
  const trustLabel = avgConfidence >= 0.7 ? '높음' : avgConfidence >= 0.4 ? '안정' : '낮음';

  return (
    <div className="max-w-md mx-auto px-5 py-8 pb-20">
      <p className="text-lg font-bold mb-6 text-fg">Signalogy</p>

      {/* ━━━ 상단: 오늘의 신호 ━━━ */}
      {calibrated ? (
        /* 캘리브레이션 완료 → 데일리 시나리오 */
        <DailyScenarioCard userId={userId} />
      ) : (
        /* 신규 유저 → 초기 캘리브레이션 */
        <section className="p-5 border border-fg rounded-xl mb-6 bg-card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-mono text-dim">&gt;</span>
            <div>
              <p className="text-sm font-semibold text-fg">초기 캘리브레이션</p>
              <p className="text-[10px] text-faint">기본 성격 벡터를 구축합니다</p>
            </div>
          </div>

          <div className="flex gap-1.5 mb-2">
            {SCENARIO_ORDER.map((_, i) => (
              <div key={i} className={`flex-1 h-2 rounded-full ${i < done ? 'bg-fg' : 'bg-line'}`} />
            ))}
          </div>
          <p className="text-[10px] text-faint mb-4">{done}/5 완료 — {5 - done}개 남음</p>

          {nextSid && (
            <>
              <p className="text-xs text-dim mb-3">{SCENARIO_CONTEXTS[nextSid].domainHint}</p>
              <Link href={`/scenario/${nextSid}`}
                className="block text-center py-3 bg-fg text-bg rounded-xl text-sm font-semibold hover:opacity-80 transition">
                {done === 0 ? '시작하기 →' : '이어서 →'}
              </Link>
            </>
          )}
        </section>
      )}

      {/* ━━━ 중단: 오늘의 나 ━━━ */}
      {vector && (
        <section className="p-5 border border-line rounded-xl mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-dim">오늘의 나</p>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded border ${
                trustLabel === '높음' ? 'border-fg text-fg' :
                trustLabel === '안정' ? 'border-dim text-dim' :
                'border-line text-faint'
              }`}>
                신뢰도 {trustLabel}
              </span>
            </div>
          </div>

          {topAxes.length > 0 ? (
            <div className="space-y-2.5">
              {topAxes.map((a) => (
                <div key={a.axis}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-fg">{a.label}</span>
                    <span className="text-[10px] text-faint">{a.value}</span>
                  </div>
                  <div className="h-1.5 bg-line rounded-full">
                    <div className="h-full bg-fg rounded-full transition-all" style={{ width: `${a.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-faint">시나리오를 완료하면 여기에 결과가 표시됩니다.</p>
          )}

          {completeness.measured_axes > 0 && (
            <p className="text-[10px] text-faint mt-3">
              {completeness.measured_axes}/15 축 측정 · 평균 신뢰도 {Math.round(avgConfidence * 100)}%
            </p>
          )}
        </section>
      )}

      {/* ━━━ 하단: 시간 속의 나 (미리보기) ━━━ */}
      <section className="p-5 border border-line rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-dim">시간 속의 나</p>
          <Link href="/me" className="text-[10px] text-faint hover:text-dim">자세히 →</Link>
        </div>

        {dailyHistory.length > 0 ? (
          <>
            <div className="flex items-end gap-1 h-12 mb-2">
              {dailyHistory.slice(0, 14).reverse().map((d, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end">
                  <div
                    className="bg-fg rounded-sm min-h-[2px]"
                    style={{ height: `${Math.max(8, (d.authenticity_score || 0.5) * 100)}%` }}
                  />
                </div>
              ))}
              {dailyHistory.length < 14 && Array.from({ length: 14 - dailyHistory.length }).map((_, i) => (
                <div key={`empty-${i}`} className="flex-1 flex flex-col justify-end">
                  <div className="bg-line rounded-sm h-[2px]" />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-faint">최근 14일 · {dailyHistory.length}일 측정</p>
          </>
        ) : (
          <div className="h-12 flex items-center justify-center">
            <p className="text-xs text-faint">매일 신호를 보내면 여기에 변화가 그려집니다.</p>
          </div>
        )}

        {user.measurement_start && (
          <p className="text-[10px] text-faint mt-2">
            측정 시작: {new Date(user.measurement_start).toLocaleDateString('ko-KR')}
          </p>
        )}
      </section>
    </div>
  );
}
