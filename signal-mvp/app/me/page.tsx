import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser, getIntegratedVector, getDailyHistory, getSelfReport } from '@/lib/db';
import { computeCompleteness } from '@/lib/integrator';
import { AXES, AXIS_LABELS_KO, type Axis } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function MePage() {
  const userId = cookies().get('signal_user_id')?.value;
  if (!userId) redirect('/');
  const user = await getUser(userId);
  if (!user) redirect('/');

  const [vector, dailyHistory, selfReport] = await Promise.all([
    getIntegratedVector(userId),
    getDailyHistory(userId),
    getSelfReport(userId),
  ]);

  const completeness = computeCompleteness(vector);
  const avgConfidence = vector?.summary?.average_confidence ?? 0;
  const trustLabel = avgConfidence >= 0.7 ? '높음' : avgConfidence >= 0.4 ? '안정' : '낮음';
  const userSlug = user.slug || user.id;

  // 축별 데이터 정리
  const axisData: { axis: string; label: string; value: number; confidence: number }[] = [];
  if (vector?.axes) {
    for (const axis of AXES) {
      const m = (vector.axes as any)[axis];
      if (m && m.confidence > 0) {
        axisData.push({
          axis,
          label: AXIS_LABELS_KO[axis],
          value: m.value,
          confidence: m.confidence,
        });
      }
    }
  }
  const highConfAxes = axisData.filter((a) => a.confidence >= 0.5).sort((a, b) => b.confidence - a.confidence);
  const lowConfAxes = axisData.filter((a) => a.confidence < 0.5);

  return (
    <div className="max-w-md mx-auto px-5 py-8 pb-20">
      <p className="text-lg font-bold mb-6 text-fg">Signalogy</p>

      {/* ━━━ 상단: 남이 보는 나 (공개 프로필 미리보기) ━━━ */}
      <section className="p-5 border border-line rounded-xl mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-dim">남이 보는 나</p>
          <Link href="/profile" className="text-[10px] text-faint hover:text-dim">Edit →</Link>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-card border border-line flex items-center justify-center text-lg text-dim">
            {user.name[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-fg">{user.name}</p>
            <p className="text-xs text-faint">@{userSlug}</p>
            <div className="flex items-center gap-2 mt-1">
              {user.birth_year && <span className="text-[10px] text-faint">{user.birth_year}년생</span>}
              {user.nationality && <span className="text-[10px] text-faint">· {user.nationality}</span>}
              {user.location_current && (
                <span className="text-[10px] text-faint">· {user.location_current.label}</span>
              )}
            </div>
          </div>
        </div>

        {/* 공개 축 요약 (상위 3개) */}
        {highConfAxes.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {highConfAxes.slice(0, 3).map((a) => (
              <div key={a.axis} className="flex items-center justify-between text-xs">
                <span className="text-dim">{a.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1 bg-line rounded-full">
                    <div className="h-full bg-dim rounded-full" style={{ width: `${a.value}%` }} />
                  </div>
                  <span className="text-faint w-6 text-right">{a.value}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 text-[10px] text-faint">
          <span className={`px-2 py-0.5 rounded border ${
            trustLabel === '높음' ? 'border-fg text-fg' :
            trustLabel === '안정' ? 'border-dim text-dim' :
            'border-line text-faint'
          }`}>
            신뢰도 {trustLabel}
          </span>
          {user.measurement_start && (
            <span>측정 시작 {new Date(user.measurement_start).toLocaleDateString('ko-KR')}</span>
          )}
          <span>{dailyHistory.length}일 측정</span>
        </div>
      </section>

      {/* ━━━ 중단: 내가 보는 나 (15축 전체) ━━━ */}
      <section className="p-5 border border-line rounded-xl mb-6">
        <p className="text-xs text-dim mb-4">내가 보는 나</p>

        {selfReport && (
          <div className="mb-4 p-3 border border-line rounded-lg">
            <p className="text-xs text-dim leading-relaxed line-clamp-3">{selfReport.slice(0, 200)}...</p>
            <Link href="/report" className="text-[10px] text-faint hover:text-dim mt-1 block">전체 보기 →</Link>
          </div>
        )}

        {axisData.length > 0 ? (
          <>
            {/* 확신 높은 축 */}
            {highConfAxes.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] text-faint mb-2">명확한 축 ({highConfAxes.length}개)</p>
                <div className="space-y-2">
                  {highConfAxes.map((a) => (
                    <div key={a.axis}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-fg">{a.label}</span>
                        <span className="text-[10px] text-faint">{a.value} · {Math.round(a.confidence * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-line rounded-full">
                        <div className="h-full bg-fg rounded-full" style={{ width: `${a.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 아직 불확실한 축 */}
            {lowConfAxes.length > 0 && (
              <div>
                <p className="text-[10px] text-faint mb-2">아직 불확실 ({lowConfAxes.length}개)</p>
                <div className="space-y-1.5">
                  {lowConfAxes.map((a) => (
                    <div key={a.axis} className="flex items-center justify-between opacity-40">
                      <span className="text-xs text-dim">{a.label}</span>
                      <span className="text-[10px] text-faint">{a.value} · {Math.round(a.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 미측정 축 */}
            {15 - axisData.length > 0 && (
              <p className="text-[10px] text-faint mt-3">
                미측정 {15 - axisData.length}개 축 — 매일 신호를 보내면 채워집니다.
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-faint text-center py-8">
            시나리오를 완료하면 15축 성격 벡터가 여기에 표시됩니다.
          </p>
        )}
      </section>

      {/* ━━━ 하단: 시간 속의 나 (시계열 상세) ━━━ */}
      <section className="p-5 border border-line rounded-xl">
        <p className="text-xs text-dim mb-4">시간 속의 나</p>

        {dailyHistory.length > 0 ? (
          <>
            {/* 일별 활동 그래프 */}
            <div className="mb-4">
              <p className="text-[10px] text-faint mb-2">최근 30일 활동</p>
              <div className="flex items-end gap-0.5 h-16">
                {Array.from({ length: 30 }).map((_, i) => {
                  const dateOffset = 29 - i;
                  const date = new Date();
                  date.setDate(date.getDate() - dateOffset);
                  const dateKey = date.toISOString().slice(0, 10);
                  const entry = dailyHistory.find((d) => d.date_key === dateKey);
                  return (
                    <div key={i} className="flex-1 flex flex-col justify-end" title={dateKey}>
                      <div
                        className={`rounded-sm min-h-[2px] ${entry ? 'bg-fg' : 'bg-line'}`}
                        style={{ height: entry ? `${Math.max(15, (entry.authenticity_score || 0.5) * 100)}%` : '3%' }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[9px] text-faint mt-1">
                <span>30일 전</span>
                <span>오늘</span>
              </div>
            </div>

            {/* 통계 */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2 border border-line rounded-lg">
                <p className="text-lg font-bold text-fg">{dailyHistory.length}</p>
                <p className="text-[10px] text-faint">총 측정일</p>
              </div>
              <div className="p-2 border border-line rounded-lg">
                <p className="text-lg font-bold text-fg">{completeness.measured_axes}</p>
                <p className="text-[10px] text-faint">측정 축</p>
              </div>
              <div className="p-2 border border-line rounded-lg">
                <p className="text-lg font-bold text-fg">{Math.round(avgConfidence * 100)}%</p>
                <p className="text-[10px] text-faint">평균 신뢰도</p>
              </div>
            </div>

            {/* 측정 이력 */}
            <div className="mt-4">
              <p className="text-[10px] text-faint mb-2">최근 측정</p>
              <div className="space-y-1">
                {dailyHistory.slice(0, 7).map((d) => (
                  <div key={d.date_key} className="flex items-center justify-between py-1">
                    <span className="text-xs text-dim">{d.date_key}</span>
                    <span className="text-[10px] text-faint">
                      {d.authenticity_score ? `${Math.round(d.authenticity_score * 100)}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-xs text-faint mb-2">아직 시계열 데이터가 없습니다.</p>
            <p className="text-[10px] text-faint">매일 신호를 보내면 변화의 궤적이 그려집니다.</p>
          </div>
        )}

        {user.measurement_start && (
          <p className="text-[10px] text-faint mt-3 text-center">
            측정 시작: {new Date(user.measurement_start).toLocaleDateString('ko-KR')}
          </p>
        )}
      </section>
    </div>
  );
}
