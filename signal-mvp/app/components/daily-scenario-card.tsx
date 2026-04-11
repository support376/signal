'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DailyData {
  available: boolean;
  dateKey: string;
  scenario?: {
    agentName: string;
    agentLabel: string;
    trigger: string;
    domainHint: string;
  };
  turns: any[];
  finished: boolean;
  streak: number;
  totalDays: number;
  message?: string;
}

export default function DailyScenarioCard({ userId }: { userId: string }) {
  const [data, setData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/daily-scenario?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="p-5 border border-line rounded-xl mb-6 animate-pulse">
        <div className="h-4 bg-line rounded w-32 mb-3" />
        <div className="h-3 bg-line rounded w-48" />
      </div>
    );
  }

  if (!data?.available) {
    return (
      <div className="p-5 border border-line rounded-xl mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-mono text-dim">//</span>
          <p className="text-sm font-semibold text-fg">오늘의 시나리오</p>
        </div>
        <p className="text-xs text-faint">아직 준비 중... 곧 새로운 시나리오가 생성됩니다.</p>
      </div>
    );
  }

  const { scenario, turns, finished, streak, totalDays, dateKey } = data;
  const started = turns.length > 0;
  const turnCount = turns.length;

  return (
    <div className={`p-5 border rounded-xl mb-6 ${finished ? 'border-line' : 'border-fg bg-card'}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-dim">//</span>
          <div>
            <p className="text-sm font-semibold text-fg">오늘의 시나리오</p>
            <p className="text-[10px] text-faint">{dateKey}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-faint">
          {streak > 0 && (
            <span className="px-2 py-0.5 border border-line rounded text-fg">
              {streak}일 연속
            </span>
          )}
          <span>총 {totalDays}일</span>
        </div>
      </div>

      {/* 시나리오 정보 */}
      {scenario && (
        <div className="mb-3">
          <p className="text-xs text-fg mb-1">{scenario.domainHint}</p>
          <p className="text-[11px] text-dim leading-relaxed">{scenario.trigger}</p>
        </div>
      )}

      {/* 상태별 CTA */}
      {finished ? (
        <div className="flex items-center justify-between">
          <p className="text-xs text-dim">✓ Signaling이 완료되었습니다</p>
          <p className="text-[10px] text-faint">내일 새 시나리오가 생성됩니다</p>
        </div>
      ) : started ? (
        <Link href={`/daily/${dateKey}`}
          className="block text-center py-2.5 border border-line rounded-lg text-xs text-fg hover:bg-bg-elevated transition">
          이어서 대화 ({turnCount}/5) →
        </Link>
      ) : (
        <Link href={`/daily/${dateKey}`}
          className="block text-center py-2.5 bg-fg text-bg rounded-lg text-xs font-semibold hover:opacity-80 transition">
          시작하기 →
        </Link>
      )}
    </div>
  );
}
