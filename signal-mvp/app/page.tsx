'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingState from './components/loading-state';
import MatrixRain from './components/matrix-rain';
import { LOGIN_PHASES } from '@/lib/loading-messages';

function LandingInner() {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const startRef = useRef<HTMLDivElement>(null);

  const refParam = searchParams.get('ref');
  useEffect(() => {
    if (refParam) document.cookie = `signal_ref=${encodeURIComponent(refParam)}; path=/; max-age=${60*60*24*30}`;
    const existingId = document.cookie.match(/(^|;\s*)signal_user_id=([^;]+)/)?.[2];
    if (existingId && !refParam) router.push('/dashboard');
  }, [refParam, router]);

  function readRefCookie(): string | null {
    const m = document.cookie.match(/(^|;\s*)signal_ref=([^;]+)/);
    return m ? decodeURIComponent(m[2]) : null;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!id.trim()) { setError('ID를 입력해줘'); return; }
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id.trim(), name: name.trim() || id.trim(), referrerSlug: refParam || readRefCookie() || undefined }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'failed');
      document.cookie = `signal_user_id=${data.id}; path=/; max-age=${60*60*24*30}`;
      document.cookie = `signal_user_name=${encodeURIComponent(data.name)}; path=/; max-age=${60*60*24*30}`;
      if (data.isNew) document.cookie = 'signal_ref=; path=/; max-age=0';
      router.push('/dashboard');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen relative">
      {/* ── Matrix Rain 배경 ── */}
      <MatrixRain opacity={0.035} />

      {/* ══════ HERO ══════ */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative z-10">
        <div className="max-w-3xl">
          {/* 로고 — 네온 글로우 */}
          <h1 className="text-hero-sm md:text-hero font-bold text-neon-cyan" style={{ animation: 'flicker 4s ease-in-out infinite' }}>
            Signalogy
          </h1>

          <div className="mt-8 space-y-2">
            <p className="text-lg md:text-xl text-fg/70 tracking-tight">
              사주는 운명을 본다.
            </p>
            <p className="text-lg md:text-xl text-neon-green font-medium tracking-tight">
              Signalogy는 너의 signal을 본다.
            </p>
          </div>

          <p className="text-dim text-sm md:text-base max-w-md mx-auto mt-10 leading-relaxed">
            AI 대화로 잠재의식을 측정하고,<br />
            누구와도 진짜 호환성을 분석한다.
          </p>

          <button
            onClick={() => startRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="mt-12 px-10 py-4 bg-accent3/20 border border-accent3/40 text-accent3 font-semibold rounded-2xl text-lg transition-all hover:bg-accent3/30 hover:shadow-lg hover:shadow-accent3/10 glow-green"
          >
            무료로 시작하기
          </button>

          <p className="text-xs text-dim/40 mt-5 font-mono">~ 15-20 min · free</p>
        </div>

        <div className="absolute bottom-10 text-accent3/20 text-xl animate-bounce">↓</div>
      </section>

      {/* ══════ 기능 카드 ══════ */}
      <section className="py-28 px-6 relative z-10 cyber-grid">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-2xl md:text-3xl font-bold mb-16 tracking-tight text-neon-cyan">
            이런 걸 알 수 있어
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { emoji: '🪞', title: '나를 안다', desc: '15가지 심리 축으로 가치관, 성격, 애착 분석. MBTI 16칸이 아니라, 살아있는 narrative로.', glow: 'glow-cyan' },
              { emoji: '💕', title: '우리를 안다', desc: '친구, 연인, 가족, 동료 — 4개 렌즈로 진짜 호환성. 어디서 만나고 어디서 부딪히는지.', glow: 'glow-purple' },
              { emoji: '📤', title: '공유한다', desc: 'Signalogy 프로필을 보내. 카톡이면 케미 분석 시작. QR로도.', glow: 'glow-green' },
            ].map((item) => (
              <div key={item.title} className={`glass rounded-3xl p-8 text-center scan-line border-glow ${item.glow} transition-all group`}>
                <div className="text-4xl mb-5 group-hover:scale-110 transition-transform">{item.emoji}</div>
                <h3 className="font-semibold text-lg mb-3 text-fg">{item.title}</h3>
                <p className="text-sm text-dim leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 작동 방식 ══════ */}
      <section className="py-28 px-6 relative z-10">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-center text-2xl md:text-3xl font-bold mb-16 tracking-tight">어떻게 작동해</h2>
          <div className="space-y-10">
            {[
              { step: '01', emoji: '💬', title: 'AI와 대화', desc: '카톡처럼 자연스럽게. 정답은 없어.' },
              { step: '02', emoji: '🧬', title: '잠재의식 측정', desc: 'AI가 15가지 심리 축을 추출. 의식 못 하는 것까지.' },
              { step: '03', emoji: '📊', title: '결과 확인', desc: '성격 프로파일 + 케미 분석.' },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl glass flex items-center justify-center font-mono text-accent3 font-bold text-sm glow-green">
                  {item.step}
                </div>
                <div className="pt-2">
                  <p className="font-semibold text-lg">{item.emoji} {item.title}</p>
                  <p className="text-sm text-dim mt-2 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 비교 ══════ */}
      <section className="py-28 px-6 relative z-10 cyber-grid">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-2xl md:text-3xl font-bold mb-16 tracking-tight">뭐가 다른데</h2>
          <div className="glass rounded-3xl overflow-hidden glow-cyan">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-accent/10">
                  <th className="text-left py-5 px-6 text-dim font-normal" />
                  <th className="text-center py-5 px-4 text-dim font-normal">사주</th>
                  <th className="text-center py-5 px-4 text-dim font-normal">MBTI</th>
                  <th className="text-center py-5 px-4 text-accent font-mono font-semibold">Signalogy</th>
                </tr>
              </thead>
              <tbody className="text-center">
                {[
                  ['기반', '생년월일', '자기보고', 'AI 대화 (잠재의식)'],
                  ['조작', '불가', '가능', '불가'],
                  ['결과', '점수', '4글자', 'narrative'],
                  ['호환성', '궁합만', '없음', '4렌즈 × 15축'],
                  ['학술', '없음', '약함', '5개 황금표준'],
                  ['비용', '유료', '무료', '무료'],
                ].map(([label, ...cols], i) => (
                  <tr key={i} className="border-b border-white/3">
                    <td className="text-left py-4 px-6 text-dim font-mono text-xs">{label}</td>
                    {cols.map((c, j) => (
                      <td key={j} className={`py-4 px-4 ${j === 2 ? 'text-accent3 font-medium' : 'text-fg/60'}`}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══════ 프라이버시 ══════ */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-dim/50 text-xs font-mono uppercase tracking-widest mb-4">[ PRIVACY ]</p>
          <p className="text-sm text-dim/70 leading-relaxed">
            너의 데이터는 광고에 팔리지 않아.<br />
            Signalogy는 너의 signal을 위한 인프라.
          </p>
        </div>
      </section>

      {/* ══════ 시작 ══════ */}
      <section ref={startRef} id="start" className="py-28 px-6 relative z-10">
        <div className="max-w-sm mx-auto">
          <div className="glass rounded-3xl p-10 glow-cyan">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-neon-cyan">시작하기</h2>
              <p className="text-xs text-dim mt-3 font-mono">~ 15-20 min · free</p>
            </div>

            {refParam && (
              <div className="mb-8 p-4 glass-light rounded-2xl text-sm text-center">
                <span className="font-mono text-accent3">@{refParam}</span> 가 너를 초대했어
              </div>
            )}

            {loading ? (
              <LoadingState phases={LOGIN_PHASES} estimatedSec={5} hint="서버 준비 중" size="md" />
            ) : (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="text-xs text-dim font-mono uppercase tracking-wider">ID</label>
                  <input type="text" value={id} onChange={(e) => setId(e.target.value)} placeholder="영문/숫자"
                    className="w-full mt-2 px-5 py-4 bg-bg border border-accent/10 rounded-2xl text-fg font-mono focus:border-accent/40 focus:outline-none transition-colors" autoFocus />
                </div>
                <div>
                  <label className="text-xs text-dim font-mono uppercase tracking-wider">이름</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="한글/영문"
                    className="w-full mt-2 px-5 py-4 bg-bg border border-accent/10 rounded-2xl text-fg focus:border-accent/40 focus:outline-none transition-colors" />
                </div>
                {error && <p className="text-sm text-red-400 font-mono">{error}</p>}
                <button type="submit"
                  className="w-full py-4 bg-accent3/20 border border-accent3/40 text-accent3 font-semibold rounded-2xl transition-all hover:bg-accent3/30 hover:shadow-lg hover:shadow-accent3/10 text-lg glow-green">
                  시작
                </button>
              </form>
            )}

            <p className="text-xs text-dim/30 mt-8 text-center font-mono">
              같은 ID → 이어서 진행
            </p>
          </div>
        </div>
      </section>

      {/* ══════ 푸터 ══════ */}
      <footer className="py-12 px-6 text-center text-xs text-dim/20 font-mono relative z-10">
        SIGNALOGY — reading your signal
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingInner />
    </Suspense>
  );
}
