import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser, getCredits, countMyReferrals, getIntegratedVector } from '@/lib/db';
import MyLinkCard from '@/app/components/my-link-card';
import ApiUsage from '@/app/components/api-usage';
import ProfileSettings from '@/app/components/profile-settings';

export const dynamic = 'force-dynamic';

export default async function MorePage() {
  const userId = cookies().get('signal_user_id')?.value;
  if (!userId) redirect('/');
  const user = await getUser(userId);
  if (!user) redirect('/');

  const [credits, referredCount, vector] = await Promise.all([
    getCredits(userId),
    countMyReferrals(userId),
    getIntegratedVector(userId),
  ]);

  const userSlug = user.slug || user.id;
  const isCreator = user.link_type === 'creator';

  return (
    <div className="max-w-md mx-auto px-5 py-8 pb-20">
      <p className="text-lg font-bold mb-6 text-fg">Signalogy</p>

      {/* 프로필 헤더 */}
      <section className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-card border border-line flex items-center justify-center text-dim">
          {user.name[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-fg">{user.name}</p>
          <p className="text-xs text-faint">@{userSlug}</p>
        </div>
      </section>

      {/* 크레딧 */}
      <section className="p-4 border border-line rounded-xl mb-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-fg">크레딧</p>
          <p className="text-xl font-bold text-fg">{credits}</p>
        </div>
        <p className="text-[10px] text-faint mt-1">케미 분석 1회 = 1 · 초대 = +1</p>
      </section>

      {/* 초대 */}
      <section className="p-4 border border-line rounded-xl mb-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-fg">초대</p>
          <p className="text-lg font-bold text-fg">{referredCount}명</p>
        </div>
        <MyLinkCard userId={userId} initialSlug={userSlug} name={user.name} referredCount={referredCount} />
      </section>

      {/* 통합 아코디언 설정 */}
      <section className="mb-3">
        <ProfileSettings
          userId={userId}
          initial={{
            email: user.email ?? null,
            birth_year: user.birth_year ?? null,
            gender: user.gender ?? null,
            nationality: user.nationality ?? null,
            location_current: user.location_current ?? null,
            search_visibility: user.search_visibility ?? 'public',
            gender_preference: user.gender_preference ?? 'any',
            age_range: user.age_range ?? null,
            privacy_settings: user.privacy_settings ?? {},
            instagram: user.instagram ?? null,
            sns_links: user.sns_links ?? null,
            fingerprint_enabled: !!user.fingerprint_enabled,
            hasVector: !!vector,
          }}
        />
      </section>

      {/* 크리에이터 */}
      <section className="p-4 border border-line rounded-xl mb-3">
        {isCreator ? (
          <>
            <p className="text-sm font-bold mb-3 text-fg">Creator ✓</p>
            <div className="space-y-2 text-xs text-dim">
              <div className="flex justify-between"><span>티어</span><span className="text-fg">L0 (0-9건)</span></div>
              <div className="flex justify-between"><span>총 거래</span><span className="text-fg">0건</span></div>
              <div className="flex justify-between"><span>레퍼럴 수익</span><span className="text-fg">$0</span></div>
            </div>
            <div className="mt-4 p-3 border border-line rounded-lg text-[10px] text-faint">
              <p className="mb-2">티어 수익 분배</p>
              <div className="space-y-1">
                <p>L0 (0-9건) — 0%</p>
                <p>L1 (10-99) — 30%</p>
                <p>L2 (100-999) — 40%</p>
                <p>L3 (1k-10k) — 50%</p>
                <p>L4 (10k-50k) — 60%</p>
                <p>L5 (50k+) — 70%</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm mb-2 text-fg">크리에이터 신청</p>
            <p className="text-xs text-dim leading-relaxed mb-4">
              크리에이터로 등록하면 팬들이 너와의 케미를 유료로 볼 수 있고,
              거래량에 따라 수익을 받을 수 있어.
            </p>
            <div className="p-3 border border-line rounded-lg text-xs text-dim space-y-2 mb-4">
              <p className="text-fg font-medium">신청 방법</p>
              <p>1. 너의 인스타그램 주소를 준비해</p>
              <p>2. 인스타그램에서 <span className="text-fg">@signalogy.official</span> 로 DM 보내</p>
              <p>3. DM에 너의 Signalogy ID <span className="text-fg">@{userSlug}</span> 를 적어</p>
              <p>4. 확인되면 크리에이터 프로필이 활성화돼</p>
            </div>
            <a href="https://instagram.com/signalogy.official" target="_blank" rel="noopener noreferrer"
              className="block text-center py-3 border border-line rounded-xl text-xs text-dim hover:text-fg hover:bg-card">
              @signalogy.official DM 보내기
            </a>
          </>
        )}
      </section>

      {/* API 사용량 */}
      <section className="p-4 border border-line rounded-xl mb-3">
        <ApiUsage />
      </section>

      <div className="space-y-2 mt-6">
        <Link href="/logout" className="block p-3 border border-line rounded-xl text-xs text-red-500 hover:text-red-600">
          로그아웃
        </Link>
      </div>
    </div>
  );
}
