'use client';

import { useState, useEffect, useCallback } from 'react';

interface ApiCall {
  endpoint: string;
  source: 'llm' | 'cache' | 'math' | 'db' | 'unknown';
  timestamp: number;
  durationMs: number;
}

export default function ApiUsage() {
  const [calls, setCalls] = useState<ApiCall[]>([]);
  const [expanded, setExpanded] = useState(false);

  const refresh = useCallback(() => {
    setCalls([...((typeof window !== 'undefined' && window.__signalogy_api_calls) || [])]);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__signalogy_debug_listener = refresh;
    }
    refresh();
    return () => {
      if (typeof window !== 'undefined') {
        window.__signalogy_debug_listener = undefined;
      }
    };
  }, [refresh]);

  const llmCount = calls.filter((c) => c.source === 'llm').length;
  const cacheCount = calls.filter((c) => c.source === 'cache').length;
  const dbCount = calls.filter((c) => c.source === 'db' || c.source === 'math').length;
  const totalCost = llmCount * 0.05;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-fg">API 사용량 (이번 세션)</p>
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-dim hover:text-fg">
          {expanded ? '접기' : '상세'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-bg border border-line rounded-lg">
          <p className="text-lg font-bold text-fg">{llmCount}</p>
          <p className="text-[10px] text-faint">LLM</p>
        </div>
        <div className="p-2 bg-bg border border-line rounded-lg">
          <p className="text-lg font-bold text-fg">{cacheCount}</p>
          <p className="text-[10px] text-faint">Cache</p>
        </div>
        <div className="p-2 bg-bg border border-line rounded-lg">
          <p className="text-lg font-bold text-fg">{dbCount}</p>
          <p className="text-[10px] text-faint">DB</p>
        </div>
      </div>

      {totalCost > 0 && (
        <p className="text-[10px] text-warn mt-2">예상 LLM 비용: ~${totalCost.toFixed(2)}</p>
      )}

      {expanded && calls.length > 0 && (
        <div className="mt-3 max-h-48 overflow-y-auto space-y-1">
          {calls.slice().reverse().map((c, i) => (
            <div key={i} className="flex items-baseline justify-between text-[10px]">
              <span className="truncate flex-1 text-dim">{c.endpoint}</span>
              <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                c.source === 'llm' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                c.source === 'cache' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300'
              }`}>
                {c.source}
              </span>
              <span className="ml-2 text-faint w-12 text-right">{c.durationMs}ms</span>
            </div>
          ))}
        </div>
      )}

      {expanded && calls.length === 0 && (
        <p className="text-[10px] text-faint mt-3">아직 API 호출 없음</p>
      )}

      {expanded && calls.length > 0 && (
        <button
          onClick={() => {
            if (typeof window !== 'undefined') window.__signalogy_api_calls = [];
            refresh();
          }}
          className="text-[10px] text-faint hover:text-dim mt-2"
        >
          초기화
        </button>
      )}
    </div>
  );
}
