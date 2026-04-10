import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  getCompletedScenarios, getUser, getIntegratedVector,
  countMyReferrals, getSelfReport, listAllUsersWithVectors,
} from '@/lib/db';
import { computeCompleteness } from '@/lib/integrator';
import { computeChemistry } from '@/lib/chemistry-math';
import { SCENARIO_ORDER, SCENARIO_CONTEXTS } from '@/lib/scenario-meta';
import { parseTags } from '@/lib/parse-tags';
import type { IntegratedVector } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const userId = cookies().get('signal_user_id')?.value;
  if (!userId) redirect('/');
  const user = await getUser(userId);
  if (!user) redirect('/');

  const [completed, vector] = await Promise.all([
    getCompletedScenarios(userId),
    getIntegratedVector(userId),
  ]);
  const completedSet = new Set(completed);
  const completeness = computeCompleteness(vector);
  const done = completeness.scenarios_completed;
  const nextSid = SCENARIO_ORDER.find((sid) => !completedSet.has(sid));
  const nextCtx = nextSid ? SCENARIO_CONTEXTS[nextSid] : null;

  // 케미 TOP 3 (수학만)
  let topMatches: { id: string; name: string; score: number; headline?: string }[] = [];
  if (vector) {
    try {
      const all = await listAllUsersWithVectors(userId);
      topMatches = all
        .filter((u) => u.vector)
        .map((u) => ({ id: u.id, name: u.name, score: computeChemistry(vector, u.vector as IntegratedVector, 'romantic').display }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    } catch {}
  }

  // Self-report 요약
  let headline = '';
  let tags: string[] = [];
  const selfReport = vector ? await getSelfReport(userId) : null;
  if (selfReport) {
    const parsed = parseTags(selfReport);
    tags = parsed.tags;
    headline = parsed.body.match(/^##?\s*(.+)$/m)?.[1]?.replace(/\*/g, '') || '';
  }

  // ─────────────────────────────────────
  // STATE A: 새 사용자 (0/5)
  // ─────────────────────────────────────
  if (done === 0) {
    return (
      <div className="max-w-md mx-auto px-5 py-12 text-center">
        <h1 className="text-2xl font-bold mb-3">케미를 보려면<br />먼저 너의 signal을 읽어야 해.</h1>
        <p className="text-white/40 text-sm mb-10">카톡처럼 대화하면 돼. 15분이면 끝나.</p>

        <Link href={`/scenario/${SCENARIO_ORDER[0]}`}
          className="block w-full py-4 border border-white/20 text-white rounded-xl hover:bg-white/5 transition mb-4">
          시작할게 →
        </Link>

        {/* 잠긴 케미 미리보기 */}
        <div className="mt-12 p-6 border border-white/5 rounded-xl">
          <p className="text-[10px] text-white/20 font-mono mb-3">완성하면 이런 결과를 볼 수 있어</p>
          <div className="blur-[6px] select-none pointer-events-none">
            <p className="text-white/60 text-lg font-bold">나 × ???</p>
            <p className="text-white/40 text-3xl font-bold my-2">??%</p>
            <p className="text-white/30 text-sm">"서로를 향해 있지는..."</p>
          </div>
          <p className="text-[10px] text-white/15 mt-3 font-mono">🔒 signal 읽기 완료 후 공개</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────
  // STATE B: 진행 중 (1-4/5)
  // ─────────────────────────────────────
  if (done < 5) {
    return (
      <div className="max-w-md mx-auto px-5 py-8">
        {/* signal 진행 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            {SCENARIO_ORDER.map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full ${i < done ? 'bg-white/60' : 'bg-white/10'}`} />
            ))}
          </div>
          <p className="text-xs text-white/30 font-mono">signal 읽는 중 · {done}/5</p>
        </div>

        {/* 이어서 하기 */}
        {nextSid && nextCtx && (
          <Link href={`/scenario/${nextSid}`}
            className="block p-6 border border-white/15 rounded-xl hover:bg-white/[0.03] transition mb-8">
            <p className="text-sm text-white/50 mb-1">이어서</p>
            <p className="text-lg font-bold text-white">{nextCtx.domainHint}</p>
            <p className="text-xs text-white/30 mt-2">{nextCtx.estimatedMinutes}</p>
          </Link>
        )}

        {/* 잠긴 케미 미리보기 */}
        <div className="p-6 border border-white/5 rounded-xl mb-8">
          <div className="blur-[6px] select-none pointer-events-none">
            <p className="text-white/50 font-bold">나 × ???  —  ??%</p>
            <p className="text-white/30 text-sm mt-1">"이 결과를 보려면..."</p>
          </div>
          <p className="text-[10px] text-white/15 mt-3 font-mono">🔒 {5 - done}개 대화 더 하면 공개</p>
        </div>

        {/* 부분 케미 (있으면) */}
        {topMatches.length > 0 && (
          <div className="mb-8">
            <p className="text-[10px] text-white/20 font-mono mb-3">미리보기 (부분 데이터)</p>
            {topMatches.map((m) => (
              <Link key={m.id} href={`/chemistry/${m.id}/romantic`}
                className="flex items-center justify-between py-3 border-b border-white/5 hover:bg-white/[0.02] transition">
                <span className="text-sm text-white/60">{m.name}</span>
                <span className="text-lg font-bold text-white/40">{m.score}%</span>
              </Link>
            ))}
          </div>
        )}

        {/* 부분 self-report */}
        {headline && (
          <div className="p-5 border border-white/5 rounded-xl">
            <p className="text-[10px] text-white/20 font-mono mb-2">지금까지 보이는 너</p>
            <p className="text-sm text-white/60">{headline}</p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((t) => <span key={t} className="text-[10px] text-white/30 border border-white/10 rounded-full px-2 py-0.5">{t}</span>)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────
  // STATE C: 완료 (5/5) — 케미가 메인
  // ─────────────────────────────────────
  return (
    <div className="max-w-md mx-auto px-5 py-8">
      <p className="text-xs text-white/30 font-mono mb-8">signal 읽기 완료 ✓</p>

      {/* 메인 CTA: 상대에게 보내기 (커플 케미 흐름) */}
      <section className="mb-10 p-6 border border-white/10 rounded-xl">
        <p className="text-lg font-bold mb-2">이제 상대에게 보내.</p>
        <p className="text-sm text-white/40 mb-6">상대도 15분만 하면 둘의 진짜 케미가 열려.</p>

        <Link href="/chemistry"
          className="block w-full py-4 border border-white/20 text-white text-center rounded-xl hover:bg-white/5 transition mb-3">
          상대에게 링크 보내기 →
        </Link>
        <Link href="/chemistry"
          className="block text-center text-xs text-white/20 hover:text-white/40 transition">
          이미 한 사람이 있어? 케미 보기 →
        </Link>
      </section>

      {/* 케미 TOP 3 */}
      {topMatches.length > 0 && (
        <section className="mb-10">
          <p className="text-[10px] text-white/20 font-mono mb-3">너와 가장 잘 맞는 사람</p>
          {topMatches.map((m, i) => (
            <Link key={m.id} href={`/chemistry/${m.id}/romantic`}
              className="flex items-center justify-between py-3 border-b border-white/5 hover:bg-white/[0.02] transition">
              <div className="flex items-center gap-3">
                <span className="text-white/20 text-xs font-mono">{['01','02','03'][i]}</span>
                <span className="text-white/80">{m.name}</span>
              </div>
              <span className="text-xl font-bold text-white">{m.score}%</span>
            </Link>
          ))}
          <Link href="/chemistry" className="block text-xs text-white/20 mt-3 hover:text-white/40 transition">
            전체 목록 + 렌즈 변경 →
          </Link>
        </section>
      )}

      {/* 나의 signal (부산물 — 작게) */}
      <section className="mb-10 p-5 border border-white/5 rounded-xl">
        <p className="text-[10px] text-white/20 font-mono mb-2">나의 signal</p>
        {headline && <p className="text-sm text-white/60 mb-2">{headline}</p>}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.map((t) => <span key={t} className="text-[10px] text-white/25 border border-white/8 rounded-full px-2 py-0.5">{t}</span>)}
          </div>
        )}
        <Link href="/report" className="text-xs text-white/30 hover:text-white/50 transition">
          상세 보기 →
        </Link>
      </section>
    </div>
  );
}
