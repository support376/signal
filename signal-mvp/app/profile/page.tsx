import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser, getCredits, countMyReferrals, getCompletedScenarios, getSelfReport, listMyChemistries } from '@/lib/db';
import { computeCompleteness } from '@/lib/integrator';
import { getIntegratedVector } from '@/lib/db';
import { SCENARIO_ORDER, SCENARIO_LABELS } from '@/lib/scenario-meta';
import ProfileEditor from './profile-editor';

export const dynamic = 'force-dynamic';

export default async function MorePage() {
  const userId = cookies().get('signal_user_id')?.value;
  if (!userId) redirect('/');
  const user = await getUser(userId);
  if (!user) redirect('/');

  const [credits, referredCount, completed, vector, chemistries] = await Promise.all([
    getCredits(userId),
    countMyReferrals(userId),
    getCompletedScenarios(userId),
    getIntegratedVector(userId),
    listMyChemistries(userId),
  ]);
  const completeness = computeCompleteness(vector);

  return (
    <div className="max-w-md mx-auto px-5 py-8 pb-20">
      <h1 className="text-lg font-bold mb-6">More</h1>

      {/* 프로필 편집 (client component) */}
      <ProfileEditor
        userId={userId}
        initialName={user.name}
        initialBio={user.bio || ''}
        initialInstagram={user.instagram || ''}
        initialSlug={user.slug || user.id}
        initialLinkType={(user.link_type as 'personal' | 'creator') || 'personal'}
        initialLinkPrice={Number(user.link_price) || 1}
        gender={user.gender || ''}
      />

      {/* 크레딧 */}
      <section className="p-4 border border-white/8 rounded-xl mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-white/20 font-mono">크레딧</p>
            <p className="text-2xl font-bold mt-1">{credits}</p>
          </div>
          <p className="text-[10px] text-white/20 text-right">케미 분석 1회 = 1<br/>친구 초대 = +1</p>
        </div>
      </section>

      {/* 초대 */}
      <section className="p-4 border border-white/8 rounded-xl mb-4">
        <div className="flex items-center justify-between">
          <p className="text-sm">초대한 사람</p>
          <p className="text-lg font-bold">{referredCount}명</p>
        </div>
      </section>

      {/* Signal 진행 */}
      <section className="p-4 border border-white/8 rounded-xl mb-4">
        <p className="text-[10px] text-white/20 font-mono mb-2">Signal</p>
        <div className="flex gap-1 mb-2">
          {SCENARIO_ORDER.map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full ${i < completed.length ? 'bg-white/50' : 'bg-white/8'}`} />
          ))}
        </div>
        <p className="text-xs text-white/30">{completeness.percent}% 완성</p>
        <Link href="/scenario" className="text-[10px] text-white/20 hover:text-white/40 mt-2 block">
          시나리오 기록 →
        </Link>
      </section>

      {/* Chemistry 이력 */}
      {chemistries.length > 0 && (
        <section className="p-4 border border-white/8 rounded-xl mb-4">
          <p className="text-[10px] text-white/20 font-mono mb-2">Chemistry 이력 ({chemistries.length}건)</p>
          {chemistries.slice(0, 3).map((c) => {
            const otherId = c.user_a_id !== userId ? c.user_a_id : c.user_b_id;
            return (
              <Link key={`${c.user_a_id}-${c.user_b_id}-${c.lens}`}
                href={`/chemistry/${otherId}/${c.lens}`}
                className="flex items-center justify-between py-1.5 text-xs hover:text-white/60 transition">
                <span className="text-white/30 font-mono">@{otherId} · {c.lens}</span>
                <span className="font-bold">{c.score}%</span>
              </Link>
            );
          })}
        </section>
      )}

      {/* 크리에이터 대시보드 (목업) */}
      {(user.link_type === 'creator') && (
        <section className="p-4 border border-white/8 rounded-xl mb-4">
          <p className="text-[10px] text-white/20 font-mono mb-2">Creator Dashboard</p>
          <div className="space-y-2 text-xs text-white/30">
            <div className="flex justify-between"><span>티어</span><span className="text-white/60">L0</span></div>
            <div className="flex justify-between"><span>총 거래</span><span className="text-white/60">0건</span></div>
            <div className="flex justify-between"><span>수익</span><span className="text-white/60">$0</span></div>
            <div className="flex justify-between"><span>출금 가능</span><span className="text-white/60">$0</span></div>
          </div>
          <div className="mt-3 p-3 border border-white/5 rounded-lg text-center">
            <p className="text-[10px] text-white/15 font-mono">출금 (Toss/PayPal) — 준비 중</p>
          </div>
        </section>
      )}

      {/* 서비스 */}
      <div className="space-y-2 mt-6">
        <Link href="/" className="block p-3 border border-white/5 rounded-xl text-xs text-white/25 hover:text-white/40 transition">
          Signalogy란?
        </Link>
        <Link href="/logout" className="block p-3 border border-white/5 rounded-xl text-xs text-red-400/40 hover:text-red-400/70 transition">
          로그아웃
        </Link>
      </div>
    </div>
  );
}
