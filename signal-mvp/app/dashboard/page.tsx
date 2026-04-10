import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  getCompletedScenarios, getUser, getIntegratedVector,
  getSelfReport, listAllUsersWithVectors, recentUsers,
} from '@/lib/db';
import { computeCompleteness } from '@/lib/integrator';
import { computeChemistry } from '@/lib/chemistry-math';
import { SCENARIO_ORDER, SCENARIO_CONTEXTS } from '@/lib/scenario-meta';
import { parseTags } from '@/lib/parse-tags';
import type { IntegratedVector } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const userId = cookies().get('signal_user_id')?.value;
  if (!userId) redirect('/');
  const user = await getUser(userId);
  if (!user) redirect('/');

  const [completed, vector, recent] = await Promise.all([
    getCompletedScenarios(userId),
    getIntegratedVector(userId),
    recentUsers(userId, 8),
  ]);
  const completedSet = new Set(completed);
  const completeness = computeCompleteness(vector);
  const done = completeness.scenarios_completed;
  const nextSid = SCENARIO_ORDER.find((sid) => !completedSet.has(sid));
  const nextCtx = nextSid ? SCENARIO_CONTEXTS[nextSid] : null;

  // TOP 매칭 (수학만)
  let topMatches: { id: string; slug: string; score: number }[] = [];
  if (vector) {
    try {
      const all = await listAllUsersWithVectors(userId);
      topMatches = all
        .filter((u) => u.vector)
        .map((u) => ({
          id: u.id,
          slug: u.slug || u.id,
          score: computeChemistry(vector, u.vector as IntegratedVector, 'romantic').display,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    } catch {}
  }

  // ─── 미완료 (0-4/5) ───
  if (done < 5) {
    return (
      <div className="max-w-md mx-auto px-5 py-8 pb-20">
        {/* Signal 진행 */}
        <div className="mb-8">
          <div className="flex gap-1.5 mb-2">
            {SCENARIO_ORDER.map((_, i) => (
              <div key={i} className={`flex-1 h-1 rounded-full ${i < done ? 'bg-white/50' : 'bg-white/8'}`} />
            ))}
          </div>
          <p className="text-xs text-white/25 font-mono">signal {done}/5</p>
        </div>

        {done === 0 ? (
          <div className="text-center mb-10">
            <p className="text-lg font-bold mb-2">케미를 보려면</p>
            <p className="text-lg font-bold text-white/50 mb-6">먼저 너의 signal을 읽어야 해.</p>
            <Link href={`/scenario/${SCENARIO_ORDER[0]}`}
              className="inline-block px-8 py-3 border border-white/20 text-white rounded-xl hover:bg-white/5 transition">
              시작 →
            </Link>
          </div>
        ) : (
          nextSid && nextCtx && (
            <Link href={`/scenario/${nextSid}`}
              className="block p-5 border border-white/10 rounded-xl hover:bg-white/[0.02] transition mb-8">
              <p className="text-xs text-white/30 mb-1">이어서</p>
              <p className="font-bold">{nextCtx.domainHint}</p>
              <p className="text-[10px] text-white/20 mt-1">{nextCtx.estimatedMinutes} · {5 - done}개 남음</p>
            </Link>
          )
        )}

        {/* 잠긴 미리보기 */}
        <div className="p-5 border border-white/5 rounded-xl mb-10">
          <div className="blur-[6px] select-none pointer-events-none text-center">
            <p className="text-white/40 font-bold">@??? — ??%</p>
          </div>
          <p className="text-[10px] text-white/10 mt-2 font-mono text-center">🔒 {5 - done}개 더 하면 공개</p>
        </div>

        {/* 최근 가입 */}
        {recent.length > 0 && (
          <div>
            <p className="text-[10px] text-white/15 font-mono mb-3">최근 가입</p>
            {recent.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b border-white/3">
                <span className="text-xs text-white/30 font-mono">@{u.slug || u.id}</span>
                <span className="text-[10px] text-white/10">{u.gender === 'M' ? '♂' : u.gender === 'F' ? '♀' : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── 완료 (5/5) ───
  return (
    <div className="max-w-md mx-auto px-5 py-8 pb-20">
      <p className="text-[10px] text-white/15 font-mono mb-6">signal ✓</p>

      {/* 상대에게 보내기 */}
      <section className="p-5 border border-white/10 rounded-xl mb-10">
        <p className="font-bold mb-1">상대에게 보내.</p>
        <p className="text-xs text-white/30 mb-4">15분만 하면 둘의 케미가 열려.</p>
        <Link href="/chemistry"
          className="block text-center py-3 border border-white/15 text-white/80 rounded-xl hover:bg-white/5 transition text-sm">
          링크 보내기 →
        </Link>
      </section>

      {/* TOP 매칭 — @id 기준, % 유혹 */}
      {topMatches.length > 0 && (
        <section className="mb-10">
          <p className="text-[10px] text-white/15 font-mono mb-4">너와 가장 잘 맞는 사람</p>
          {topMatches.map((m, i) => (
            <Link key={m.id} href={`/chemistry/${m.id}`}
              className="flex items-center justify-between py-3 border-b border-white/5 hover:bg-white/[0.02] transition">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-white/15 font-mono w-5">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-sm text-white/60 font-mono">@{m.slug}</span>
              </div>
              <span className="text-xl font-bold text-white">{m.score}%</span>
            </Link>
          ))}
        </section>
      )}

      {/* 최근 가입 */}
      {recent.length > 0 && (
        <section>
          <p className="text-[10px] text-white/15 font-mono mb-3">최근 가입</p>
          {recent.map((u) => (
            <div key={u.id} className="flex items-center justify-between py-2 border-b border-white/3">
              <span className="text-xs text-white/25 font-mono">@{u.slug || u.id}</span>
              <span className="text-[10px] text-white/10">{u.gender === 'M' ? '♂' : u.gender === 'F' ? '♀' : ''}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
