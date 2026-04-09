import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser, getCompletedScenarios } from '@/lib/db';
import { LENSES } from '@/lib/types';

export const dynamic = 'force-dynamic';

const LENS_LABELS: Record<string, { ko: string; desc: string }> = {
  friend: { ko: '친구', desc: '일상의 편안함, 갈등 회피, 지속성' },
  romantic: { ko: '연인', desc: '단기 끌림 + 장기 헌신, 친밀감' },
  family: { ko: '가족', desc: '부모↔자식, 형제, 친척 (방향 무관)' },
  work: { ko: '동료', desc: '동료·상사·부하·파트너, 일 중심' },
};

export default async function ChemistryLensPickerPage({
  params,
}: {
  params: { otherId: string };
}) {
  const myId = cookies().get('signal_user_id')?.value;
  if (!myId) redirect('/');

  const me = await getUser(myId);
  if (!me) redirect('/');

  const other = await getUser(params.otherId);
  if (!other) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link href="/chemistry" className="text-xs text-dim hover:text-accent">← 케미 목록</Link>
        <p className="mt-8 text-red-400">사용자를 찾을 수 없어.</p>
      </div>
    );
  }

  // 양쪽 모두 5/5 완료 확인
  const myCompleted = await getCompletedScenarios(myId);
  const otherCompleted = await getCompletedScenarios(other.id);

  if (myCompleted.length < 5 || otherCompleted.length < 5) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link href="/chemistry" className="text-xs text-dim hover:text-accent">← 케미 목록</Link>
        <div className="mt-8 p-6 bg-amber-900/20 border border-amber-700/40 rounded-xl text-sm">
          <p className="text-amber-300 font-semibold mb-2">아직 케미 분석이 불가능해</p>
          <p className="text-dim">
            나: {myCompleted.length}/5 · {other.name}: {otherCompleted.length}/5
          </p>
          <p className="text-dim mt-2">두 사람 모두 5개 시나리오를 완료해야 해.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link href="/chemistry" className="text-xs text-dim hover:text-accent">← 케미 목록</Link>

      <header className="mt-4 mb-8">
        <p className="text-xs text-dim uppercase tracking-wider">상대 선택됨</p>
        <h1 className="text-3xl font-bold mt-1">
          <span className="text-fg">{me.name}</span>
          <span className="text-dim mx-3">×</span>
          <span className="text-accent2">{other.name}</span>
        </h1>
        <p className="text-sm text-dim mt-2">이제 어떤 관계로 볼지 선택해.</p>
      </header>

      <div className="space-y-3">
        {LENSES.map((lens) => {
          const meta = LENS_LABELS[lens];
          return (
            <Link
              key={lens}
              href={`/chemistry/${other.id}/${lens}`}
              className="block p-5 bg-card border border-line rounded-xl hover:border-accent2 transition"
            >
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-lg font-semibold">{meta.ko}</p>
                  <p className="text-xs text-dim mt-1">{meta.desc}</p>
                </div>
                <p className="text-accent2 text-sm">분석 →</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
