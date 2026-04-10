'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingState from './components/loading-state';
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
      {/* 배경 제거 — 가독성 우선 */}

      {/* ══════ HERO ══════ */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative z-10">
        <div className="max-w-3xl">
          <p className="text-xs font-mono text-dim tracking-[0.3em] uppercase mb-6">// reading your signal</p>

          <h1 className="text-hero-sm md:text-hero font-bold text-neon-cyan" style={{ animation: 'flicker 4s ease-in-out infinite' }}>
            Signalogy
          </h1>

          <div className="mt-10 space-y-3">
            <p className="text-base md:text-lg text-dim tracking-wide">
              사주는 운명을 본다.
            </p>
            <p className="text-base md:text-lg text-neon-cyan font-medium tracking-wide opacity-80">
              Signalogy는 너의 signal을 본다.
            </p>
          </div>

          <p className="text-dim/60 text-sm max-w-sm mx-auto mt-10 leading-relaxed font-mono">
            AI 대화 → 잠재의식 측정 → 진짜 호환성 분석
          </p>

          <button
            onClick={() => startRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="mt-12 group relative px-10 py-4 border border-accent3/40 text-accent3 font-mono font-semibold rounded-xl text-sm uppercase tracking-wider transition-all hover:bg-accent3/10 hover:shadow-lg hover:shadow-accent3/10"
          >
            <span className="mr-2 text-accent3/60">{'>'}</span>
            START FREE
            <span className="ml-2 text-accent3/60">_</span>
          </button>

          <p className="text-[10px] text-dim/30 mt-6 font-mono">~15 min · free · no signup wall</p>
        </div>

        <div className="absolute bottom-10 text-accent3/20 text-sm font-mono animate-bounce">▼</div>
      </section>

      {/* ══════ FEATURES ══════ */}
      <section className="py-32 px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-mono text-accent/60 tracking-[0.3em] uppercase mb-4">// features</p>
          <h2 className="text-center text-2xl md:text-3xl font-bold mb-20 tracking-tight">이런 걸 알 수 있어</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: '◇',
                label: 'SELF',
                title: '나를 안다',
                desc: '15가지 심리 축으로 가치관, 성격, 애착 분석. 16칸이 아닌 살아있는 narrative.',
              },
              {
                icon: '◆',
                label: 'MATCH',
                title: '우리를 안다',
                desc: '친구 · 연인 · 가족 · 동료 — 4개 렌즈로 진짜 호환성.',
              },
              {
                icon: '▸',
                label: 'SHARE',
                title: '공유한다',
                desc: 'Signalogy 프로필 공유. 카톡 한 번이면 케미 분석 시작.',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="glass rounded-2xl p-8 scan-line border-glow transition-all group"
              >
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-accent text-xl font-mono">{item.icon}</span>
                  <span className="text-[10px] font-mono text-accent/60 tracking-[0.2em] uppercase">{item.label}</span>
                </div>
                <h3 className="font-semibold text-lg mb-3 text-fg">{item.title}</h3>
                <p className="text-sm text-dim leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ HOW IT WORKS ══════ */}
      <section className="py-32 px-6 relative z-10">
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-mono text-accent/60 tracking-[0.3em] uppercase mb-4">// process</p>
          <h2 className="text-center text-2xl md:text-3xl font-bold mb-20 tracking-tight">어떻게 작동해</h2>

          <div className="space-y-12">
            {[
              { n: '01', title: 'AI와 대화', desc: '카톡처럼 자연스럽게. 정답은 없어.' },
              { n: '02', title: '잠재의식 측정', desc: '15가지 심리 축을 추출. 의식 못 하는 것까지.' },
              { n: '03', title: '결과 확인', desc: '성격 프로파일 + 케미 분석.' },
            ].map((item) => (
              <div key={item.n} className="flex gap-8 items-start">
                <div className="flex-shrink-0 w-14 h-14 rounded-xl glass glow-cyan flex items-center justify-center font-mono text-accent text-lg font-bold">
                  {item.n}
                </div>
                <div className="pt-2">
                  <p className="font-semibold text-lg tracking-tight">{item.title}</p>
                  <p className="text-sm text-dim mt-2 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ COMPARE ══════ */}
      <section className="py-32 px-6 relative z-10">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-xs font-mono text-accent/60 tracking-[0.3em] uppercase mb-4">// compare</p>
          <h2 className="text-center text-2xl md:text-3xl font-bold mb-20 tracking-tight">뭐가 다른데</h2>

          <div className="glass rounded-2xl overflow-hidden glow-cyan">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-accent/10">
                  <th className="text-left py-5 px-6 text-dim font-mono text-xs" />
                  <th className="text-center py-5 px-4 text-dim font-mono text-xs">사주</th>
                  <th className="text-center py-5 px-4 text-dim font-mono text-xs">MBTI</th>
                  <th className="text-center py-5 px-4 text-accent font-mono text-xs font-bold">SIGNALOGY</th>
                </tr>
              </thead>
              <tbody className="text-center">
                {[
                  ['기반', '생년월일', '자기보고', 'AI 대화'],
                  ['조작', '불가', '가능', '불가'],
                  ['결과', '점수', '4글자', 'narrative'],
                  ['호환성', '궁합만', '—', '4렌즈 × 15축'],
                  ['학술', '—', '약함', '5개 표준'],
                  ['비용', '유료', '무료', '무료'],
                ].map(([label, ...cols], i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="text-left py-4 px-6 text-dim font-mono text-xs">{label}</td>
                    {cols.map((c, j) => (
                      <td key={j} className={`py-4 px-4 font-mono text-xs ${j === 2 ? 'text-accent3 font-semibold' : 'text-fg/50'}`}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══════ PRIVACY ══════ */}
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-dim/40 text-[10px] font-mono tracking-[0.3em] uppercase mb-4">[ PRIVACY ]</p>
          <p className="text-sm text-dim/60 leading-relaxed font-mono">
            데이터는 광고에 팔리지 않는다.<br />
            Signalogy는 너의 signal을 위한 인프라.
          </p>
        </div>
      </section>

      {/* ══════ START ══════ */}
      <section ref={startRef} id="start" className="py-32 px-6 relative z-10">
        <div className="max-w-sm mx-auto">
          <div className="glass rounded-2xl p-10 glow-cyan">
            <div className="text-center mb-10">
              <p className="text-[10px] font-mono text-accent/60 tracking-[0.3em] uppercase mb-3">// initialize</p>
              <h2 className="text-2xl font-bold tracking-tight text-neon-cyan">시작하기</h2>
              <p className="text-xs text-dim/50 mt-3 font-mono">~15 min · free</p>
            </div>

            {refParam && (
              <div className="mb-8 p-4 glass-light rounded-xl text-sm text-center font-mono">
                <span className="text-accent3">@{refParam}</span>
                <span className="text-dim/60"> invited you</span>
              </div>
            )}

            {loading ? (
              <LoadingState phases={LOGIN_PHASES} estimatedSec={5} hint="서버 준비 중" size="md" />
            ) : (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="text-[10px] text-dim/60 font-mono uppercase tracking-[0.2em]">{'>'} ID</label>
                  <input type="text" value={id} onChange={(e) => setId(e.target.value)} placeholder="영문/숫자"
                    className="w-full mt-2 px-5 py-4 bg-black border border-accent/15 rounded-xl text-fg font-mono focus:border-accent/40 focus:outline-none transition-colors placeholder:text-dim/30" autoFocus />
                </div>
                <div>
                  <label className="text-[10px] text-dim/60 font-mono uppercase tracking-[0.2em]">{'>'} NAME</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="한글/영문"
                    className="w-full mt-2 px-5 py-4 bg-black border border-accent/15 rounded-xl text-fg font-mono focus:border-accent/40 focus:outline-none transition-colors placeholder:text-dim/30" />
                </div>
                {error && <p className="text-sm text-red-400 font-mono">{error}</p>}
                <button type="submit"
                  className="w-full py-4 border border-accent3/40 text-accent3 font-mono font-semibold rounded-xl transition-all hover:bg-accent3/10 hover:shadow-lg hover:shadow-accent3/10 text-sm uppercase tracking-wider">
                  <span className="text-accent3/60">{'>'}</span> INITIALIZE <span className="text-accent3/60">_</span>
                </button>
              </form>
            )}

            <p className="text-[10px] text-dim/20 mt-10 text-center font-mono">
              same ID → resume session
            </p>
          </div>
        </div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer className="py-12 px-6 text-center relative z-10">
        <p className="text-[10px] text-dim/15 font-mono tracking-[0.2em]">
          SIGNALOGY — READING YOUR SIGNAL
        </p>
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
