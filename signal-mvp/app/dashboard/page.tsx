import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  getCompletedScenarios,
  getUser,
  getIntegratedVector,
  countMyReferrals,
  getSelfReport,
  listAllUsersWithVectors,
} from '@/lib/db';
import { computeCompleteness } from '@/lib/integrator';
import { computeChemistry } from '@/lib/chemistry-math';
import { SCENARIO_ORDER, SCENARIO_LABELS, SCENARIO_CONTEXTS } from '@/lib/scenario-meta';
import { parseTags } from '@/lib/parse-tags';
import MyLinkCard from '@/app/components/my-link-card';
import type { IntegratedVector } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const userId = cookies().get('signal_user_id')?.value;
  if (!userId) redirect('/');

  const user = await getUser(userId);
  if (!user) redirect('/');

  const [completed, vector, referredCount] = await Promise.all([
    getCompletedScenarios(userId),
    getIntegratedVector(userId),
    countMyReferrals(userId),
  ]);
  const completedSet = new Set(completed);
  const completeness = computeCompleteness(vector);
  const userSlug = user.slug || user.id;
  const scenariosDone = completeness.scenarios_completed;

  // 5/5 완료 시 — self-report + 케미 TOP 3
  let selfReport: string | null = null;
  let headline = '';
  let tags: string[] = [];
  let topMatches: { id: string; name: string; score: number }[] = [];

  if (scenariosDone >= 1 && vector) {
    selfReport = await getSelfReport(userId);
    if (selfReport) {
      const parsed = parseTags(selfReport);
      tags = parsed.tags;
      const headlineMatch = parsed.body.match(/^##?\s*(.+)$/m);
      headline = headlineMatch?.[1]?.replace(/\*/g, '') || '';
    }

    // 케미 TOP 3 (수학만, LLM 0)
    try {
      const allUsers = await listAllUsersWithVectors(userId);
      const scored = allUsers
        .filter((u) => u.vector)
        .map((u) => {
          const math = computeChemistry(vector, u.vector as IntegratedVector, 'friend');
          return { id: u.id, name: u.name, score: math.display };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      topMatches = scored;
    } catch {}
  }

  // 다음 미완료 시나리오
  const nextSid = SCENARIO_ORDER.find((sid) => !completedSet.has(sid));
  const nextCtx = nextSid ? SCENARIO_CONTEXTS[nextSid] : null;

  // ─────────────────────────────────────
  // STATE A: 새 사용자 (0/5)
  // ─────────────────────────────────────
  if (scenariosDone === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl font-bold mb-2">👋 환영해, {user.name}</h1>
          <p className="text-dim text-sm mb-10 leading-relaxed max-w-sm">
            Signalogy가 너의 signal을 읽어줄게.<br />
            정답은 없어. 느끼는 대로 답하면 돼.
          </p>

          <Link
            href={`/scenario/${SCENARIO_ORDER[0]}`}
            className="w-full max-w-xs block py-5 bg-accent text-bg text-center font-semibold rounded-2xl text-lg hover:bg-accent2 transition shadow-lg shadow-accent/20"
          >
            💬 첫 대화 시작
          </Link>

          <p className="text-xs text-dim mt-4">
            {SCENARIO_CONTEXTS[SCENARIO_ORDER[0]].estimatedMinutes} · {SCENARIO_LABELS[SCENARIO_ORDER[0]]}
          </p>

          <div className="mt-16 space-y-3 text-left w-full max-w-xs">
            {[
              { n: '1', t: 'AI와 카톡처럼 대화해' },
              { n: '2', t: '너의 15가지 심리 축이 보여' },
              { n: '3', t: '다른 사람과 진짜 호환성 분석' },
            ].map((s) => (
              <div key={s.n} className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs flex items-center justify-center font-bold">
                  {s.n}
                </span>
                <span className="text-dim">{s.t}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-dim mt-12">총 5개 대화 · 약 30-40분 · 한 번에 다 안 해도 돼</p>
        </div>

        <footer className="pt-6 text-center text-xs text-dim">
          <Link href="/logout" className="hover:text-accent">로그아웃</Link>
        </footer>
      </div>
    );
  }

  // ─────────────────────────────────────
  // STATE B: 진행 중 (1-4/5)
  // ─────────────────────────────────────
  if (scenariosDone < 5) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        {/* 헤더 + 진행 바 */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-dim mb-1">
              <span>추정 완성도</span>
              <span className="text-accent">{completeness.percent}%</span>
            </div>
            <div className="w-full h-2 bg-card rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent to-accent2 transition-all"
                style={{ width: `${completeness.percent}%` }}
              />
            </div>
            <p className="text-xs text-dim mt-1">{scenariosDone}/5 시나리오</p>
          </div>
        </header>

        {/* 이어서 하기 (최상단 CTA) */}
        {nextSid && nextCtx && (
          <section className="mb-8">
            <Link
              href={`/scenario/${nextSid}`}
              className="block p-6 bg-card border-2 border-accent/40 rounded-2xl hover:border-accent transition shadow-lg shadow-accent/10"
            >
              <p className="text-accent text-xs font-semibold uppercase tracking-wider mb-2">이어서 하기</p>
              <p className="text-xl font-bold">{SCENARIO_LABELS[nextSid]}</p>
              <p className="text-sm text-dim mt-2">{nextCtx.estimatedMinutes} · {nextCtx.domainHint}</p>
            </Link>
          </section>
        )}

        {/* 완료한 시나리오 (간략) */}
        <section className="mb-8">
          <p className="text-xs text-dim uppercase tracking-wider mb-3">완료한 시나리오</p>
          <div className="flex flex-wrap gap-2">
            {SCENARIO_ORDER.filter((sid) => completedSet.has(sid)).map((sid) => (
              <Link
                key={sid}
                href={`/scenario/${sid}/vector`}
                className="px-3 py-1.5 bg-accent3/10 border border-accent3/30 rounded-lg text-xs text-accent3 hover:bg-accent3/20 transition"
              >
                ✓ {SCENARIO_LABELS[sid].replace('시나리오 ', 'S')}
              </Link>
            ))}
          </div>
        </section>

        {/* 지금까지 보이는 너 (부분 미리보기) */}
        {headline && (
          <section className="mb-8 p-5 bg-card border border-line rounded-2xl">
            <p className="text-xs text-dim uppercase tracking-wider mb-2">지금까지 보이는 너</p>
            <p className="text-fg font-medium leading-relaxed">{headline}</p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {tags.map((t) => (
                  <span key={t} className="px-2 py-0.5 bg-accent/10 rounded-full text-xs text-accent">{t}</span>
                ))}
              </div>
            )}
            <p className="text-xs text-dim mt-3">나머지 시나리오를 풀면 더 깊은 분석이 나와.</p>
          </section>
        )}

        {/* 케미 미리보기 */}
        {topMatches.length > 0 && (
          <section className="mb-8">
            <p className="text-xs text-dim uppercase tracking-wider mb-3">케미 미리보기 (부분 데이터)</p>
            {topMatches.map((m) => (
              <Link
                key={m.id}
                href={`/chemistry/${m.id}/friend`}
                className="flex items-center justify-between p-3 bg-card border border-line rounded-xl mb-2 hover:border-accent2 transition"
              >
                <span className="text-sm">{m.name}</span>
                <span className="text-lg font-bold text-accent">{m.score}%</span>
              </Link>
            ))}
          </section>
        )}

        <footer className="mt-12 pt-6 border-t border-line text-xs text-dim text-center space-y-2">
          <Link href="/history" className="block hover:text-accent">📚 과거 내역</Link>
          <Link href="/chemistry" className="block hover:text-accent">👥 친구찾기</Link>
          <Link href="/logout" className="block hover:text-accent">로그아웃</Link>
        </footer>
      </div>
    );
  }

  // ─────────────────────────────────────
  // STATE C: 완료 (5/5)
  // ─────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      {/* 헤더 */}
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <p className="text-xs text-dim mt-1 font-mono">@{userSlug}</p>
        <p className="text-xs text-accent3 mt-2">✓ 5/5 완료 · 추정 완성도 {completeness.percent}%</p>
      </header>

      {/* 너의 Signalogy (headline + tags + CTA) */}
      <section className="mb-8">
        <div className="bg-card border border-line rounded-2xl p-8 text-center">
          <p className="text-xs text-dim uppercase tracking-wider mb-3">너의 Signalogy</p>
          {headline && (
            <h2 className="text-xl font-bold leading-snug bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent mb-4">
              {headline}
            </h2>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {tags.map((t) => (
                <span key={t} className="px-3 py-1 bg-accent/10 border border-accent/30 rounded-full text-xs text-accent">{t}</span>
              ))}
            </div>
          )}
          <Link
            href="/report"
            className="inline-block px-8 py-3 bg-accent text-bg font-semibold rounded-xl hover:bg-accent2 transition"
          >
            전체 분석 보기 →
          </Link>
        </div>
      </section>

      {/* 너와 가장 잘 맞는 사람 (케미 TOP 3) */}
      {topMatches.length > 0 && (
        <section className="mb-8">
          <p className="text-xs text-dim uppercase tracking-wider mb-3">너와 가장 잘 맞는 사람</p>
          <div className="space-y-2">
            {topMatches.map((m, i) => (
              <Link
                key={m.id}
                href={`/chemistry/${m.id}/friend`}
                className="flex items-center justify-between p-4 bg-card border border-line rounded-xl hover:border-accent2 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{['🥇', '🥈', '🥉'][i] || '·'}</span>
                  <span className="font-medium">{m.name}</span>
                </div>
                <span className={`text-2xl font-bold ${m.score >= 70 ? 'text-accent3' : m.score >= 50 ? 'text-accent' : 'text-amber-300'}`}>
                  {m.score}%
                </span>
              </Link>
            ))}
          </div>
          <Link href="/chemistry" className="block text-center text-xs text-accent mt-3 hover:underline">
            전체 목록 + 렌즈 변경 →
          </Link>
        </section>
      )}

      {/* 공유 */}
      <section className="mb-8">
        <MyLinkCard
          userId={userId}
          initialSlug={userSlug}
          name={user.name}
          referredCount={referredCount}
        />
      </section>

      {/* 하단 네비 */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link href="/history" className="p-4 bg-card border border-line rounded-xl text-center text-sm hover:border-accent transition">
          📚 과거 내역
        </Link>
        <Link href="/chemistry" className="p-4 bg-card border border-line rounded-xl text-center text-sm hover:border-accent2 transition">
          👥 친구찾기
        </Link>
      </div>

      <footer className="pt-6 border-t border-line text-xs text-dim text-center">
        <Link href="/logout" className="hover:text-accent">로그아웃</Link>
      </footer>
    </div>
  );
}
