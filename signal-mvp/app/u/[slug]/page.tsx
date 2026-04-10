import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getUserBySlug, getIntegratedVector, listMyChemistries, countMyReferrals, getSelfReport } from '@/lib/db';
import { computeCompleteness } from '@/lib/integrator';
import { parseTags } from '@/lib/parse-tags';

export const dynamic = 'force-dynamic';

interface Props { params: { slug: string }; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await getUserBySlug(params.slug.toLowerCase());
  if (!user) return { title: 'Signalogy' };
  const title = `@${user.slug} — Signalogy`;
  const desc = user.bio || `${user.name}와의 진짜 케미를 확인해봐.`;
  return {
    title, description: desc,
    openGraph: { title, description: desc, siteName: 'Signalogy', type: 'profile' },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const slug = params.slug.toLowerCase();
  const user = await getUserBySlug(slug);
  if (!user) notFound();

  const [vector, chemCount, selfReport] = await Promise.all([
    getIntegratedVector(user.id),
    listMyChemistries(user.id),
    getSelfReport(user.id),
  ]);
  const completeness = computeCompleteness(vector);

  // headline + tags from self-report
  let headline = '';
  let tags: string[] = [];
  if (selfReport) {
    const parsed = parseTags(selfReport);
    tags = parsed.tags;
    headline = parsed.body.match(/^##?\s*(.+)$/m)?.[1]?.replace(/\*/g, '') || '';
  }

  const isCreator = user.link_type === 'creator';
  const price = isCreator ? (Number(user.link_price) || 5) : 1;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-sm w-full">

        {/* 프로필 카드 */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-2xl font-mono text-white/60 mb-4">
            {user.name[0]?.toUpperCase()}
          </div>

          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-xs text-white/25 font-mono mt-1">@{user.slug}</p>

          {/* Bio */}
          {user.bio && (
            <p className="text-sm text-white/50 mt-3 leading-relaxed">{user.bio}</p>
          )}

          {/* SNS 링크들 */}
          {(() => {
            const sns = user.sns_links || {};
            const links: { platform: string; handle: string; url: string; verified: boolean; icon: string }[] = [];

            if (user.instagram) links.push({ platform: 'Instagram', handle: user.instagram, url: `https://instagram.com/${user.instagram}`, verified: !!(sns.instagram?.verified), icon: 'IG' });
            if (sns.threads?.handle) links.push({ platform: 'Threads', handle: sns.threads.handle, url: `https://threads.net/@${sns.threads.handle}`, verified: sns.threads.verified, icon: 'TH' });
            if (sns.twitter?.handle) links.push({ platform: 'X', handle: sns.twitter.handle, url: `https://x.com/${sns.twitter.handle}`, verified: sns.twitter.verified, icon: 'X' });
            if (sns.youtube?.handle) links.push({ platform: 'YouTube', handle: sns.youtube.handle, url: `https://youtube.com/@${sns.youtube.handle}`, verified: sns.youtube.verified, icon: 'YT' });
            if (sns.tiktok?.handle) links.push({ platform: 'TikTok', handle: sns.tiktok.handle, url: `https://tiktok.com/@${sns.tiktok.handle}`, verified: sns.tiktok.verified, icon: 'TT' });

            if (links.length === 0) return null;
            return (
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {links.map((l) => (
                  <a key={l.platform} href={l.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-white/8 rounded-lg text-[11px] text-white/40 hover:text-white/60 hover:border-white/15 transition font-mono">
                    {l.icon} @{l.handle} {l.verified && '✓'} ↗
                  </a>
                ))}
              </div>
            );
          })()}

          {/* Headline + Tags (있으면) */}
          {headline && (
            <p className="text-sm text-white/40 mt-4 leading-relaxed italic">"{headline}"</p>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {tags.map((t) => (
                <span key={t} className="text-[10px] text-white/20 border border-white/8 rounded-full px-2 py-0.5 font-mono">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="p-3 border border-white/5 rounded-xl text-center">
            <p className="text-lg font-bold">{completeness.percent}%</p>
            <p className="text-[10px] text-white/20">signal</p>
          </div>
          <div className="p-3 border border-white/5 rounded-xl text-center">
            <p className="text-lg font-bold">{chemCount.length}</p>
            <p className="text-[10px] text-white/20">chemistry</p>
          </div>
        </div>

        {/* CTA — 케미 보기 (결제 목업) */}
        <div className="p-5 border border-white/10 rounded-xl text-center mb-4">
          <p className="text-sm mb-1">
            {isCreator
              ? `${user.name}의 signal과 나의 케미`
              : `${user.name}와의 진짜 케미 보기`
            }
          </p>

          <Link
            href={`/?ref=${user.slug}`}
            className="block w-full py-3 border border-white/20 text-white rounded-xl hover:bg-white/5 transition mt-4 text-sm"
          >
            {isCreator ? `$${price} — 케미 확인하기` : '15분만 하면 결과가 열려 →'}
          </Link>

          {isCreator && (
            <p className="text-[10px] text-white/10 mt-2 font-mono">결제 — 준비 중 (Toss 연동 예정)</p>
          )}
        </div>

        {/* Signalogy 소개 */}
        <p className="text-center text-[10px] text-white/10 font-mono">
          Signalogy — 사주가 아닌, MBTI가 아닌, 너의 실제 선택.
        </p>
      </div>
    </div>
  );
}
