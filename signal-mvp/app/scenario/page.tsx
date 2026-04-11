'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SCENARIO_ORDER, SCENARIO_CONTEXTS } from '@/lib/scenario-meta';
import type { ScenarioId } from '@/lib/types';

type SignalMode = 'text' | 'voice' | 'face';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : null;
}

interface CompletenessData {
  percent: number;
  measured_axes: number;
}

export default function SignalPage() {
  const [mode, setMode] = useState<SignalMode>('text');
  const [userId, setUserId] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [voiceCompleted, setVoiceCompleted] = useState<string[]>([]);
  const [completeness, setCompleteness] = useState<CompletenessData>({ percent: 0, measured_axes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = readCookie('signal_user_id');
    if (!uid) {
      window.location.href = '/';
      return;
    }
    setUserId(uid);

    Promise.allSettled([
      fetch('/api/completeness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid }),
      }).then(r => r.json()),
      fetch(`/api/scenario/completed?userId=${encodeURIComponent(uid)}`)
        .then(r => r.json()),
      fetch(`/api/scenario/voice-completed?userId=${encodeURIComponent(uid)}`)
        .then(r => r.json()),
    ]).then(([compResult, scenResult, voiceResult]) => {
      if (compResult.status === 'fulfilled' && compResult.value?.completeness) {
        setCompleteness({
          percent: compResult.value.completeness.percent ?? 0,
          measured_axes: compResult.value.completeness.measured_axes ?? 0,
        });
      }
      if (scenResult.status === 'fulfilled' && scenResult.value?.completed) {
        setCompleted(scenResult.value.completed);
      }
      if (voiceResult.status === 'fulfilled' && voiceResult.value?.completed) {
        setVoiceCompleted(voiceResult.value.completed);
      }
      setLoading(false);
    });
  }, []);

  const completedSet = new Set(completed);
  const voiceCompletedSet = new Set(voiceCompleted);
  const nextSid = SCENARIO_ORDER.find((sid) => !completedSet.has(sid));

  const MODES: { key: SignalMode; label: string; icon: string }[] = [
    { key: 'text', label: 'TEXT', icon: '✎' },
    { key: 'voice', label: 'VOICE', icon: '🎙' },
    { key: 'face', label: 'FACE', icon: '◉' },
  ];

  return (
    <div className="max-w-lg mx-auto px-5 py-8 pb-20">
      <p className="text-lg font-bold mb-6 text-fg">Signalogy</p>

      {/* ── 서브탭 ── */}
      <div className="flex gap-1 p-1 border border-line rounded-xl mb-6 bg-card">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              mode === m.key
                ? 'bg-bg-elevated text-fg'
                : 'text-dim hover:text-fg'
            }`}
          >
            <span className="text-sm">{m.icon}</span>
            <span>{m.label} Signal</span>
          </button>
        ))}
      </div>

      {/* ── 탭 콘텐츠 ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-line border-t-fg rounded-full animate-spin" />
        </div>
      ) : mode === 'text' ? (
        <TextSignalTab
          completed={completed}
          completedSet={completedSet}
          nextSid={nextSid}
          completeness={completeness}
        />
      ) : mode === 'voice' ? (
        <VoiceSignalTab textCompletedSet={completedSet} voiceCompletedSet={voiceCompletedSet} />
      ) : (
        <FaceSignalTab />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   TEXT Signal 탭 (기존 시나리오 목록)
   ════════════════════════════════════════════ */
function TextSignalTab({
  completed,
  completedSet,
  nextSid,
  completeness,
}: {
  completed: string[];
  completedSet: Set<string>;
  nextSid: ScenarioId | undefined;
  completeness: CompletenessData;
}) {
  return (
    <>
      <section className="p-5 border border-line rounded-xl mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-dim">signal 읽기</p>
          <p className="text-xl font-bold text-fg">{completeness.percent}%</p>
        </div>
        <div className="flex gap-1.5 mb-2">
          {SCENARIO_ORDER.map((_, i) => (
            <div key={i} className={`flex-1 h-2 rounded-full ${i < completed.length ? 'bg-accent' : 'bg-line'}`} />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-faint">
          <span>{completed.length}/5 시나리오</span>
          <span>측정 축 {completeness.measured_axes}/15</span>
        </div>
      </section>

      <div className="space-y-3">
        {SCENARIO_ORDER.map((sid, idx) => {
          const isDone = completedSet.has(sid);
          const isNext = sid === nextSid;
          const ctx = SCENARIO_CONTEXTS[sid];

          return (
            <div key={sid}
              className={`rounded-xl border ${
                isNext ? 'border-accent bg-card' : isDone ? 'border-line' : 'border-line opacity-30'
              }`}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs ${isDone ? 'text-dim' : isNext ? 'text-fg' : 'text-faint'}`}>
                      {isDone ? '✓' : isNext ? '▸' : '○'} {String(idx + 1).padStart(2, '0')}
                    </span>
                    <p className={`font-medium text-sm ${isDone || isNext ? 'text-fg' : 'text-dim'}`}>
                      {ctx.domainHint}
                    </p>
                  </div>
                  <span className="text-[10px] text-faint">{ctx.estimatedMinutes}</span>
                </div>

                <div className="flex gap-2 mt-3">
                  {isDone && (
                    <>
                      <Link href={`/scenario/${sid}/vector`}
                        className="flex-1 py-2 text-center text-[10px] border border-line rounded-lg text-dim hover:text-fg">
                        대화 + 벡터
                      </Link>
                      <Link href={`/scenario/${sid}?redo=1`}
                        className="flex-1 py-2 text-center text-[10px] border border-line rounded-lg text-dim hover:text-fg">
                        다시 하기
                      </Link>
                    </>
                  )}
                  {isNext && (
                    <Link href={`/scenario/${sid}`}
                      className="flex-1 py-2 text-center text-xs border border-line rounded-lg text-fg hover:bg-card">
                      시작 →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ════════════════════════════════════════════
   VOICE Signal 탭
   ════════════════════════════════════════════ */
function VoiceSignalTab({
  textCompletedSet,
  voiceCompletedSet,
}: {
  textCompletedSet: Set<string>;
  voiceCompletedSet: Set<string>;
}) {
  const voiceCount = SCENARIO_ORDER.filter((sid) => voiceCompletedSet.has(sid)).length;
  const voiceNextSid = SCENARIO_ORDER.find((sid) => textCompletedSet.has(sid) && !voiceCompletedSet.has(sid));

  return (
    <>
      <section className="p-5 border border-line rounded-xl mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🎙</span>
          <div>
            <p className="text-sm font-semibold text-fg">Voice Signal</p>
            <p className="text-[11px] text-dim">같은 시나리오를 음성으로 답합니다</p>
          </div>
        </div>
        <p className="text-xs text-dim leading-relaxed">
          텍스트와 동일한 5개 시나리오에 목소리로 답합니다.
          음성 특성 (피치, 에너지, 톤)이 기록되며, 이후 <span className="text-fg font-medium">음성 로그인</span>의 본인 인증에 사용됩니다.
        </p>
        <div className="flex gap-1.5 mt-4 mb-1">
          {SCENARIO_ORDER.map((_, i) => (
            <div key={i} className={`flex-1 h-2 rounded-full ${i < voiceCount ? 'bg-accent' : 'bg-line'}`} />
          ))}
        </div>
        <p className="text-[10px] text-faint">{voiceCount}/5 음성 시나리오</p>
      </section>

      <div className="space-y-3">
        {SCENARIO_ORDER.map((sid, idx) => {
          const ctx = SCENARIO_CONTEXTS[sid];
          const textDone = textCompletedSet.has(sid);
          const voiceDone = voiceCompletedSet.has(sid);
          const isNext = sid === voiceNextSid;

          return (
            <div key={sid}
              className={`rounded-xl border ${
                voiceDone ? 'border-line' : isNext ? 'border-accent bg-card' : 'border-line opacity-30'
              }`}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs ${voiceDone ? 'text-dim' : isNext ? 'text-fg' : 'text-faint'}`}>
                      {voiceDone ? '✓' : isNext ? '▸' : '○'} {String(idx + 1).padStart(2, '0')}
                    </span>
                    <p className={`font-medium text-sm ${voiceDone || isNext ? 'text-fg' : 'text-dim'}`}>
                      {ctx.domainHint}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!textDone && (
                      <span className="text-[9px] text-warn">TEXT 먼저</span>
                    )}
                    <span className="text-[10px] text-faint">{ctx.estimatedMinutes}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  {voiceDone && (
                    <Link href={`/scenario/${sid}/voice`}
                      className="flex-1 py-2 text-center text-[10px] border border-line rounded-lg text-dim hover:text-fg">
                      다시 녹음
                    </Link>
                  )}
                  {!voiceDone && isNext && (
                    <Link href={`/scenario/${sid}/voice`}
                      className="flex-1 py-2 text-center text-xs border border-line rounded-lg text-fg hover:bg-card">
                      🎙 음성으로 시작 →
                    </Link>
                  )}
                  {!voiceDone && !isNext && textDone && (
                    <Link href={`/scenario/${sid}/voice`}
                      className="flex-1 py-2 text-center text-[10px] border border-line rounded-lg text-dim hover:text-fg">
                      🎙 음성으로 시작
                    </Link>
                  )}
                  {!textDone && (
                    <div className="flex-1 py-2 text-center text-xs border border-line rounded-lg text-faint cursor-not-allowed">
                      TEXT 시나리오를 먼저 완료하세요
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ════════════════════════════════════════════
   FACE Signal 탭 (Coming Soon)
   ════════════════════════════════════════════ */
function FaceSignalTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full border border-line flex items-center justify-center mb-5">
        <span className="text-3xl opacity-30">◉</span>
      </div>
      <p className="text-sm font-semibold text-dim mb-2">Face Signal</p>
      <p className="text-xs text-faint leading-relaxed max-w-[260px]">
        표정과 미세 반응으로 잠재의식을 읽는 기능입니다.
        <br />
        곧 출시됩니다.
      </p>
      <div className="mt-6 px-4 py-2 border border-line rounded-lg">
        <span className="text-[10px] text-faint tracking-wider">COMING SOON</span>
      </div>
    </div>
  );
}
