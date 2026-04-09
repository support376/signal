'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { SCENARIO_LABELS } from '@/lib/prompts/scenarios';
import { SCENARIOS, type ScenarioId } from '@/lib/types';

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

export default function ScenarioPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const scenarioId = params.id as ScenarioId;

  const [userId, setUserId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Init: 쿠키 + 첫 호출
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
    void loadOrStart(uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  async function loadOrStart(uid: string) {
    setLoading(true);
    setError('');
    try {
      // 1. 현재 상태 조회
      const stateR = await fetch('/api/scenario/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, scenarioId }),
      });
      const stateData = await stateR.json();
      if (!stateR.ok) throw new Error(stateData.error);

      if (stateData.turns && stateData.turns.length > 0) {
        // 진행 중이거나 완료된 시나리오
        setTurns(stateData.turns);
        setFinished(stateData.finished);
        return;
      }

      // 2. 새 시작 — 첫 turn 생성
      const r = await fetch('/api/scenario/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, scenarioId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setTurns([{ turn_idx: 1, agent_msg: data.agent_msg, user_msg: null }]);
      setFinished(data.finished);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendResponse() {
    if (!draft.trim() || !userId || loading) return;
    const userMsg = draft.trim();
    setDraft('');
    setLoading(true);
    setError('');

    // Optimistic update
    setTurns((ts) => {
      const last = ts[ts.length - 1];
      const updated = [...ts.slice(0, -1), { ...last, user_msg: userMsg }];
      return updated;
    });

    try {
      const r = await fetch('/api/scenario/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, scenarioId, userMessage: userMsg }),
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
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message);
      setFinalizing(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col min-h-screen">
      <header className="mb-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-xs text-dim hover:text-accent"
        >
          ← 대시보드
        </button>
        <h1 className="text-xl font-bold mt-2">{SCENARIO_LABELS[scenarioId]}</h1>
        <p className="text-xs text-dim mt-1">5턴 대화 · 진행 {turns.length}/5</p>
      </header>

      <div className="flex-1 space-y-4 mb-4">
        {turns.map((t) => (
          <div key={t.turn_idx} className="space-y-3">
            <div className="bg-card border border-line rounded-2xl p-4 max-w-[85%]">
              <p className="text-xs text-dim mb-1">T{t.turn_idx} · agent</p>
              <p className="whitespace-pre-wrap leading-relaxed">{t.agent_msg}</p>
            </div>
            {t.user_msg && (
              <div className="bg-accent/10 border border-accent/30 rounded-2xl p-4 max-w-[85%] ml-auto">
                <p className="text-xs text-accent mb-1">나</p>
                <p className="whitespace-pre-wrap leading-relaxed">{t.user_msg}</p>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="text-sm text-dim italic">...</div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="text-sm text-red-400 mb-3 p-3 bg-red-900/20 border border-red-900/40 rounded-lg">
          {error}
        </div>
      )}

      {!finished && turns.length > 0 && (
        <div className="sticky bottom-4 bg-bg border border-line rounded-2xl p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void sendResponse();
              }
            }}
            placeholder="응답 (Cmd/Ctrl+Enter 전송)"
            disabled={loading || turns[turns.length - 1]?.user_msg !== null}
            className="w-full bg-transparent text-fg resize-none focus:outline-none min-h-[60px]"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={sendResponse}
              disabled={loading || !draft.trim() || turns[turns.length - 1]?.user_msg !== null}
              className="px-4 py-2 bg-accent text-bg rounded-lg text-sm font-semibold hover:bg-accent2 transition disabled:opacity-40"
            >
              전송
            </button>
          </div>
        </div>
      )}

      {finished && (
        <div className="bg-card border border-accent3 rounded-2xl p-6 text-center">
          <p className="text-accent3 font-semibold mb-2">✓ 시나리오 완료</p>
          <p className="text-sm text-dim mb-4">분석을 시작하면 결과가 저장됩니다.</p>
          <button
            onClick={finalize}
            disabled={finalizing}
            className="px-6 py-3 bg-accent3 text-bg rounded-lg font-semibold hover:opacity-80 disabled:opacity-50"
          >
            {finalizing ? '분석 중...' : '분석하기'}
          </button>
        </div>
      )}
    </div>
  );
}
