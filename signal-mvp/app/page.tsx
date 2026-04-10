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
  const [showLogin, setShowLogin] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const refParam = searchParams.get('ref');
  useEffect(() => {
    if (refParam) document.cookie = `signal_ref=${encodeURIComponent(refParam)}; path=/; max-age=${60*60*24*30}`;
    const existingId = document.cookie.match(/(^|;\s*)signal_user_id=([^;]+)/)?.[2];
    if (existingId && !refParam) router.replace('/dashboard');
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
    <div className="min-h-screen flex flex-col">

      {/* ══════ HERO — 첫 화면에 다 보이게 ══════ */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl">
          <h1 className="text-hero-sm md:text-hero font-bold text-white" style={{ animation: 'flicker 4s ease-in-out infinite' }}>
            Signalogy
          </h1>

          <p className="text-sm md:text-base text-white/50 mt-6 leading-relaxed">
            사주는 운명을 본다. <span className="text-white/90 font-medium">Signalogy는 너의 signal을 본다.</span>
          </p>

          <p className="text-white/30 text-xs md:text-sm max-w-sm mx-auto mt-6 leading-relaxed font-mono">
            AI 대화 → 잠재의식 측정 → 진짜 호환성 분석
          </p>

          {!showLogin ? (
            <div className="mt-10 space-y-3">
              <button
                onClick={() => setShowLogin(true)}
                className="px-10 py-4 border border-white/20 text-white font-mono text-sm uppercase tracking-wider rounded-xl transition-all hover:bg-white/5 hover:border-white/40"
              >
                {'>'} START FREE_
              </button>
              <p className="text-[10px] text-white/20 font-mono">~15 min · free</p>
            </div>
          ) : (
            /* ── 인라인 로그인 (스크롤 없이 같은 화면) ── */
            <div className="mt-10 max-w-xs mx-auto">
              {refParam && (
                <div className="mb-6 p-3 border border-white/10 rounded-xl text-sm text-center font-mono">
                  <span className="text-white/80">@{refParam}</span>
                  <span className="text-white/30"> invited you</span>
                </div>
              )}

              {loading ? (
                <LoadingState phases={LOGIN_PHASES} estimatedSec={5} hint="서버 준비 중" size="sm" />
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="text-[10px] text-white/30 font-mono uppercase tracking-wider">{'>'} ID</label>
                    <input type="text" value={id} onChange={(e) => setId(e.target.value)} placeholder="영문/숫자"
                      className="w-full mt-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm focus:border-white/30 focus:outline-none placeholder:text-white/15" autoFocus />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 font-mono uppercase tracking-wider">{'>'} NAME</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름"
                      className="w-full mt-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm focus:border-white/30 focus:outline-none placeholder:text-white/15" />
                  </div>
                  {error && <p className="text-sm text-red-400 font-mono">{error}</p>}
                  <button type="submit" className="w-full py-3 border border-white/20 text-white font-mono text-sm uppercase tracking-wider rounded-xl transition-all hover:bg-white/5">
                    {'>'} INITIALIZE_
                  </button>
                  <button type="button" onClick={() => setShowLogin(false)} className="w-full text-[10px] text-white/20 font-mono hover:text-white/40">
                    ← back
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── 최하단 미니멀 ── */}
      <footer className="py-6 text-center text-[10px] text-white/10 font-mono">
        SIGNALOGY
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
