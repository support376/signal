import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCompletedScenarios, getIntegratedVector } from '@/lib/db';
import { computeCompleteness } from '@/lib/integrator';
import { SCENARIO_ORDER, SCENARIO_LABELS, SCENARIO_CONTEXTS } from '@/lib/scenario-meta';

export const dynamic = 'force-dynamic';

export default async function SignalPage() {
  const userId = cookies().get('signal_user_id')?.value;
  if (!userId) redirect('/');

  const [completed, vector] = await Promise.all([
    getCompletedScenarios(userId),
    getIntegratedVector(userId),
  ]);
  const completedSet = new Set(completed);
  const completeness = computeCompleteness(vector);
  const nextSid = SCENARIO_ORDER.find((sid) => !completedSet.has(sid));

  return (
    <div className="max-w-lg mx-auto px-5 py-8 pb-20">
      <p className="text-lg font-bold mb-6">Signalogy</p>

      {/* 완성도 (맨 위) */}
      <section className="p-5 border border-white/10 rounded-xl mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-white/30 font-mono">signal 읽기</p>
          <p className="text-xl font-bold">{completeness.percent}%</p>
        </div>
        <div className="flex gap-1.5 mb-2">
          {SCENARIO_ORDER.map((_, i) => (
            <div key={i} className={`flex-1 h-2 rounded-full ${i < completed.length ? 'bg-white/50' : 'bg-white/8'}`} />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-white/20 font-mono">
          <span>{completed.length}/5 시나리오</span>
          <span>측정 축 {completeness.measured_axes}/15</span>
        </div>
      </section>

      {/* 시나리오 목록 */}
      <div className="space-y-3">
        {SCENARIO_ORDER.map((sid, idx) => {
          const isDone = completedSet.has(sid);
          const isNext = sid === nextSid;
          const ctx = SCENARIO_CONTEXTS[sid];

          return (
            <div key={sid}
              className={`rounded-xl border transition-all ${
                isNext ? 'border-white/20 bg-white/[0.03]' : isDone ? 'border-white/8' : 'border-white/5 opacity-30'
              }`}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-mono ${isDone ? 'text-white/50' : isNext ? 'text-white' : 'text-white/20'}`}>
                      {isDone ? '✓' : isNext ? '▸' : '○'} {String(idx + 1).padStart(2, '0')}
                    </span>
                    <p className={`font-medium text-sm ${isDone || isNext ? 'text-white/80' : 'text-white/30'}`}>
                      {ctx.domainHint}
                    </p>
                  </div>
                  <span className="text-[10px] text-white/15 font-mono">{ctx.estimatedMinutes}</span>
                </div>

                <div className="flex gap-2 mt-3">
                  {isDone && (
                    <>
                      <Link href={`/scenario/${sid}/vector`}
                        className="flex-1 py-2 text-center text-[10px] border border-white/8 rounded-lg text-white/40 hover:text-white/60 transition">
                        대화 + 벡터
                      </Link>
                      <Link href={`/scenario/${sid}?redo=1`}
                        className="flex-1 py-2 text-center text-[10px] border border-white/8 rounded-lg text-white/40 hover:text-white/60 transition">
                        다시 하기
                      </Link>
                    </>
                  )}
                  {isNext && (
                    <Link href={`/scenario/${sid}`}
                      className="flex-1 py-2 text-center text-xs border border-white/15 rounded-lg text-white/70 hover:bg-white/5 transition">
                      시작 →
                    </Link>
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
