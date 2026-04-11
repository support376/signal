'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createTracker, type KeystrokeTracker } from '@/app/components/keystroke-tracker';

interface Turn {
  turn_idx: number;
  agent_msg: string;
  user_msg: string | null;
}

interface ScenarioInfo {
  agentName: string;
  agentLabel: string;
  trigger: string;
  domainHint: string;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : null;
}

function DailyScenarioInner() {
  const router = useRouter();
  const params = useParams<{ dateKey: string }>();
  const dateKey = params.dateKey;

  const [userId, setUserId] = useState<string | null>(null);
  const [scenario, setScenario] = useState<ScenarioInfo | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const trackerRef = useRef<KeystrokeTracker | null>(null);

  useEffect(() => {
    const uid = readCookie('signal_user_id');
    if (!uid) { router.push('/'); return; }
    setUserId(uid);

    // 오늘의 시나리오 + 기존 진행 상태 로드
    fetch(`/api/daily-scenario?userId=${encodeURIComponent(uid)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.available) {
          setError('오늘의 시나리오가 아직 준비되지 않았습니다.');
          return;
        }
        setScenario(data.scenario);
        if (data.turns && data.turns.length > 0) {
          setTurns(data.turns);
          setFinished(data.finished);
          setShowIntro(false);
        }
      })
      .catch((e) => setError(e.message));
  }, [dateKey, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  async function startScenario() {
    if (!userId) return;
    setLoading(true);
    setError('');
    setShowIntro(false);
    try {
      const r = await fetch('/api/daily-scenario/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setTurns([{ turn_idx: 1, agent_msg: data.agent_msg, user_msg: null }]);
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
      const r = await fetch('/api/daily-scenario/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userMessage: userMsg, inputMeta }),
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
        if (trackerRef.current) trackerRef.current.reset(Date.now());
        else trackerRef.current = createTracker(Date.now());
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!scenario && !error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 flex justify-center">
        <div className="w-5 h-5 border-2 border-line border-t-fg rounded-full animate-spin" />
      </div>
    );
  }

  // INTRO
  if (showIntro && turns.length === 0 && scenario) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 min-h-screen flex flex-col">
        <button onClick={() => router.push('/scenario')} className="text-xs text-dim hover:text-fg self-start">
          ← Signal
        </button>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full bg-card border border-line rounded-2xl p-8 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📅</span>
                <span className="text-[10px] font-mono text-dim px-2 py-0.5 border border-line rounded">{dateKey}</span>
              </div>
              <p className="text-xs text-dim uppercase tracking-wider">오늘의 시나리오</p>
              <h1 className="text-xl font-bold mt-1 text-fg">{scenario.domainHint}</h1>
            </div>

            <div className="space-y-4 border-t border-line pt-6">
              <div>
                <p className="text-xs text-dim uppercase tracking-wider mb-1">당신은</p>
                <p className="text-fg">자기 자신 그대로</p>
              </div>
              <div>
                <p className="text-xs text-dim uppercase tracking-wider mb-1">상대는</p>
                <p className="text-fg">{scenario.agentLabel}</p>
              </div>
              <div>
                <p className="text-xs text-dim uppercase tracking-wider mb-1">상황</p>
                <p className="text-fg leading-relaxed">{scenario.trigger}</p>
              </div>
            </div>

            <div className="border-t border-line pt-6 text-xs text-dim leading-relaxed">
              카톡처럼 대화하면 돼. 정답은 없어. 떠오르는 대로.
              <br /><span className="text-faint">매일 새로운 시나리오로 성격 벡터가 정밀해집니다.</span>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button onClick={startScenario} disabled={loading}
              className="w-full py-3 bg-fg text-bg font-semibold rounded-lg hover:opacity-80 transition disabled:opacity-50">
              {loading ? '...' : '대화 시작'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CHAT
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col min-h-screen">
      <header className="mb-4">
        <button onClick={() => router.push('/scenario')} className="text-xs text-dim hover:text-fg">← Signal</button>
        <div className="flex items-center gap-2 mt-2">
          <h1 className="text-lg font-bold text-fg">{scenario?.domainHint || '오늘의 시나리오'}</h1>
          <span className="text-[10px] font-mono text-dim px-1.5 py-0.5 border border-line rounded">{dateKey}</span>
        </div>
        <p className="text-xs text-dim mt-1">{scenario?.agentName} · 진행 {turns.length}/5</p>
      </header>

      <div className="flex-1 space-y-3 mb-4">
        {turns.map((t) => (
          <div key={t.turn_idx} className="space-y-2">
            <div className="flex items-end gap-2 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-card border border-line flex items-center justify-center text-xs flex-shrink-0">
                {scenario?.agentName?.[0] || '?'}
              </div>
              <div>
                <p className="text-[10px] text-dim ml-1 mb-0.5">{scenario?.agentName}</p>
                <div className="bg-card border border-line rounded-2xl rounded-bl-sm px-4 py-3">
                  <p className="whitespace-pre-wrap leading-relaxed text-sm">{t.agent_msg}</p>
                </div>
              </div>
            </div>
            {t.user_msg && (
              <div className="flex justify-end max-w-[85%] ml-auto">
                <div className="bg-accent/15 border border-accent/25 rounded-2xl rounded-br-sm px-4 py-3">
                  <p className="whitespace-pre-wrap leading-relaxed text-sm">{t.user_msg}</p>
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-end gap-2 max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-card border border-line flex items-center justify-center text-xs flex-shrink-0">
              {scenario?.agentName?.[0] || '?'}
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
        <div className="text-sm text-red-400 mb-3 p-3 bg-red-900/20 border border-red-900/40 rounded-lg">{error}</div>
      )}

      {!finished && turns.length > 0 && (
        <div className="sticky bottom-0 bg-bg/80 backdrop-blur-md border-t border-line px-3 py-3">
          <div className="flex items-end gap-2 max-w-2xl mx-auto">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                trackerRef.current?.onKeyDown(e);
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void sendResponse(); }
              }}
              onInput={(e) => trackerRef.current?.onInput(e)}
              onPaste={() => trackerRef.current?.onPaste()}
              placeholder="메시지 입력" disabled={loading || turns[turns.length - 1]?.user_msg !== null}
              rows={1}
              className="flex-1 px-4 py-3 bg-card border border-line rounded-3xl text-fg text-sm resize-none focus:outline-none focus:border-dim min-h-[44px] max-h-[120px]" />
            <button onClick={sendResponse}
              disabled={loading || !draft.trim() || turns[turns.length - 1]?.user_msg !== null}
              className="w-10 h-10 rounded-full bg-fg text-bg flex items-center justify-center hover:opacity-80 transition disabled:opacity-30 flex-shrink-0"
              aria-label="전송">↑</button>
          </div>
        </div>
      )}

      {finished && (
        <div className="bg-card border border-accent3 rounded-2xl p-6 text-center">
          <p className="text-accent3 font-semibold mb-2">✓ 오늘의 시나리오 완료</p>
          <p className="text-sm text-dim mb-4">내일 새로운 시나리오가 생성됩니다.</p>
          <button onClick={() => router.push('/scenario')}
            className="px-6 py-3 border border-line rounded-lg text-sm text-dim hover:text-fg">
            Signal로 돌아가기
          </button>
        </div>
      )}
    </div>
  );
}

export default function DailyScenarioPage() {
  return (
    <Suspense fallback={null}>
      <DailyScenarioInner />
    </Suspense>
  );
}
