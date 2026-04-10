import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser, getCredits, countMyReferrals } from '@/lib/db';
import MyLinkCard from '@/app/components/my-link-card';

export const dynamic = 'force-dynamic';

export default async function MorePage() {
  const userId = cookies().get('signal_user_id')?.value;
  if (!userId) redirect('/');
  const user = await getUser(userId);
  if (!user) redirect('/');

  const [credits, referredCount] = await Promise.all([
    getCredits(userId),
    countMyReferrals(userId),
  ]);

  const userSlug = user.slug || user.id;
  const isCreator = user.link_type === 'creator';

  return (
    <div className="max-w-md mx-auto px-5 py-8 pb-20">
      <p className="text-lg font-bold mb-6">Signalogy</p>

      {/* 프로필 */}
      <section className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-mono text-white/50">
          {user.name[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-bold">{user.name}</p>
          <p className="text-xs text-white/25 font-mono">@{userSlug}</p>
        </div>
      </section>

      {/* 크레딧 */}
      <section className="p-4 border border-white/8 rounded-xl mb-3">
        <div className="flex items-center justify-between">
          <p className="text-sm">크레딧</p>
          <p className="text-xl font-bold">{credits}</p>
        </div>
        <p className="text-[10px] text-white/20 mt-1">케미 분석 1회 = 1 · 초대 = +1</p>
      </section>

      {/* 초대 */}
      <section className="p-4 border border-white/8 rounded-xl mb-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm">초대</p>
          <p className="text-lg font-bold">{referredCount}명</p>
        </div>
        <MyLinkCard userId={userId} initialSlug={userSlug} name={user.name} referredCount={referredCount} />
      </section>

      {/* SNS 연결 */}
      <section className="p-4 border border-white/8 rounded-xl mb-3">
        <p className="text-sm mb-3">SNS 연결</p>
        <p className="text-[10px] text-white/20 mb-3">
          연결하면 공개 프로필에 표시돼. 인증하면 ✓ 표시.
        </p>
        <div className="space-y-2 text-xs">
          {[
            { key: 'instagram', label: 'Instagram', prefix: 'instagram.com/', value: user.instagram },
            { key: 'threads', label: 'Threads', prefix: 'threads.net/@', value: (user.sns_links as any)?.threads?.handle },
            { key: 'twitter', label: 'X (Twitter)', prefix: 'x.com/', value: (user.sns_links as any)?.twitter?.handle },
            { key: 'youtube', label: 'YouTube', prefix: 'youtube.com/@', value: (user.sns_links as any)?.youtube?.handle },
            { key: 'tiktok', label: 'TikTok', prefix: 'tiktok.com/@', value: (user.sns_links as any)?.tiktok?.handle },
          ].map((s) => (
            <div key={s.key} className="flex items-center justify-between py-1.5">
              <span className="text-white/40">{s.label}</span>
              {s.value ? (
                <span className="text-white/60 font-mono">@{s.value} {(user.sns_links as any)?.[s.key]?.verified ? '✓' : ''}</span>
              ) : (
                <span className="text-white/15">—</span>
              )}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-white/10 mt-3 leading-relaxed">
          SNS 등록/수정: <span className="text-white/25 font-mono">@signalogy.official</span> 에 DM으로 요청.
          Signalogy ID와 SNS 핸들을 보내면 연결해줄게.
        </p>
      </section>

      {/* 크리에이터 */}
      <section className="p-4 border border-white/8 rounded-xl mb-3">
        {isCreator ? (
          <>
            <p className="text-sm font-bold mb-3">Creator ✓</p>
            <div className="space-y-2 text-xs text-white/40">
              <div className="flex justify-between"><span>티어</span><span className="text-white/70">L0 (0-9건)</span></div>
              <div className="flex justify-between"><span>총 거래</span><span className="text-white/70">0건</span></div>
              <div className="flex justify-between"><span>레퍼럴 수익</span><span className="text-white/70">$0</span></div>
            </div>
            <div className="mt-4 p-3 border border-white/5 rounded-lg text-[10px] text-white/20">
              <p className="mb-2">티어 수익 분배</p>
              <div className="space-y-1 font-mono">
                <p>L0 (0-9건) — 0%</p>
                <p>L1 (10-99) — 30%</p>
                <p>L2 (100-999) — 40%</p>
                <p>L3 (1k-10k) — 50%</p>
                <p>L4 (10k-50k) — 60%</p>
                <p>L5 (50k+) — 70%</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="p-3 border border-white/5 rounded-lg">
                <p className="text-[10px] text-white/20 mb-1">계좌 등록 (한국)</p>
                <p className="text-[10px] text-white/10 font-mono">준비 중 — Toss 연동 예정</p>
              </div>
              <div className="p-3 border border-white/5 rounded-lg">
                <p className="text-[10px] text-white/20 mb-1">PayPal</p>
                <p className="text-[10px] text-white/10 font-mono">준비 중</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm mb-2">크리에이터 신청</p>
            <p className="text-xs text-white/30 leading-relaxed mb-4">
              크리에이터로 등록하면 팬들이 너와의 케미를 유료로 볼 수 있고,
              거래량에 따라 수익을 받을 수 있어.
            </p>
            <div className="p-3 border border-white/5 rounded-lg text-xs text-white/30 space-y-2 mb-4">
              <p className="text-white/50 font-medium">신청 방법</p>
              <p>1. 너의 인스타그램 주소를 준비해</p>
              <p>2. 인스타그램에서 <span className="text-white/60 font-mono">@signalogy.official</span> 로 DM 보내</p>
              <p>3. DM에 너의 Signalogy ID <span className="text-white/60 font-mono">@{userSlug}</span> 를 적어</p>
              <p>4. 확인되면 크리에이터 프로필이 활성화돼</p>
            </div>
            <a href="https://instagram.com/signalogy.official" target="_blank" rel="noopener noreferrer"
              className="block text-center py-3 border border-white/15 rounded-xl text-xs text-white/50 hover:text-white/70 hover:bg-white/[0.03] transition">
              @signalogy.official DM 보내기 ↗
            </a>
          </>
        )}
      </section>

      {/* 하단 */}
      <div className="space-y-2 mt-6">
        <Link href="/logout" className="block p-3 border border-white/5 rounded-xl text-xs text-red-400/30 hover:text-red-400/60 transition">
          로그아웃
        </Link>
      </div>
    </div>
  );
}
