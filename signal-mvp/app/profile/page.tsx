import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser, getCredits, countMyReferrals, getCompletedScenarios, getSelfReport } from '@/lib/db';
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

  const [credits, referredCount, completed, vector] = await Promise.all([
    getCredits(userId),
    countMyReferrals(userId),
    getCompletedScenarios(userId),
    getIntegratedVector(userId),
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

      {/* Signal → Signal 탭으로 이동 */}
      <Link href="/scenario" className="block p-4 border border-white/8 rounded-xl mb-4 text-xs text-white/30 hover:text-white/50 transition">
        Signal 기록 보기 ({completeness.percent}%) →
      </Link>

      {/* Chemistry → Chemistry 탭으로 이동 */}
      <Link href="/chemistry" className="block p-4 border border-white/8 rounded-xl mb-4 text-xs text-white/30 hover:text-white/50 transition">
        Chemistry 이력 보기 →
      </Link>

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
