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
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full">

        {!showLogin ? (
          <div className="text-center">
            {/* ── Stage A: Couple Chemistry ── */}
            <div className="mb-12">
              <p className="text-white/25 text-xs font-mono tracking-wider mb-8">SIGNALOGY</p>

              <div className="space-y-1 text-sm text-white/30 mb-8">
                <p>사주가 아닙니다.</p>
                <p>MBTI도 아닙니다.</p>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-white leading-snug mb-4">
                당신과 그 사람의<br />진짜 케미를 봅니다.
              </h1>

              <p className="text-sm text-white/40 leading-relaxed max-w-xs mx-auto">
                MBTI는 16개 박스. 사주는 태어난 날.<br />
                <span className="text-white/70">Signalogy는 당신이 실제로 한 선택.</span><br />
                그게 진짜.
              </p>
            </div>

            {/* ── 흐름 설명 (3 step) ── */}
            <div className="space-y-4 text-left max-w-xs mx-auto mb-12">
              {[
                { n: '1', t: '나의 signal 읽기', sub: '15분, 카톡처럼 대화' },
                { n: '2', t: '상대에게 링크 보내기', sub: '상대도 15분' },
                { n: '3', t: '둘의 케미 결과 열림', sub: '진짜 맞는지, 어디서 부딪히는지' },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-4">
                  <span className="text-white/15 text-xs font-mono mt-0.5">{s.n}</span>
                  <div>
                    <p className="text-sm text-white/80">{s.t}</p>
                    <p className="text-[11px] text-white/30">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowLogin(true)}
              className="w-full max-w-xs mx-auto block py-4 border border-white/20 text-white rounded-xl transition-all hover:bg-white/5 hover:border-white/40"
            >
              시작하기
            </button>

            <p className="text-[10px] text-white/10 mt-4 font-mono">무료 · 광고 없음 · 데이터 안 팔림</p>

            {refParam && (
              <div className="mt-8 p-4 border border-white/10 rounded-xl">
                <p className="text-sm">
                  <span className="text-white/70 font-medium">@{refParam}</span>
                  <span className="text-white/30"> 가 너와의 케미를 보고 싶어해.</span>
                </p>
                <p className="text-[10px] text-white/20 mt-2">너도 15분만 하면 둘의 결과가 열려.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-white/25 text-xs font-mono tracking-wider mb-6">SIGNALOGY</p>
            <p className="text-white/40 text-sm mb-8">케미를 보려면 먼저 너의 signal을 읽어야 해.</p>

            {loading ? (
              <LoadingState phases={LOGIN_PHASES} estimatedSec={5} hint="준비 중" size="sm" />
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
                <button type="button" onClick={() => setShowLogin(false)} className="w-full text-xs text-white/15 hover:text-white/30">
                  ← 돌아가기
                </button>
              </form>
            )}
          </div>
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
