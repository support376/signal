import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  getUser,
  getCompletedScenarios,
  getIntegratedVector,
  getCredits,
  countMyReferrals,
  getSelfReport,
  listMyChemistries,
} from '@/lib/db';
import { computeCompleteness } from '@/lib/integrator';
import { parseTags } from '@/lib/parse-tags';
import { SCENARIO_ORDER, SCENARIO_LABELS } from '@/lib/scenario-meta';
import MyLinkCard from '@/app/components/my-link-card';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const userId = cookies().get('signal_user_id')?.value;
  if (!userId) redirect('/');

  const user = await getUser(userId);
  if (!user) redirect('/');

  const [completed, vector, credits, referredCount, selfReport, chemistries] = await Promise.all([
    getCompletedScenarios(userId),
    getIntegratedVector(userId),
    getCredits(userId),
    countMyReferrals(userId),
    getSelfReport(userId),
    listMyChemistries(userId),
  ]);

  const completeness = computeCompleteness(vector);
  const userSlug = user.slug || user.id;

  // self-report에서 headline + tags 추출
  let headline = '';
  let tags: string[] = [];
  if (selfReport) {
    const parsed = parseTags(selfReport);
    tags = parsed.tags;
    const hm = parsed.body.match(/^##?\s*(.+)$/m);
    headline = hm?.[1]?.replace(/\*/g, '') || '';
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* ── 프로필 헤더 ── */}
      <section className="text-center mb-10">
        <div className="w-20 h-20 mx-auto rounded-full glass glow-cyan flex items-center justify-center text-2xl font-mono text-accent mb-4">
          {user.name[0]?.toUpperCase()}
        </div>
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <p className="text-xs text-dim font-mono mt-1">@{userSlug}</p>

        {headline && (
          <p className="text-sm text-accent/80 mt-3 leading-relaxed max-w-xs mx-auto">{headline}</p>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            {tags.map((t) => (
              <span key={t} className="px-2 py-0.5 text-[10px] text-accent/70 border border-accent/20 rounded-full font-mono">{t}</span>
            ))}
          </div>
        )}
      </section>

      {/* ── 크레딧 ── */}
      <section className="glass rounded-2xl p-5 mb-6 glow-cyan">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-dim font-mono uppercase tracking-wider">크레딧</p>
            <p className="text-3xl font-bold text-accent mt-1">{credits}</p>
          </div>
          <div className="text-right text-xs text-dim">
            <p>케미 분석 1회 = 1 크레딧</p>
            <p className="text-accent/60 mt-1">친구 초대하면 +1</p>
          </div>
        </div>
      </section>

      {/* ── 추정 완성도 ── */}
      <section className="glass rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-dim font-mono uppercase tracking-wider">추정 완성도</p>
          <p className="text-lg font-bold text-accent">{completeness.percent}%</p>
        </div>
        <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden mb-2">
          <div className="h-full bg-accent transition-all" style={{ width: `${completeness.percent}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-[10px] text-dim text-center">
          <span>시나리오 {completeness.scenarios_completed}/5</span>
          <span>측정 축 {completeness.measured_axes}/15</span>
          <span>고신뢰 {completeness.high_confidence_axes}/15</span>
        </div>
      </section>

      {/* ── 내 Signalogy 링크 ── */}
      <MyLinkCard userId={userId} initialSlug={userSlug} name={user.name} referredCount={referredCount} />

      {/* ── 히스토리 ── */}
      <section className="mb-6">
        <p className="text-[10px] text-dim font-mono uppercase tracking-wider mb-3">히스토리</p>
        <div className="space-y-2">
          {/* 시나리오 */}
          <div className="glass rounded-xl p-4">
            <p className="text-xs text-dim mb-2">시나리오</p>
            <div className="flex flex-wrap gap-1.5">
              {SCENARIO_ORDER.map((sid) => {
                const done = completed.includes(sid);
                return (
                  <Link
                    key={sid}
                    href={done ? `/scenario/${sid}/vector` : `/scenario/${sid}`}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono ${
                      done ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-bg text-dim border border-line'
                    }`}
                  >
                    {done ? '✓' : '○'} {SCENARIO_LABELS[sid].replace('시나리오 ', '')}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Self-report */}
          {selfReport && (
            <Link href="/report" className="block glass rounded-xl p-4 hover:border-accent/20 transition">
              <p className="text-xs text-dim">자기 분석</p>
              <p className="text-sm text-fg mt-1 truncate">{headline || '생성됨'}</p>
            </Link>
          )}

          {/* Chemistry */}
          {chemistries.length > 0 && (
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-dim mb-2">케미 분석 ({chemistries.length}건)</p>
              {chemistries.slice(0, 5).map((c) => {
                const otherName = c.user_a_id !== userId ? c.user_a_name : c.user_b_name;
                const otherId = c.user_a_id !== userId ? c.user_a_id : c.user_b_id;
                return (
                  <Link
                    key={`${c.user_a_id}-${c.user_b_id}-${c.lens}`}
                    href={`/chemistry/${otherId}/${c.lens}`}
                    className="flex items-center justify-between py-1.5 text-xs hover:text-accent transition"
                  >
                    <span className="text-dim">{otherName} · {c.lens}</span>
                    <span className="font-mono font-bold text-accent">{c.score}%</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── 서비스 ── */}
      <section className="space-y-2 mb-6">
        <p className="text-[10px] text-dim font-mono uppercase tracking-wider mb-3">서비스</p>
        <Link href="/" className="block glass rounded-xl p-4 text-xs text-dim hover:text-accent transition">
          Signalogy란?
        </Link>
        <Link href="/logout" className="block glass rounded-xl p-4 text-xs text-red-400/70 hover:text-red-400 transition">
          로그아웃
        </Link>
      </section>
    </div>
  );
}
