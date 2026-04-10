'use client';

import { Suspense, useEffect, useState } from 'react';
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md w-full">

        {!showLogin ? (
          <>
            {/* ── 욕망 자극 ── */}
            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-8">
              궁금한 사람이<br />있어?
            </h1>

            <div className="space-y-2 text-white/40 text-sm md:text-base mb-12">
              <p>왜 자꾸 끌리는지.</p>
              <p>왜 자꾸 부딪히는지.</p>
              <p className="text-white/70 font-medium">진짜 맞는 건지.</p>
            </div>

            <p className="text-white/20 text-xs font-mono mb-8">Signalogy가 알려줄게.</p>

            <button
              onClick={() => setShowLogin(true)}
              className="w-full max-w-xs mx-auto block py-4 border border-white/20 text-white font-mono text-sm rounded-xl transition-all hover:bg-white/5 hover:border-white/40"
            >
              알아보기
            </button>

            <p className="text-[10px] text-white/15 mt-4 font-mono">15분 · 무료 · 카톡처럼 대화하면 끝</p>

            {refParam && (
              <div className="mt-8 p-3 border border-white/10 rounded-xl text-sm font-mono">
                <span className="text-white/60">@{refParam}</span>
                <span className="text-white/25"> 가 너와의 케미가 궁금하대</span>
              </div>
            )}
          </>
        ) : (
          <>
            {/* ── 로그인 폼 ── */}
            <p className="text-white/30 text-xs font-mono mb-6">케미를 보려면 먼저 너의 signal을 읽어야 해.</p>

            {loading ? (
              <LoadingState phases={LOGIN_PHASES} estimatedSec={5} hint="서버 준비 중" size="sm" />
            ) : (
              <form onSubmit={handleLogin} className="space-y-4 max-w-xs mx-auto">
                <input type="text" value={id} onChange={(e) => setId(e.target.value)} placeholder="ID (영문/숫자)"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-white/30 focus:outline-none placeholder:text-white/20" autoFocus />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-white/30 focus:outline-none placeholder:text-white/20" />
                {error && <p className="text-sm text-red-400">{error}</p>}
                <button type="submit" className="w-full py-3 border border-white/20 text-white text-sm rounded-xl transition-all hover:bg-white/5">
                  시작
                </button>
                <button type="button" onClick={() => setShowLogin(false)} className="w-full text-xs text-white/20 hover:text-white/40">
                  ← 돌아가기
                </button>
              </form>
            )}
          </>
        )}

      </div>
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
