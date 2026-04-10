'use client';

import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    __signalogy_api_calls?: ApiCall[];
    __signalogy_debug_listener?: () => void;
  }
}

interface ApiCall {
  endpoint: string;
  source: 'llm' | 'cache' | 'math' | 'db' | 'unknown';
  timestamp: number;
  durationMs: number;
}

export function trackApiCall(call: ApiCall) {
  if (typeof window === 'undefined') return;
  if (!window.__signalogy_api_calls) window.__signalogy_api_calls = [];
  window.__signalogy_api_calls.push(call);
  window.__signalogy_debug_listener?.();
}

export async function trackedFetch(
  url: string,
  init?: RequestInit
): Promise<{ response: Response; data: any }> {
  const start = Date.now();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const data = await response.json();
  const duration = Date.now() - start;

  let source: ApiCall['source'] = 'unknown';
  if (data.cached === true) source = 'cache';
  else if (data.source) source = data.source;
  else if (url.includes('/scores')) source = 'math';
  else if (url.includes('/completeness') || url.includes('/me') || url.includes('/users') || url.includes('/state')) source = 'db';
  else if (url.includes('/turn') || url.includes('/finalize') || url.includes('/report') || url.includes('/chemistry')) {
    source = data.cached ? 'cache' : 'llm';
  }

  trackApiCall({
    endpoint: url.replace('/api/', ''),
    source,
    timestamp: Date.now(),
    durationMs: duration,
  });

  return { response, data };
}

export default function ApiDebugPanel() {
  const [calls, setCalls] = useState<ApiCall[]>([]);
  const [expanded, setExpanded] = useState(false);

  const refresh = useCallback(() => {
    setCalls([...(window.__signalogy_api_calls || [])]);
  }, []);

  useEffect(() => {
    window.__signalogy_debug_listener = refresh;
    refresh();
    return () => { window.__signalogy_debug_listener = undefined; };
  }, [refresh]);

  const llmCount = calls.filter((c) => c.source === 'llm').length;
  const cacheCount = calls.filter((c) => c.source === 'cache').length;
  const mathCount = calls.filter((c) => c.source === 'math').length;
  const dbCount = calls.filter((c) => c.source === 'db').length;
  const totalCost = llmCount * 0.05;

  return (
    <div className="fixed bottom-2 right-2 z-50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="px-3 py-1.5 bg-card border border-line rounded-lg text-[10px] text-dim hover:text-accent shadow-sm"
      >
        LLM:{llmCount} Cache:{cacheCount} Math:{mathCount} DB:{dbCount}
      </button>

      {expanded && (
        <div className="absolute bottom-10 right-0 w-80 max-h-64 overflow-y-auto bg-bg border border-line rounded-xl shadow-lg p-3">
          <div className="flex justify-between items-baseline mb-2">
            <p className="text-xs font-semibold text-fg">API Calls ({calls.length})</p>
            <p className="text-[10px] text-warn">≈${totalCost.toFixed(2)} LLM cost</p>
          </div>
          <div className="space-y-1">
            {calls.slice().reverse().map((c, i) => (
              <div key={i} className="flex items-baseline justify-between text-[10px]">
                <span className="truncate flex-1">{c.endpoint}</span>
                <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  c.source === 'llm' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                  c.source === 'cache' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                  c.source === 'math' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300'
                }`}>
                  {c.source}
                </span>
                <span className="ml-2 text-dim w-12 text-right">{c.durationMs}ms</span>
              </div>
            ))}
          </div>
          {calls.length === 0 && <p className="text-[10px] text-dim">아직 API 호출 없음</p>}
          <button
            onClick={() => { window.__signalogy_api_calls = []; refresh(); }}
            className="mt-2 text-[10px] text-dim hover:text-accent"
          >
            초기화
          </button>
        </div>
      )}
    </div>
  );
}
