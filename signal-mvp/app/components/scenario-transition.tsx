'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SCENARIO_LABELS, SCENARIO_CONTEXTS, SCENARIO_ORDER } from '@/lib/scenario-meta';
import type { ScenarioId } from '@/lib/types';

interface Props {
  completedScenarioId: ScenarioId;
  completedCount: number;
  completenessPercent: number;
}

export default function ScenarioTransition({
  completedScenarioId,
  completedCount,
  completenessPercent,
}: Props) {
  const router = useRouter();
  const [countdown, setCountdown] = useState<number | null>(null);

  const currentIdx = SCENARIO_ORDER.indexOf(completedScenarioId);
  const nextScenarioId = currentIdx < SCENARIO_ORDER.length - 1 ? SCENARIO_ORDER[currentIdx + 1] : null;
  const allDone = completedCount >= 5;

  const nextCtx = nextScenarioId ? SCENARIO_CONTEXTS[nextScenarioId] : null;

  // 메시지 — 시나리오 진행에 따라 변화
  const messages = [
    '좋아. 너에 대해 조금 알 것 같아.',
    '점점 보이기 시작한다.',
    '벌써 많이 알겠어. 조금만 더.',
    '거의 다 왔어. 마지막 이야기만.',
    '다 봤어. 결과 볼 준비 됐어.',
  ];
  const msg = messages[Math.min(completedCount - 1, messages.length - 1)];

  function goNext() {
    if (allDone) {
      router.push('/report');
    } else if (nextScenarioId) {
      router.push(`/scenario/${nextScenarioId}`);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card border border-line rounded-2xl p-8 text-center">
        {/* 완료 표시 */}
        <div className="text-4xl mb-4">✓</div>
        <p className="text-accent3 text-sm font-semibold mb-6">
          {SCENARIO_LABELS[completedScenarioId]} 완료
        </p>

        {/* 진행 바 */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-dim mb-2">
            <span>추정 완성도</span>
            <span className="text-accent">{completenessPercent}%</span>
          </div>
          <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-accent2 transition-all duration-1000"
              style={{ width: `${completenessPercent}%` }}
            />
          </div>
          <p className="text-xs text-dim mt-2">{completedCount}/5 시나리오</p>
        </div>

        {/* 메시지 */}
        <p className="text-fg text-lg font-medium mb-8 leading-relaxed">
          {msg}
        </p>

        {/* 다음 시나리오 미리보기 */}
        {!allDone && nextCtx && (
          <div className="mb-6 p-4 bg-bg border border-line rounded-xl text-left">
            <p className="text-xs text-dim uppercase tracking-wider mb-1">다음</p>
            <p className="font-semibold">{nextScenarioId ? SCENARIO_LABELS[nextScenarioId] : ''}</p>
            <p className="text-xs text-dim mt-1">{nextCtx.estimatedMinutes} · {nextCtx.domainHint}</p>
          </div>
        )}

        {/* 버튼 */}
        <div className="space-y-3">
          <button
            onClick={goNext}
            className="w-full py-4 bg-accent text-bg font-semibold rounded-xl text-lg hover:bg-accent2 transition"
          >
            {allDone ? '✨ 결과 보기' : '이어서 하기 →'}
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 bg-transparent text-dim text-sm hover:text-accent transition"
          >
            나중에 하기
          </button>
        </div>
      </div>
    </div>
  );
}
