import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { listUsers, getUser, getCompletedScenarios } from '@/lib/db';
import { LENSES } from '@/lib/types';

export const dynamic = 'force-dynamic';

const LENS_LABELS: Record<string, string> = {
  friend: '친구',
  romantic: '연인',
  family: '가족',
  work: '동료',
};

export default async function ChemistryListPage() {
  const userId = cookies().get('signal_user_id')?.value;
  if (!userId) redirect('/');

  const me = await getUser(userId);
  if (!me) redirect('/');

  const allUsers = await listUsers(userId);
  // 5개 시나리오 모두 완료한 사용자만
  const usersWithVector: { id: string; name: string }[] = [];
  for (const u of allUsers) {
    const completed = await getCompletedScenarios(u.id);
    if (completed.length >= 5) usersWithVector.push(u);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/dashboard" className="text-xs text-dim hover:text-accent">← 대시보드</Link>

      <h1 className="text-3xl font-bold mt-4">케미 테스트</h1>
      <p className="text-sm text-dim mt-2">상대방을 선택하고 렌즈를 골라.</p>

      {usersWithVector.length === 0 && (
        <div className="mt-8 p-6 bg-card border border-line rounded-xl text-center text-dim">
          아직 5개 시나리오를 완료한 다른 사용자가 없어. 친구가 풀고 오면 여기에 표시돼.
        </div>
      )}

      <div className="mt-8 space-y-3">
        {usersWithVector.map((u) => (
          <div key={u.id} className="bg-card border border-line rounded-xl p-5">
            <div className="flex items-baseline justify-between mb-3">
              <p className="font-semibold text-lg">{u.name}</p>
              <p className="text-xs text-dim">{u.id}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {LENSES.map((lens) => (
                <Link
                  key={lens}
                  href={`/chemistry/${u.id}/${lens}`}
                  className="text-center py-2 px-3 bg-bg border border-line rounded-lg text-sm hover:border-accent2 transition"
                >
                  {LENS_LABELS[lens]}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
