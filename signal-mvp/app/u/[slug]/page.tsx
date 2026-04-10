import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  getUserBySlug,
  getIntegratedVector,
  listMyChemistries,
  countMyReferrals,
} from '@/lib/db';
import { computeCompleteness } from '@/lib/integrator';

export const dynamic = 'force-dynamic';

interface Props {
  params: { slug: string };
}

// Open Graph 메타 (카톡 / 트위터 / 인스타 미리보기)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await getUserBySlug(params.slug.toLowerCase());
  if (!user) {
    return { title: 'Signalogy — 사용자 없음' };
  }
  const title = `${user.name} — Signalogy`;
  const description = `${user.name}의 signal을 읽고, 진짜 호환성을 알아보세요.`;
  const url = `/u/${user.slug}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Signalogy',
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const slug = params.slug.toLowerCase();
  const user = await getUserBySlug(slug);
  if (!user) notFound();

  const vector = await getIntegratedVector(user.id);
  const completeness = computeCompleteness(vector);
  const chemistries = await listMyChemistries(user.id);
  const referredCount = await countMyReferrals(user.id);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* 프로필 카드 */}
        <div className="bg-card border border-line rounded-2xl p-8 text-center">
          <p className="text-xs text-dim uppercase tracking-wider mb-2">Signalogy</p>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">
            {user.name}
          </h1>
          <p className="text-sm text-dim mt-2 font-mono">@{user.slug}</p>

          {/* 통계 */}
          <div className="grid grid-cols-3 gap-3 mt-8 pt-6 border-t border-line">
            <div>
              <p className="text-2xl font-bold text-accent3">{completeness.percent}%</p>
              <p className="text-xs text-dim mt-1">완성도</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-accent3">{chemistries.length}</p>
              <p className="text-xs text-dim mt-1">케미 분석</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-accent3">{referredCount}</p>
              <p className="text-xs text-dim mt-1">초대한 사람</p>
            </div>
          </div>

          {/* CTA */}
          <Link
            href={`/?ref=${user.slug}`}
            className="mt-8 block w-full py-4 bg-accent text-bg font-semibold rounded-xl hover:bg-accent2 transition"
          >
            {user.name}와의 진짜 케미 보기 →
          </Link>

          <p className="text-xs text-white/30 mt-4 leading-relaxed">
            15분만 하면 {user.name}와의 진짜 케미가 열려.<br />
            MBTI가 아닌, 네가 실제로 한 선택으로.
          </p>
        </div>

        {/* 푸터 */}
        <p className="text-center text-xs text-dim mt-6">
          Signalogy — 너의 signal을 읽는다 ·{' '}
          <Link href="/" className="hover:text-accent">서비스 소개</Link>
        </p>
      </div>
    </div>
  );
}
