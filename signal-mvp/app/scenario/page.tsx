import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCompletedScenarios, getTurns } from '@/lib/db';
import { SCENARIO_ORDER, SCENARIO_LABELS, SCENARIO_CONTEXTS } from '@/lib/scenario-meta';
import type { ScenarioId } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ScenarioListPage() {
  const userId = cookies().get('signal_user_id')?.value;
  if (!userId) redirect('/');

  const completed = await getCompletedScenarios(userId);
  const completedSet = new Set(completed);
  const nextSid = SCENARIO_ORDER.find((sid) => !completedSet.has(sid));

  return (
    <div className="max-w-lg mx-auto px-4 py-8 pb-20">
      <h1 className="text-2xl font-bold mb-2">시나리오</h1>
      <p className="text-sm text-white/40 mb-8">
        {completed.length}/5 완료
        {completed.length < 5 && nextSid && ' — 아래에서 이어서 하기'}
      </p>

      <div className="space-y-3">
        {SCENARIO_ORDER.map((sid, idx) => {
          const isDone = completedSet.has(sid);
          const isNext = sid === nextSid;
          const ctx = SCENARIO_CONTEXTS[sid];

          return (
            <div
              key={sid}
              className={`rounded-xl border transition-all ${
                isNext ? 'border-white/30 bg-white/5' : isDone ? 'border-white/10 bg-white/[0.02]' : 'border-white/5 opacity-40'
              }`}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-mono ${isDone ? 'text-white/60' : isNext ? 'text-white' : 'text-white/30'}`}>
                      {isDone ? '✓' : isNext ? '▸' : '○'} {String(idx + 1).padStart(2, '0')}
                    </span>
                    <h3 className={`font-semibold ${isDone || isNext ? 'text-white' : 'text-white/40'}`}>
                      {SCENARIO_LABELS[sid].replace(/시나리오 \d — /, '')}
                    </h3>
                  </div>
                  {isDone && (
                    <span className="text-[10px] text-white/30 font-mono">완료</span>
                  )}
                </div>

                <p className="text-xs text-white/30 mb-3">
                  {ctx.estimatedMinutes} · {ctx.domainHint}
                </p>

                <div className="flex gap-2">
                  {isDone && (
                    <>
                      <Link
                        href={`/scenario/${sid}/vector`}
                        className="flex-1 py-2 text-center text-xs border border-white/10 rounded-lg text-white/50 hover:text-white hover:border-white/20 transition"
                      >
                        대화 + 벡터 보기
                      </Link>
                      <Link
                        href={`/scenario/${sid}?redo=1`}
                        className="flex-1 py-2 text-center text-xs border border-white/10 rounded-lg text-white/50 hover:text-white hover:border-white/20 transition"
                      >
                        다시 하기
                      </Link>
                    </>
                  )}
                  {isNext && (
                    <Link
                      href={`/scenario/${sid}`}
                      className="flex-1 py-2 text-center text-xs border border-white/20 rounded-lg text-white font-medium hover:bg-white/5 transition"
                    >
                      시작하기 →
                    </Link>
                  )}
                  {!isDone && !isNext && (
                    <span className="text-[10px] text-white/20 font-mono">이전 시나리오를 먼저 완료해야 해</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
