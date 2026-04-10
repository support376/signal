'use client';

import { useRouter } from 'next/navigation';
import { SCENARIO_LABELS, SCENARIO_CONTEXTS, SCENARIO_ORDER } from '@/lib/scenario-meta';
import type { ScenarioId } from '@/lib/types';

interface Props {
  completedScenarioId: ScenarioId;
  completedCount: number;
  completenessPercent: number;
}

export default function ScenarioTransition({ completedScenarioId, completedCount, completenessPercent }: Props) {
  const router = useRouter();
  const currentIdx = SCENARIO_ORDER.indexOf(completedScenarioId);
  const nextSid = currentIdx < SCENARIO_ORDER.length - 1 ? SCENARIO_ORDER[currentIdx + 1] : null;
  const allDone = completedCount >= 5;
  const remaining = 5 - completedCount;

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm text-center">

        <div className="flex gap-1.5 mb-8">
          {SCENARIO_ORDER.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full ${i < completedCount ? 'bg-accent' : 'bg-line'}`} />
          ))}
        </div>

        {allDone ? (
          <>
            <p className="text-2xl font-bold mb-3 text-fg">너의 signal 읽기 완료.</p>
            <p className="text-dim text-sm mb-3">이제 상대에게 보내.</p>
            <p className="text-faint text-xs mb-10">상대도 15분만 하면 둘의 진짜 케미가 열려.</p>

            <button onClick={() => router.push('/chemistry')}
              className="w-full py-4 border border-line text-fg rounded-xl hover:bg-card mb-3">
              상대에게 링크 보내기 →
            </button>

            <button onClick={() => router.push('/dashboard')}
              className="w-full text-xs text-faint py-2 hover:text-dim">
              홈으로
            </button>
          </>
        ) : (
          <>
            <p className="text-lg font-bold mb-8 text-fg">
              {completedCount === 1 && '너에 대해 조금 알 것 같아.'}
              {completedCount === 2 && '점점 보이기 시작한다.'}
              {completedCount === 3 && '벌써 많이 알겠어.'}
              {completedCount === 4 && '거의 다 왔어.'}
            </p>

            <div className="p-5 border border-line rounded-xl mb-8">
              <div className="blur-[6px] select-none pointer-events-none">
                <p className="text-dim font-bold">나 × ???  —  ??%</p>
              </div>
              <p className="text-[10px] text-faint mt-2">
                {remaining}개 대화 더 하면 공개
              </p>
            </div>

            {nextSid && (
              <button onClick={() => router.push(`/scenario/${nextSid}`)}
                className="w-full py-4 border border-line text-fg rounded-xl hover:bg-card mb-3">
                다음 대화 →
              </button>
            )}
            <button onClick={() => router.push('/dashboard')}
              className="w-full text-xs text-faint py-2 hover:text-dim">
              나중에
            </button>
          </>
        )}
      </div>
    </div>
  );
}
