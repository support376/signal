import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getUserBySlug, getIntegratedVector, listMyChemistries, getSelfReport } from '@/lib/db';
import { computeCompleteness } from '@/lib/integrator';
import { parseTags } from '@/lib/parse-tags';

export const dynamic = 'force-dynamic';

interface Props { params: { slug: string }; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await getUserBySlug(params.slug.toLowerCase());
  if (!user) return { title: 'Signalogy' };
  return {
    title: `@${user.slug} — Signalogy`,
    description: user.bio || `${user.name}와의 진짜 케미를 확인해봐.`,
    openGraph: { title: `@${user.slug} — Signalogy`, description: user.bio || `${user.name}와의 케미`, siteName: 'Signalogy', type: 'profile' },
  };
}

export default async function ProfilePage({ params }: Props) {
  const slug = params.slug.toLowerCase();
  const user = await getUserBySlug(slug);
  if (!user) notFound();

  const myId = cookies().get('signal_user_id')?.value;
  const isLoggedIn = !!myId;
  const isOwnProfile = myId === user.id;

  const [vector, selfReport] = await Promise.all([
    getIntegratedVector(user.id),
    getSelfReport(user.id),
  ]);
  const completeness = computeCompleteness(vector);

  let headline = '';
  let tags: string[] = [];
  if (selfReport) {
    const parsed = parseTags(selfReport);
    tags = parsed.tags;
    headline = parsed.body.match(/^##?\s*(.+)$/m)?.[1]?.replace(/\*/g, '') || '';
  }

  const sns = user.sns_links || {};
  const snsLinks: { platform: string; handle: string; url: string; verified: boolean; icon: string }[] = [];
  if (user.instagram) snsLinks.push({ platform: 'Instagram', handle: user.instagram, url: `https://instagram.com/${user.instagram}`, verified: !!(sns as any).instagram?.verified, icon: 'IG' });
  if ((sns as any).threads?.handle) snsLinks.push({ platform: 'Threads', handle: (sns as any).threads.handle, url: `https://threads.net/@${(sns as any).threads.handle}`, verified: (sns as any).threads.verified, icon: 'TH' });
  if ((sns as any).twitter?.handle) snsLinks.push({ platform: 'X', handle: (sns as any).twitter.handle, url: `https://x.com/${(sns as any).twitter.handle}`, verified: (sns as any).twitter.verified, icon: 'X' });
  if ((sns as any).youtube?.handle) snsLinks.push({ platform: 'YouTube', handle: (sns as any).youtube.handle, url: `https://youtube.com/@${(sns as any).youtube.handle}`, verified: (sns as any).youtube.verified, icon: 'YT' });
  if ((sns as any).tiktok?.handle) snsLinks.push({ platform: 'TikTok', handle: (sns as any).tiktok.handle, url: `https://tiktok.com/@${(sns as any).tiktok.handle}`, verified: (sns as any).tiktok.verified, icon: 'TT' });

  const isCreator = user.link_type === 'creator';
  const price = isCreator ? (Number(user.link_price) || 5) : 1;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-sm w-full">

        {isLoggedIn && !isOwnProfile && (
          <Link href="/dashboard" className="text-xs text-faint mb-6 block hover:text-dim">← Home</Link>
        )}

        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-full bg-card border border-line flex items-center justify-center text-2xl text-dim mb-4">
            {user.name[0]?.toUpperCase()}
          </div>

          <h1 className="text-xl font-bold text-fg">{user.name}</h1>
          <p className="text-xs text-faint mt-1">@{user.slug}</p>

          {user.bio && (
            <p className="text-sm text-dim mt-3 leading-relaxed">{user.bio}</p>
          )}

          {snsLinks.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {snsLinks.map((l) => (
                <a key={l.platform} href={l.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-line rounded-lg text-[11px] text-dim hover:text-fg hover:border-accent">
                  {l.icon} @{l.handle} {l.verified && '✓'}
                </a>
              ))}
            </div>
          )}

          {headline && (
            <p className="text-sm text-dim mt-5 leading-relaxed italic">"{headline}"</p>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {tags.map((t) => (
                <span key={t} className="text-[10px] text-faint border border-line rounded-full px-2 py-0.5">{t}</span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="p-3 border border-line rounded-xl text-center">
            <p className="text-lg font-bold text-fg">{completeness.percent}%</p>
            <p className="text-[10px] text-faint">signal</p>
          </div>
          <div className="p-3 border border-line rounded-xl text-center">
            <p className="text-lg font-bold text-fg">{completeness.scenarios_completed}/5</p>
            <p className="text-[10px] text-faint">시나리오</p>
          </div>
        </div>

        {isOwnProfile ? (
          <div className="text-center">
            <Link href="/profile" className="text-xs text-faint hover:text-dim">
              프로필 설정 →
            </Link>
          </div>
        ) : isLoggedIn ? (
          <div className="p-5 border border-line rounded-xl text-center">
            <p className="text-sm mb-4 text-fg">이 사람과 케미 확인하기</p>
            <Link href={`/chemistry/${user.id}`}
              className="block w-full py-3 border border-line text-fg rounded-xl hover:bg-card text-sm">
              {isCreator ? `$${price} — 케미 보기` : '케미 보기 →'}
            </Link>
            {isCreator && (
              <p className="text-[10px] text-faint mt-2">결제 — 준비 중</p>
            )}
          </div>
        ) : (
          <div className="p-5 border border-line rounded-xl text-center">
            <p className="text-sm mb-1 text-fg">{user.name}와의 진짜 케미 보기</p>
            <p className="text-xs text-dim mb-4">15분만 하면 결과가 열려.</p>
            <Link href={`/?ref=${user.slug}`}
              className="block w-full py-3 border border-line text-fg rounded-xl hover:bg-card text-sm">
              시작하기 →
            </Link>
          </div>
        )}

        <p className="text-center text-[10px] text-faint mt-8">SIGNALOGY</p>
      </div>
    </div>
  );
}
