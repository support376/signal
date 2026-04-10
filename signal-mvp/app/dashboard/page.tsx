import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  getCompletedScenarios, getUser, getIntegratedVector,
  getSelfReport, listMyChemistries,
} from '@/lib/db';
import { computeCompleteness } from '@/lib/integrator';
import { SCENARIO_ORDER, SCENARIO_CONTEXTS } from '@/lib/scenario-meta';
import { parseTags } from '@/lib/parse-tags';
import SnsMatches from '@/app/components/sns-matches';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const userId = cookies().get('signal_user_id')?.value;
  if (!userId) redirect('/');
  const user = await getUser(userId);
  if (!user) redirect('/');

  const [completed, vector, selfReport, chemistries] = await Promise.all([
    getCompletedScenarios(userId),
    getIntegratedVector(userId),
    getSelfReport(userId),
    listMyChemistries(userId),
  ]);
  const completeness = computeCompleteness(vector);
  const done = completeness.scenarios_completed;
  const nextSid = SCENARIO_ORDER.find((sid) => !new Set(completed).has(sid));
  const nextCtx = nextSid ? SCENARIO_CONTEXTS[nextSid] : null;

  let headline = '';
  let tags: string[] = [];
  if (selfReport) {
    const parsed = parseTags(selfReport);
    tags = parsed.tags;
    headline = parsed.body.match(/^##?\s*(.+)$/m)?.[1]?.replace(/\*/g, '') || '';
  }

  const latestChem = chemistries.length > 0 ? chemistries[0] : null;

  if (done < 5) {
    return (
      <div className="max-w-md mx-auto px-5 py-8 pb-20">
        <p className="text-lg font-bold mb-8 text-fg">Signalogy</p>
        <div className="text-center">
          <div className="flex gap-1.5 max-w-xs mx-auto mb-4">
            {SCENARIO_ORDER.map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full ${i < done ? 'bg-accent' : 'bg-line'}`} />
            ))}
          </div>
          <p className="text-[10px] text-faint mb-10">signal {done}/5</p>

          {done === 0 ? (
            <>
              <p className="text-xl font-bold mb-2 text-fg">케미를 보려면</p>
              <p className="text-xl font-bold text-dim mb-8">먼저 너의 signal을 읽어야 해.</p>
              <Link href={`/scenario/${SCENARIO_ORDER[0]}`}
                className="inline-block px-8 py-3 border border-line text-fg rounded-xl hover:bg-card">
                시작 →
              </Link>
              <p className="text-[10px] text-faint mt-4">{SCENARIO_CONTEXTS[SCENARIO_ORDER[0]].estimatedMinutes}</p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold mb-2 text-fg">{5 - done}개만 더.</p>
              <p className="text-sm text-dim mb-8">끝나면 바로 케미를 볼 수 있어.</p>
              {nextSid && nextCtx && (
                <Link href={`/scenario/${nextSid}`}
                  className="inline-block px-8 py-3 border border-line text-fg rounded-xl hover:bg-card">
                  이어서 →
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  if (chemistries.length === 0) {
    return (
      <div className="max-w-md mx-auto px-5 py-8 pb-20">
        <p className="text-lg font-bold mb-8 text-fg">Signalogy</p>
        <div className="text-center">
          <p className="text-xl font-bold mb-2 text-fg">이제 상대에게 보내.</p>
          <p className="text-sm text-dim mb-8">15분만 하면 둘의 진짜 케미가 열려.</p>

          <Link href="/chemistry"
            className="inline-block px-8 py-3 border border-line text-fg rounded-xl hover:bg-card mb-8">
            링크 보내기 →
          </Link>

          {headline && (
            <div className="mt-12 p-5 border border-line rounded-xl text-left">
              <p className="text-[10px] text-faint mb-2">기다리는 동안, 너의 signal</p>
              <p className="text-sm text-dim leading-relaxed">{headline}</p>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {tags.map((t) => <span key={t} className="text-[10px] text-faint border border-line rounded-full px-2 py-0.5">{t}</span>)}
                </div>
              )}
              <Link href="/report" className="text-[10px] text-faint hover:text-dim mt-3 block">
                전체 보기 →
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-5 py-12 pb-20">
      <p className="text-lg font-bold mb-8 text-fg">Signalogy</p>

      {headline ? (
        <section className="mb-10">
          <p className="text-lg font-bold leading-snug mb-3 text-fg">{headline}</p>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {tags.map((t) => <span key={t} className="text-[10px] text-faint border border-line rounded-full px-2 py-0.5">{t}</span>)}
            </div>
          )}
          <Link href="/report" className="text-xs text-faint hover:text-dim">전체 분석 →</Link>
        </section>
      ) : (
        <section className="mb-10">
          <Link href="/report" className="text-sm text-dim hover:text-fg">
            내 signal 분석 보기 →
          </Link>
        </section>
      )}

      {latestChem && (
        <section className="p-5 border border-line rounded-xl mb-8">
          <p className="text-[10px] text-faint mb-2">최근 케미</p>
          <Link href={`/chemistry/${latestChem.user_a_id !== userId ? latestChem.user_a_id : latestChem.user_b_id}/${latestChem.lens}`}
            className="block hover:bg-card rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-dim">
                @{latestChem.user_a_id !== userId ? latestChem.user_a_id : latestChem.user_b_id}
              </span>
              <span className="text-2xl font-bold text-fg">{latestChem.score}%</span>
            </div>
          </Link>
        </section>
      )}

      <SnsMatches userId={userId} />

      <section className="text-center">
        <Link href="/chemistry"
          className="inline-block px-6 py-2 border border-line text-dim text-xs rounded-lg hover:bg-card">
          더 많은 사람 보기 →
        </Link>
      </section>
    </div>
  );
}
