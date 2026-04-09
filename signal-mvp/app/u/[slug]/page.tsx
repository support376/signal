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
    return { title: 'Signal — 사용자 없음' };
  }
  const title = `${user.name} — Signal`;
  const description = `${user.name}와 진짜 호환성을 알아보세요. 잠재의식 + 케미 분석.`;
  const url = `/u/${user.slug}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Signal',
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
          <p className="text-xs text-dim uppercase tracking-wider mb-2">Signal</p>
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
            {user.name}와 케미 분석 시작 →
          </Link>

          <p className="text-xs text-dim mt-4 leading-relaxed">
            가입 후 5개 시나리오 (각 5~10분) 대화 → 자동으로 {user.name}와 케미 분석.
          </p>
        </div>

        {/* 푸터 */}
        <p className="text-center text-xs text-dim mt-6">
          Signal — 잠재의식 + 케미 분석 ·{' '}
          <Link href="/" className="hover:text-accent">서비스 소개</Link>
        </p>
      </div>
    </div>
  );
}
