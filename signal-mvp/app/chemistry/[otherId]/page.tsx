import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser, getCompletedScenarios } from '@/lib/db';
import { LENSES } from '@/lib/types';

export const dynamic = 'force-dynamic';

const LENS_META: Record<string, { ko: string; desc: string; emoji: string }> = {
  romantic: { ko: '연인', desc: '단기 끌림부터 장기 헌신까지', emoji: '♡' },
  friend: { ko: '친구', desc: '일상의 편안함, 갈등 회피, 지속성', emoji: '○' },
  family: { ko: '가족', desc: '부모↔자식, 형제, 친척', emoji: '△' },
  work: { ko: '동료', desc: '프로젝트, 상사, 파트너', emoji: '□' },
};

export default async function ChemistryLensPage({ params }: { params: { otherId: string } }) {
  const myId = cookies().get('signal_user_id')?.value;
  if (!myId) redirect('/');

  const [me, other] = await Promise.all([getUser(myId), getUser(params.otherId)]);
  if (!me) redirect('/');
  if (!other) {
    return (
      <div className="max-w-md mx-auto px-5 py-12 text-center">
        <p className="text-white/40">사용자를 찾을 수 없어.</p>
        <Link href="/chemistry" className="text-xs text-white/20 mt-4 block">← 돌아가기</Link>
      </div>
    );
  }

  const [myCompleted, otherCompleted] = await Promise.all([
    getCompletedScenarios(myId),
    getCompletedScenarios(other.id),
  ]);

  const isPartial = myCompleted.length < 5 || otherCompleted.length < 5;

  return (
    <div className="max-w-md mx-auto px-5 py-8 pb-20">
      <Link href="/chemistry" className="text-xs text-white/20 hover:text-white/40">← Chemistry</Link>

      {/* 두 사람 */}
      <div className="text-center mt-6 mb-10">
        <p className="text-2xl font-bold">
          <span className="text-white">{me.name}</span>
          <span className="text-white/20 mx-3">×</span>
          <span className="text-white/70">{other.name}</span>
        </p>
        <p className="text-xs text-white/20 font-mono mt-2">
          {myCompleted.length}/5 × {otherCompleted.length}/5
        </p>
        {isPartial && (
          <p className="text-[10px] text-white/15 mt-2">부분 데이터 — 정확도 낮을 수 있음</p>
        )}
      </div>

      {/* 렌즈 선택 */}
      <p className="text-xs text-white/30 mb-4">어떤 관계로 볼까?</p>

      <div className="space-y-3">
        {LENSES.map((lens) => {
          const meta = LENS_META[lens];
          return (
            <Link
              key={lens}
              href={`/chemistry/${other.id}/${lens}`}
              className="block p-5 border border-white/8 rounded-xl hover:border-white/20 hover:bg-white/[0.02] transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-lg text-white/30">{meta.emoji}</span>
                  <div>
                    <p className="font-medium text-white/90">{meta.ko}</p>
                    <p className="text-[11px] text-white/30 mt-0.5">{meta.desc}</p>
                  </div>
                </div>
                <span className="text-white/15">→</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
