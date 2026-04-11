'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { SCENARIO_LABELS, SCENARIO_CONTEXTS } from '@/lib/scenario-meta';
import { SCENARIOS, type ScenarioId } from '@/lib/types';
import LoadingState from '@/app/components/loading-state';
import ScenarioTransition from '@/app/components/scenario-transition';
import { FINALIZE_PHASES } from '@/lib/loading-messages';

interface Turn {
  turn_idx: number;
  agent_msg: string;
  user_msg: string | null;
  user_audio_url?: string | null;  // 음성 blob URL (로컬 재생용)
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : null;
}

/* ── 녹음 상태 ── */
type RecordingState = 'idle' | 'recording' | 'recorded';

function VoiceScenarioInner() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const scenarioId = params.id as ScenarioId;

  const [userId, setUserId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
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

  // 녹음 관련
  const [recState, setRecState] = useState<RecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 파형 시각화
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const ctx = SCENARIO_CONTEXTS[scenarioId];

  useEffect(() => {
    const uid = readCookie('signal_user_id');
    if (!uid) { router.push('/'); return; }
    if (!SCENARIOS.includes(scenarioId)) { setError('잘못된 시나리오 ID'); return; }
    setUserId(uid);
    void loadState(uid);
    return () => {
      // cleanup
      if (streamRef.current) streamRef.current.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
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
    } catch (e: any) {
      setError(e.message);
      setShowIntro(true);
    } finally {
      setLoading(false);
    }
  }

  /* ── 녹음 시작 ── */
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 파형 분석
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setRecState('recorded');
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };

      recorder.start(100);
      setRecState('recording');
      setRecordingDuration(0);

      // 타이머
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 200);

      // 파형 그리기
      drawWaveform(analyser);
    } catch (e: any) {
      setError('마이크 접근이 거부되었습니다. 브라우저 설정을 확인해주세요.');
    }
  }, []);

  /* ── 녹음 중지 ── */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  /* ── 재녹음 ── */
  const resetRecording = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecState('idle');
    setRecordingDuration(0);
  }, [audioUrl]);

  /* ── 파형 시각화 ── */
  function drawWaveform(analyser: AnalyserNode) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      canvasCtx!.fillStyle = 'rgba(10, 10, 10, 0.3)';
      canvasCtx!.fillRect(0, 0, canvas!.width, canvas!.height);

      const barWidth = (canvas!.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas!.height * 0.8;
        const brightness = 0.3 + (dataArray[i] / 255) * 0.7;
        canvasCtx!.fillStyle = `rgba(255, 255, 255, ${brightness * 0.6})`;
        canvasCtx!.fillRect(x, canvas!.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    }
    draw();
  }

  /* ── 음성 전송 ── */
  async function sendVoiceResponse() {
    if (!audioBlob || !userId || loading) return;

    // 음성을 텍스트로도 변환해서 보여주기 위해 placeholder 사용
    // 실제 STT는 백엔드에서 처리 — 현재는 음성 녹음 자체를 기록
    const currentAudioUrl = audioUrl;
    setLoading(true);
    setError('');

    // 낙관적 UI 업데이트 — 음성 메시지 표시
    setTurns((ts: Turn[]) => {
      const last = ts[ts.length - 1];
      return [...ts.slice(0, -1), { ...last, user_msg: '🎙 음성 메시지', user_audio_url: currentAudioUrl }];
    });

    resetRecording();

    try {
      // 음성 데이터를 FormData로 전송
      // 현재는 텍스트 시나리오 API를 재사용 — 음성 표시 마커와 함께
      const r = await fetch('/api/scenario/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          scenarioId,
          userMessage: '🎙 [음성 응답]',
          inputMeta: { input_mode: 'voice', audio_duration: recordingDuration },
        }),
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

      const compR = await fetch('/api/completeness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const compData = await compR.json();
      const percent = compData?.completeness?.percent || 0;

      setTransitionData({ completedCount: data.completed_count || 1, completenessPercent: percent });
      setShowTransition(true);
      setFinalizing(false);
    } catch (e: any) {
      setError(e.message);
      setFinalizing(false);
    }
  }

  /* ── 시간 포맷 ── */
  function formatDuration(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // ─── TRANSITION ───
  if (showTransition && transitionData) {
    return (
      <ScenarioTransition
        completedScenarioId={scenarioId}
        completedCount={transitionData.completedCount}
        completenessPercent={transitionData.completenessPercent}
      />
    );
  }

  // ─── INTRO ───
  if (showIntro && turns.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 min-h-screen flex flex-col">
        <button onClick={() => router.push('/scenario')} className="text-xs text-dim hover:text-accent self-start">
          ← Signal
        </button>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full bg-card border border-line rounded-2xl p-8 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🎙</span>
                <span className="text-[10px] font-mono text-white/40 px-2 py-0.5 border border-white/10 rounded">VOICE MODE</span>
              </div>
              <p className="text-xs text-dim uppercase tracking-wider">상황</p>
              <h1 className="text-2xl font-bold mt-1">{SCENARIO_LABELS[scenarioId]}</h1>
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
              이번에는 <span className="text-white/80 font-medium">목소리</span>로 대답합니다.
              녹음 버튼을 누르고 말하면 돼. 떠오르는 대로 자연스럽게.
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button onClick={startScenario} disabled={loading}
              className="w-full py-3 bg-accent text-bg font-semibold rounded-lg hover:bg-accent2 transition disabled:opacity-50">
              {loading ? '...' : '🎙 음성 대화 시작'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── CHAT ───
  const lastTurn = turns[turns.length - 1];
  const canRecord = !finished && turns.length > 0 && lastTurn?.user_msg === null && !loading;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col min-h-screen">
      <header className="mb-4">
        <button onClick={() => router.push('/scenario')} className="text-xs text-dim hover:text-accent">
          ← Signal
        </button>
        <div className="flex items-center gap-2 mt-2">
          <h1 className="text-lg font-bold">{SCENARIO_LABELS[scenarioId]}</h1>
          <span className="text-[10px] font-mono text-white/30 px-1.5 py-0.5 border border-white/8 rounded">VOICE</span>
        </div>
        <p className="text-xs text-dim mt-1">{ctx.agentName} · 진행 {turns.length}/5</p>
      </header>

      <div className="flex-1 space-y-3 mb-4">
        {turns.map((t) => (
          <div key={t.turn_idx} className="space-y-2">
            {/* Agent 말풍선 */}
            <div className="flex items-end gap-2 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-card border border-line flex items-center justify-center text-xs flex-shrink-0">
                {ctx.agentName[0]}
              </div>
              <div>
                <p className="text-[10px] text-dim ml-1 mb-0.5">{ctx.agentName}</p>
                <div className="bg-card border border-line rounded-2xl rounded-bl-sm px-4 py-3">
                  <p className="whitespace-pre-wrap leading-relaxed text-sm">{t.agent_msg}</p>
                </div>
              </div>
            </div>
            {/* 내 음성 말풍선 */}
            {t.user_msg && (
              <div className="flex justify-end max-w-[85%] ml-auto">
                <div className="bg-accent/15 border border-accent/25 rounded-2xl rounded-br-sm px-4 py-3">
                  {t.user_audio_url ? (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎙</span>
                      <audio src={t.user_audio_url} controls className="h-8" style={{ maxWidth: '200px' }} />
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed text-sm">{t.user_msg}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {/* 타이핑 인디케이터 */}
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
        <div className="text-sm text-red-400 mb-3 p-3 bg-red-900/20 border border-red-900/40 rounded-lg">
          {error}
        </div>
      )}

      {/* ── 음성 입력 영역 ── */}
      {canRecord && (
        <div className="sticky bottom-0 bg-bg/80 backdrop-blur-md border-t border-line px-3 py-4">
          <div className="max-w-2xl mx-auto">
            {recState === 'idle' && (
              <button
                onClick={startRecording}
                className="w-full flex items-center justify-center gap-3 py-4 border border-white/15 rounded-2xl hover:bg-white/5 transition group"
              >
                <div className="w-12 h-12 rounded-full bg-red-500/20 border-2 border-red-400/50 flex items-center justify-center group-hover:bg-red-500/30 transition">
                  <div className="w-4 h-4 rounded-full bg-red-400" />
                </div>
                <span className="text-sm text-white/60">탭하여 녹음 시작</span>
              </button>
            )}

            {recState === 'recording' && (
              <div className="space-y-3">
                {/* 파형 */}
                <canvas
                  ref={canvasRef}
                  width={320}
                  height={60}
                  className="w-full h-[60px] rounded-lg bg-black/30"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-mono text-red-400">{formatDuration(recordingDuration)}</span>
                  </div>
                  <button
                    onClick={stopRecording}
                    className="px-5 py-2.5 bg-white/10 border border-white/15 rounded-xl text-sm text-white/80 hover:bg-white/15 transition"
                  >
                    ■ 녹음 완료
                  </button>
                </div>
              </div>
            )}

            {recState === 'recorded' && audioUrl && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 border border-white/10 rounded-xl">
                  <span className="text-lg">🎙</span>
                  <audio src={audioUrl} controls className="flex-1 h-10" />
                  <span className="text-xs text-white/30 font-mono">{formatDuration(recordingDuration)}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={resetRecording}
                    className="flex-1 py-3 border border-white/10 rounded-xl text-sm text-white/40 hover:text-white/60 transition"
                  >
                    다시 녹음
                  </button>
                  <button
                    onClick={sendVoiceResponse}
                    className="flex-1 py-3 bg-accent text-bg rounded-xl text-sm font-semibold hover:bg-accent2 transition"
                  >
                    전송 ↑
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {finished && !finalizing && (
        <div className="bg-card border border-accent3 rounded-2xl p-6 text-center">
          <p className="text-accent3 font-semibold mb-2">✓ 음성 시나리오 완료</p>
          <p className="text-sm text-dim mb-4">분석을 시작하면 결과가 저장됩니다.</p>
          <button onClick={finalize}
            className="px-6 py-3 bg-accent3 text-bg rounded-lg font-semibold hover:opacity-80">
            분석하기
          </button>
        </div>
      )}

      {finalizing && (
        <div className="bg-card border border-line rounded-2xl p-6">
          <LoadingState phases={FINALIZE_PHASES} estimatedSec={20}
            hint="대화에서 15축을 추출 + 통합 + 자기 분석에 반영하는 중. 보통 15~25초" />
        </div>
      )}
    </div>
  );
}

export default function VoiceScenarioPage() {
  return (
    <Suspense fallback={null}>
      <VoiceScenarioInner />
    </Suspense>
  );
}
