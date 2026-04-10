'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { SCENARIO_LABELS, SCENARIO_CONTEXTS } from '@/lib/scenario-meta';
import { SCENARIOS, type ScenarioId } from '@/lib/types';
import LoadingState from '@/app/components/loading-state';
import ScenarioTransition from '@/app/components/scenario-transition';
import { FINALIZE_PHASES } from '@/lib/loading-messages';
import { createTracker, type KeystrokeTracker } from '@/app/components/keystroke-tracker';

interface Turn {
  turn_idx: number;
  agent_msg: string;
  user_msg: string | null;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : null;
}

function ScenarioPageInner() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sp = useSearchParams();
  const scenarioId = params.id as ScenarioId;
  const isRedo = sp.get('redo') === '1';

  const [userId, setUserId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionData, setTransitionData] = useState<{
    completedCount: number;
    completenessPercent: number;
  } | null>(null);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const trackerRef = useRef<KeystrokeTracker | null>(null);

  const ctx = SCENARIO_CONTEXTS[scenarioId];

  useEffect(() => {
    const uid = readCookie('signal_user_id');
    if (!uid) {
      router.push('/');
      return;
    }
    if (!SCENARIOS.includes(scenarioId)) {
      setError('잘못된 시나리오 ID');
      return;
    }
    setUserId(uid);

    if (isRedo) {
      fetch('/api/scenario/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, scenarioId }),
      }).then(() => {
        window.history.replaceState(null, '', `/scenario/${scenarioId}`);
        loadState(uid);
      });
    } else {
      void loadState(uid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  async function loadState(uid: string) {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/scenario/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, scenarioId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      if (data.turns && data.turns.length > 0) {
        setTurns(data.turns);
        setFinished(data.finished);
        setShowIntro(false);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function startScenario() {
    if (!userId) return;
    setLoading(true);
    setError('');
    setShowIntro(false);
    try {
      const r = await fetch('/api/scenario/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, scenarioId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setTurns([{ turn_idx: 1, agent_msg: data.agent_msg, user_msg: null }]);
      setFinished(data.finished);
      trackerRef.current = createTracker(Date.now());
    } catch (e: any) {
      setError(e.message);
      setShowIntro(true);
    } finally {
      setLoading(false);
    }
  }

  async function sendResponse() {
    if (!draft.trim() || !userId || loading) return;
    const userMsg = draft.trim();
    const inputMeta = trackerRef.current?.getMetadata(userMsg) ?? null;

    setDraft('');
    setLoading(true);
    setError('');

    setTurns((ts) => {
      const last = ts[ts.length - 1];
      return [...ts.slice(0, -1), { ...last, user_msg: userMsg }];
    });

    try {
      const r = await fetch('/api/scenario/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, scenarioId, userMessage: userMsg, inputMeta }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);

      if (data.finished) {
        setFinished(true);
      } else {
        setTurns((ts) => [
          ...ts,
          { turn_idx: data.turn_idx, agent_msg: data.agent_msg, user_msg: null },
        ]);
        if (trackerRef.current) {
          trackerRef.current.reset(Date.now());
        } else {
          trackerRef.current = createTracker(Date.now());
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function finalize() {
    if (!userId) return;
    setFinalizing(true);
    setError('');
    try {
      const r = await fetch('/api/scenario/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, scenarioId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);

      const compR = await fetch('/api/completeness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const compData = await compR.json();
      const percent = compData?.completeness?.percent || 0;

      setTransitionData({
        completedCount: data.completed_count || 1,
        completenessPercent: percent,
      });
      setShowTransition(true);
      setFinalizing(false);
    } catch (e: any) {
      setError(e.message);
      setFinalizing(false);
    }
  }

  if (showTransition && transitionData) {
    return (
      <ScenarioTransition
        completedScenarioId={scenarioId}
        completedCount={transitionData.completedCount}
        completenessPercent={transitionData.completenessPercent}
      />
    );
  }

  if (showIntro && turns.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 min-h-screen flex flex-col">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-xs text-dim hover:text-accent self-start"
        >
          ← 대시보드
        </button>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full bg-card border border-line rounded-2xl p-8 space-y-6">
            <div>
              <p className="text-xs text-dim uppercase tracking-wider">상황</p>
              <h1 className="text-2xl font-bold mt-1 text-fg">{SCENARIO_LABELS[scenarioId]}</h1>
              <div className="flex items-baseline gap-3 mt-2">
                <p className="text-xs text-accent3">{ctx.domainHint}</p>
                <p className="text-xs text-dim">· {ctx.estimatedMinutes}</p>
              </div>
            </div>

            <div className="space-y-4 border-t border-line pt-6">
              <div>
                <p className="text-xs text-dim uppercase tracking-wider mb-1">당신은</p>
                <p className="text-fg">자기 자신 그대로</p>
              </div>
              <div>
                <p className="text-xs text-dim uppercase tracking-wider mb-1">상대는</p>
                <p className="text-fg">{ctx.agentLabel}</p>
              </div>
              <div>
                <p className="text-xs text-dim uppercase tracking-wider mb-1">방금 일어난 일</p>
                <p className="text-fg leading-relaxed">{ctx.trigger}</p>
              </div>
            </div>

            <div className="border-t border-line pt-6 text-xs text-dim leading-relaxed">
              카톡처럼 대화하면 돼. 정답은 없어. 떠오르는 대로. 케미를 보려면 이 과정이 필요해.
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              onClick={startScenario}
              disabled={loading}
              className="w-full py-3 bg-accent text-bg font-semibold rounded-lg hover:bg-accent2 disabled:opacity-50"
            >
              {loading ? '...' : '대화 시작'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col min-h-screen">
      <header className="mb-4">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-xs text-dim hover:text-accent"
        >
          ← 대시보드
        </button>
        <h1 className="text-lg font-bold mt-2 text-fg">{SCENARIO_LABELS[scenarioId]}</h1>
        <p className="text-xs text-dim mt-1">
          {ctx.agentName} · 진행 {turns.length}/5
        </p>
      </header>

      <div className="flex-1 space-y-3 mb-4">
        {turns.map((t) => (
          <div key={t.turn_idx} className="space-y-2">
            <div className="flex items-end gap-2 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-card border border-line flex items-center justify-center text-xs flex-shrink-0 text-fg">
                {ctx.agentName[0]}
              </div>
              <div>
                <p className="text-[10px] text-dim ml-1 mb-0.5">{ctx.agentName}</p>
                <div className="bg-card border border-line rounded-2xl rounded-bl-sm px-4 py-3">
                  <p className="whitespace-pre-wrap leading-relaxed text-sm text-fg">{t.agent_msg}</p>
                </div>
              </div>
            </div>
            {t.user_msg && (
              <div className="flex justify-end max-w-[85%] ml-auto">
                <div className="bg-accent/10 border border-accent/20 rounded-2xl rounded-br-sm px-4 py-3">
                  <p className="whitespace-pre-wrap leading-relaxed text-sm text-fg">{t.user_msg}</p>
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-end gap-2 max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-card border border-line flex items-center justify-center text-xs flex-shrink-0">
              {ctx.agentName[0]}
            </div>
            <div className="bg-card border border-line rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-dim rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-dim rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-dim rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="text-sm text-red-600 mb-3 p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-900/40">
          {error}
        </div>
      )}

      {!finished && turns.length > 0 && (
        <div className="sticky bottom-0 bg-bg border-t border-line px-3 py-3">
          <div className="flex items-end gap-2 max-w-2xl mx-auto">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                trackerRef.current?.onKeyDown(e);
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void sendResponse();
                }
              }}
              onInput={(e) => trackerRef.current?.onInput(e)}
              onPaste={() => trackerRef.current?.onPaste()}
              placeholder="메시지 입력"
              disabled={loading || turns[turns.length - 1]?.user_msg !== null}
              rows={1}
              className="flex-1 px-4 py-3 bg-card border border-line rounded-3xl text-fg text-sm resize-none focus:outline-none focus:border-accent min-h-[44px] max-h-[120px]"
            />
            <button
              onClick={sendResponse}
              disabled={loading || !draft.trim() || turns[turns.length - 1]?.user_msg !== null}
              className="w-10 h-10 rounded-full bg-accent text-bg flex items-center justify-center hover:bg-accent2 disabled:opacity-30 flex-shrink-0"
              aria-label="전송"
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {finished && !finalizing && (
        <div className="bg-card border border-line rounded-2xl p-6 text-center">
          <p className="text-accent3 font-semibold mb-2">✓ 시나리오 완료</p>
          <p className="text-sm text-dim mb-4">분석을 시작하면 결과가 저장됩니다.</p>
          <button
            onClick={finalize}
            className="px-6 py-3 bg-accent text-bg rounded-lg font-semibold hover:opacity-80"
          >
            분석하기
          </button>
        </div>
      )}

      {finalizing && (
        <div className="bg-card border border-line rounded-2xl p-6">
          <LoadingState
            phases={FINALIZE_PHASES}
            estimatedSec={20}
            hint="대화에서 15축을 추출 + 통합 + 자기 분석에 반영하는 중. 보통 15~25초"
          />
        </div>
      )}
    </div>
  );
}

export default function ScenarioPage() {
  return (
    <Suspense fallback={null}>
      <ScenarioPageInner />
    </Suspense>
  );
}
