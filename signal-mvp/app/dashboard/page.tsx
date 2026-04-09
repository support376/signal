import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCompletedScenarios, getUser } from '@/lib/db';
import { SCENARIO_ORDER, SCENARIO_LABELS } from '@/lib/prompts/scenarios';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const userId = cookies().get('signal_user_id')?.value;
  if (!userId) redirect('/');

  const user = await getUser(userId);
  if (!user) redirect('/');

  const completed = await getCompletedScenarios(userId);
  const completedSet = new Set(completed);
  const allDone = completed.length >= 5;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <header className="mb-12">
        <p className="text-xs text-dim uppercase tracking-wider">로그인됨</p>
        <h1 className="text-3xl font-bold mt-1">{user.name}</h1>
        <p className="text-sm text-dim mt-2">
          진행 상태: <span className="text-accent3">{completed.length}/5</span> 시나리오 완료
        </p>
      </header>

      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4 text-accent">시나리오</h2>
        <div className="space-y-3">
          {SCENARIO_ORDER.map((sid, i) => {
            const isDone = completedSet.has(sid);
            return (
              <Link
                key={sid}
                href={`/scenario/${sid}`}
                className="flex items-center justify-between p-4 bg-card border border-line rounded-xl hover:border-accent transition"
              >
                <div>
                  <p className="font-medium">{SCENARIO_LABELS[sid]}</p>
                  <p className="text-xs text-dim mt-1">5턴 대화</p>
                </div>
                <div className="text-sm">
                  {isDone ? (
                    <span className="text-accent3">✓ 완료</span>
                  ) : (
                    <span className="text-dim">시작 →</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4 text-accent">결과</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link
            href="/report"
            className={`block p-6 bg-card border border-line rounded-xl transition ${
              allDone ? 'hover:border-accent3' : 'opacity-40 pointer-events-none'
            }`}
          >
            <p className="font-medium">내 분석 리포트</p>
            <p className="text-xs text-dim mt-2">
              {allDone ? '15축 기반 자기 분석' : '5개 시나리오 완료 후 활성화'}
            </p>
          </Link>
          <Link
            href="/chemistry"
            className={`block p-6 bg-card border border-line rounded-xl transition ${
              allDone ? 'hover:border-accent2' : 'opacity-40 pointer-events-none'
            }`}
          >
            <p className="font-medium">케미 테스트</p>
            <p className="text-xs text-dim mt-2">
              {allDone ? '다른 사람과 비교 분석' : '5개 시나리오 완료 후 활성화'}
            </p>
          </Link>
        </div>
      </section>

      <footer className="mt-16 pt-6 border-t border-line text-xs text-dim text-center">
        <Link href="/" className="hover:text-accent">로그아웃 / 다른 ID로 시작</Link>
      </footer>
    </div>
  );
}
