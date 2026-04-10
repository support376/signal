import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  getCompletedScenarios,
  getUser,
  getIntegratedVector,
  countMyReferrals,
} from '@/lib/db';
import { computeCompleteness } from '@/lib/integrator';
import { SCENARIO_ORDER, SCENARIO_LABELS, SCENARIO_CONTEXTS } from '@/lib/scenario-meta';
import MyLinkCard from '@/app/components/my-link-card';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const userId = cookies().get('signal_user_id')?.value;
  if (!userId) redirect('/');

  const user = await getUser(userId);
  if (!user) redirect('/');

  // 4개 read를 병렬로 — 순차 fetch 대비 ~300-500ms 절약
  const [completed, vector, referredCount] = await Promise.all([
    getCompletedScenarios(userId),
    getIntegratedVector(userId),
    countMyReferrals(userId),
  ]);
  const completedSet = new Set(completed);
  const completeness = computeCompleteness(vector);

  const hasAnyData = completeness.scenarios_completed > 0;
  // Slug fallback: 기존 사용자가 NULL이면 user.id 사용
  const userSlug = user.slug || user.id;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <header className="mb-8">
        <p className="text-xs text-dim uppercase tracking-wider">로그인됨</p>
        <h1 className="text-3xl font-bold mt-1">{user.name}</h1>
        <p className="text-xs text-dim mt-1 font-mono">@{userSlug}</p>
      </header>

      {/* ── 첫 방문 온보딩 (시나리오 0개일 때) ── */}
      {completeness.scenarios_completed === 0 && (
        <section className="mb-12 bg-gradient-to-br from-accent/10 to-accent2/10 border border-accent/20 rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-4 text-center">👋 환영해, {user.name}</h2>
          <div className="space-y-4 text-sm text-fg leading-relaxed">
            <div className="flex gap-3 items-start">
              <span className="text-accent font-bold">1</span>
              <p><strong>AI와 대화해.</strong> 5가지 상황에서 카톡처럼 자연스럽게. 정답은 없어 — 네가 느끼는 대로 답하면 돼.</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-accent font-bold">2</span>
              <p><strong>너의 진짜 모습이 보여.</strong> AI가 대화 패턴에서 15가지 심리 축을 추출. 의식하지 못하는 것까지.</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-accent font-bold">3</span>
              <p><strong>다른 사람과 비교해봐.</strong> 친구, 연인, 가족, 동료 — 진짜 호환성이 보여.</p>
            </div>
          </div>
          <div className="mt-6 text-center">
            <Link
              href={`/scenario/${SCENARIO_ORDER[0]}`}
              className="inline-block px-8 py-3 bg-accent text-bg font-semibold rounded-xl hover:bg-accent2 transition"
            >
              첫 번째 대화 시작 →
            </Link>
            <p className="text-xs text-dim mt-2">약 5-7분 · 시나리오 1: 24시간 투자 제안</p>
          </div>
        </section>
      )}

      {/* ── 미완료 사용자 — 이어서 하기 배너 ── */}
      {completeness.scenarios_completed > 0 && completeness.scenarios_completed < 5 && (() => {
        const nextIdx = SCENARIO_ORDER.findIndex((sid) => !completedSet.has(sid));
        const nextSid = nextIdx >= 0 ? SCENARIO_ORDER[nextIdx] : null;
        if (!nextSid) return null;
        const nextCtx = SCENARIO_CONTEXTS[nextSid];
        return (
          <section className="mb-8">
            <Link
              href={`/scenario/${nextSid}`}
              className="block p-5 bg-card border border-accent/30 rounded-2xl hover:border-accent transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-accent text-xs font-semibold uppercase tracking-wider">이어서 하기</p>
                  <p className="font-bold mt-1">{SCENARIO_LABELS[nextSid]}</p>
                  <p className="text-xs text-dim mt-1">{nextCtx.estimatedMinutes} · {nextCtx.domainHint}</p>
                </div>
                <span className="text-accent text-2xl">→</span>
              </div>
            </Link>
          </section>
        );
      })()}

      {/* ─────────────────────────────────────
          내 Signal 링크 카드 (slug, 공유, 변경, referral 카운트)
      ──────────────────────────────────── */}
      <MyLinkCard
        userId={userId}
        initialSlug={userSlug}
        name={user.name}
        referredCount={referredCount}
      />

      {/* ─────────────────────────────────────
          추정 완성도 카드
      ──────────────────────────────────── */}
      <section className="mb-12">
        <div className="bg-card border border-line rounded-2xl p-6">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <p className="text-xs text-dim uppercase tracking-wider">너에 대한 추정 완성도</p>
              <p className="text-4xl font-bold mt-1 bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">
                {completeness.percent}%
              </p>
              <p className="text-sm text-accent3 mt-1">{completeness.level}</p>
            </div>
            <div className="text-right text-xs text-dim space-y-1">
              <p>시나리오 <span className="text-fg">{completeness.scenarios_completed}/{completeness.scenarios_total}</span></p>
              <p>측정 축 <span className="text-fg">{completeness.measured_axes}/{completeness.axes_total}</span></p>
              <p>고신뢰 축 <span className="text-fg">{completeness.high_confidence_axes}/{completeness.axes_total}</span></p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-accent2 transition-all"
              style={{ width: `${completeness.percent}%` }}
            />
          </div>

          {completeness.warning && (
            <p className="text-xs text-dim mt-3 leading-relaxed">{completeness.warning}</p>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────
          시나리오 목록
      ──────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4 text-accent">시나리오</h2>
        <div className="space-y-3">
          {SCENARIO_ORDER.map((sid) => {
            const isDone = completedSet.has(sid);
            const ctx = SCENARIO_CONTEXTS[sid];
            return (
              <Link
                key={sid}
                href={`/scenario/${sid}`}
                className="flex items-center justify-between p-4 bg-card border border-line rounded-xl hover:border-accent transition"
              >
                <div className="flex-1">
                  <p className="font-medium">{SCENARIO_LABELS[sid]}</p>
                  <p className="text-xs text-dim mt-1">
                    {ctx.estimatedMinutes} · {ctx.domainHint}
                  </p>
                </div>
                <div className="text-sm ml-4">
                  {isDone ? (
                    <span className="text-accent3">✓ 완료</span>
                  ) : (
                    <span className="text-dim">시작 →</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────
          결과 (1개 시나리오라도 완료하면 활성)
      ──────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4 text-accent">결과</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link
            href="/report"
            className={`block p-6 bg-card border border-line rounded-xl transition ${
              hasAnyData ? 'hover:border-accent3' : 'opacity-40 pointer-events-none'
            }`}
          >
            <p className="font-medium">내 분석 리포트</p>
            <p className="text-xs text-dim mt-2">
              {hasAnyData
                ? completeness.percent < 50
                  ? '아직 일부만 본 첫 인상'
                  : '15축 기반 자기 분석'
                : '시나리오 1개라도 완료하면 활성화'}
            </p>
          </Link>
          <Link
            href="/chemistry"
            className={`block p-6 bg-card border border-line rounded-xl transition ${
              hasAnyData ? 'hover:border-accent2' : 'opacity-40 pointer-events-none'
            }`}
          >
            <p className="font-medium">케미 테스트</p>
            <p className="text-xs text-dim mt-2">
              {hasAnyData
                ? '다른 사람과 비교 분석 (부분 데이터로도 가능)'
                : '시나리오 1개라도 완료하면 활성화'}
            </p>
          </Link>
        </div>
      </section>

      <section className="mb-12">
        <Link
          href="/history"
          className="block p-4 bg-card border border-line rounded-xl hover:border-accent transition text-center"
        >
          <p className="text-sm">📚 내 과거 내역 — 시나리오 + 벡터 + 케미 모두</p>
        </Link>
      </section>

      <footer className="mt-16 pt-6 border-t border-line text-xs text-dim text-center">
        <Link href="/logout" className="hover:text-accent">로그아웃 / 다른 ID로 시작</Link>
      </footer>
    </div>
  );
}
