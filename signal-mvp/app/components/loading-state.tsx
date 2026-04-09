'use client';

import { useEffect, useState } from 'react';
import {
  type LoadingPhase,
  getMessageForElapsed,
  formatElapsed,
} from '@/lib/loading-messages';

interface Props {
  phases: LoadingPhase[];
  /** 예상 총 소요 시간 (초). progress bar 표시용. 없으면 무한 spinner */
  estimatedSec?: number;
  /** 추가 설명 (예: "보통 15-25초 걸려요") */
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingState({ phases, estimatedSec, hint, size = 'md' }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const t = setInterval(() => {
      setElapsed((Date.now() - startedAt) / 1000);
    }, 250);
    return () => clearInterval(t);
  }, []);

  const message = getMessageForElapsed(phases, elapsed);
  const timeStr = formatElapsed(elapsed);
  const progressPct = estimatedSec
    ? Math.min(100, (elapsed / estimatedSec) * 100)
    : null;

  const sizes = {
    sm: 'text-sm py-4',
    md: 'text-base py-8',
    lg: 'text-lg py-12',
  };

  return (
    <div className={`text-center ${sizes[size]}`}>
      {/* Spinner */}
      <div className="inline-block w-8 h-8 border-2 border-line border-t-accent rounded-full animate-spin mb-4" />

      {/* 메시지 */}
      <p className="text-fg font-medium">{message}</p>

      {/* 시간 */}
      <p className="text-xs text-dim mt-2 font-mono">{timeStr}</p>

      {/* Progress bar (estimated 시간 있을 때만) */}
      {progressPct !== null && (
        <div className="max-w-xs mx-auto mt-4">
          <div className="w-full h-1 bg-card rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-accent2 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {elapsed > estimatedSec! && (
            <p className="text-xs text-dim mt-2">
              예상보다 길어지고 있어... 조금만 더 기다려줘
            </p>
          )}
        </div>
      )}

      {/* hint */}
      {hint && <p className="text-xs text-dim mt-3">{hint}</p>}
    </div>
  );
}
