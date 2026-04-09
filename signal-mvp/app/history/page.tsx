import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  getUser,
  getCompletedScenarios,
  getSelfReport,
  listMyChemistries,
  getIntegratedVector,
} from '@/lib/db';
import { SCENARIO_ORDER, SCENARIO_LABELS, SCENARIO_CONTEXTS } from '@/lib/prompts/scenarios';

export const dynamic = 'force-dynamic';

const LENS_KO: Record<string, string> = {
  friend: '친구',
  romantic: '연인',
  family: '가족',
  work: '동료',
};

export default async function HistoryPage() {
  const userId = cookies().get('signal_user_id')?.value;
  if (!userId) redirect('/');

  const me = await getUser(userId);
  if (!me) redirect('/');

  const completed = await getCompletedScenarios(userId);
  const completedSet = new Set(completed);
  const selfReport = await getSelfReport(userId);
  const chemistries = await listMyChemistries(userId);
  const integrated = await getIntegratedVector(userId);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/dashboard" className="text-xs text-dim hover:text-accent">← 대시보드</Link>

      <header className="mt-4 mb-12">
        <h1 className="text-3xl font-bold">{me.name}의 과거 내역</h1>
        <p className="text-sm text-dim mt-2">
          {completed.length}/5 시나리오 · {chemistries.length}건 케미 · 자기 분석{' '}
          {selfReport ? '있음' : '없음'}
        </p>
      </header>

      {/* ─────── 시나리오별 ─────── */}
      <section className="mb-12">
        <h2 className="text-sm font-semibold text-accent uppercase tracking-wider mb-4">
          시나리오 + 추출 벡터
        </h2>
        <div className="space-y-3">
          {SCENARIO_ORDER.map((sid) => {
            const isDone = completedSet.has(sid);
            const ctx = SCENARIO_CONTEXTS[sid];
            return (
              <div
                key={sid}
                className={`p-4 bg-card border rounded-xl ${
                  isDone ? 'border-line' : 'border-line/40 opacity-50'
                }`}
              >
                <div className="flex items-baseline justify-between mb-1">
                  <p className="font-medium">{SCENARIO_LABELS[sid]}</p>
                  {isDone ? (
                    <span className="text-xs text-accent3">✓ 완료</span>
                  ) : (
                    <span className="text-xs text-dim">미완료</span>
                  )}
                </div>
                <p className="text-xs text-dim mb-3">{ctx.domainHint}</p>
                {isDone ? (
                  <Link
                    href={`/scenario/${sid}/vector`}
                    className="text-xs text-accent hover:underline"
                  >
                    대화 + 벡터 보기 →
                  </Link>
                ) : (
                  <Link
                    href={`/scenario/${sid}`}
                    className="text-xs text-dim hover:text-accent"
                  >
                    시작하기 →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─────── 통합 벡터 요약 ─────── */}
      {integrated && (
        <section className="mb-12">
          <h2 className="text-sm font-semibold text-accent uppercase tracking-wider mb-4">
            통합 벡터 요약 (Layer 0.5)
          </h2>
          <div className="bg-card border border-line rounded-xl p-5 text-xs space-y-2">
            <p>
              완료 시나리오: <span className="text-accent3">{integrated.scenarios_completed.length}</span>
            </p>
            <p>
              측정된 축: <span className="text-accent3">{integrated.summary.measured_axes}/15</span>
            </p>
            <p>
              고신뢰도 축 (≥0.65): <span className="text-accent3">{integrated.summary.high_confidence_axes}/15</span>
            </p>
            <p>
              평균 신뢰도: <span className="text-accent3">{integrated.summary.average_confidence}</span>
            </p>
            {integrated.summary.flagged_conflicts.length > 0 && (
              <p className="text-amber-300">
                충돌 flag: {integrated.summary.flagged_conflicts.join(', ')}
              </p>
            )}
          </div>
        </section>
      )}

      {/* ─────── 자기 분석 ─────── */}
      <section className="mb-12">
        <h2 className="text-sm font-semibold text-accent uppercase tracking-wider mb-4">
          자기 분석 리포트
        </h2>
        {selfReport ? (
          <Link
            href="/report"
            className="block p-5 bg-card border border-line rounded-xl hover:border-accent3 transition"
          >
            <p className="font-medium">생성됨</p>
            <p className="text-xs text-dim mt-1">클릭해서 다시 보기 →</p>
          </Link>
        ) : (
          <p className="text-dim text-sm">아직 생성 안 됨. 5/5 완료 후 대시보드에서 생성 가능.</p>
        )}
      </section>

      {/* ─────── 케미 내역 ─────── */}
      <section className="mb-12">
        <h2 className="text-sm font-semibold text-accent uppercase tracking-wider mb-4">
          케미 분석 내역 ({chemistries.length}건)
        </h2>
        {chemistries.length === 0 && (
          <p className="text-dim text-sm">아직 케미 분석 없음.</p>
        )}
        <div className="space-y-2">
          {chemistries.map((c) => {
            const otherIsA = c.user_a_id !== userId;
            const otherId = otherIsA ? c.user_a_id : c.user_b_id;
            const otherName = otherIsA ? c.user_a_name : c.user_b_name;
            return (
              <Link
                key={`${c.user_a_id}-${c.user_b_id}-${c.lens}`}
                href={`/chemistry/${otherId}/${c.lens}`}
                className="block p-4 bg-card border border-line rounded-xl hover:border-accent2 transition"
              >
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="font-medium">
                      <span className="text-fg">{me.name}</span>
                      <span className="text-dim mx-2">×</span>
                      <span className="text-accent2">{otherName}</span>
                    </p>
                    <p className="text-xs text-dim mt-1">
                      {LENS_KO[c.lens] || c.lens} · {new Date(c.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <p className="text-2xl font-bold bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">
                    {c.score}%
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
