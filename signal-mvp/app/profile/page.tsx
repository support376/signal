import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser, getCredits, countMyReferrals, getIntegratedVector } from '@/lib/db';
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

  return (
    <div className="max-w-md mx-auto px-5 py-8 pb-20">
      <p className="text-lg font-bold mb-6 text-fg">Signalogy</p>

      <section className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-card border border-line flex items-center justify-center text-dim">
          {user.name[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-fg">{user.name}</p>
          <p className="text-xs text-faint">@{userSlug}</p>
        </div>
      </section>

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
          credits: credits ?? 0,
          referredCount: referredCount ?? 0,
          slug: userSlug,
          name: user.name,
          isCreator: user.link_type === 'creator',
        }}
      />

      <div className="mt-6">
        <Link href="/logout" className="block p-3 border border-line rounded-xl text-xs text-center text-red-500 hover:text-red-600">
          로그아웃
        </Link>
      </div>
    </div>
  );
}
