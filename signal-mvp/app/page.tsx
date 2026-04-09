'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingState from './components/loading-state';
import { LOGIN_PHASES } from '@/lib/loading-messages';

function LoginInner() {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  // ?ref=df 처리 — 쿠키에 30일 저장
  const refParam = searchParams.get('ref');
  useEffect(() => {
    if (refParam) {
      document.cookie = `signal_ref=${encodeURIComponent(refParam)}; path=/; max-age=${60 * 60 * 24 * 30}`;
    }
  }, [refParam]);

  function readRefCookie(): string | null {
    if (typeof document === 'undefined') return null;
    const m = document.cookie.match(/(^|;\s*)signal_ref=([^;]+)/);
    return m ? decodeURIComponent(m[2]) : null;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!id.trim()) {
      setError('ID를 입력해줘');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const referrerSlug = refParam || readRefCookie() || undefined;
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: id.trim(),
          name: name.trim() || id.trim(),
          referrerSlug,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'login failed');

      document.cookie = `signal_user_id=${data.id}; path=/; max-age=${60 * 60 * 24 * 30}`;
      document.cookie = `signal_user_name=${encodeURIComponent(data.name)}; path=/; max-age=${60 * 60 * 24 * 30}`;

      // 신규 가입 후 referral 쿠키 삭제 (한 번만 사용)
      if (data.isNew) {
        document.cookie = 'signal_ref=; path=/; max-age=0';
      }

      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-card border border-line rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">
            Signal
          </h1>
          <p className="text-dim text-sm mt-2">잠재의식 + 케미 분석</p>
        </div>

        {refParam && (
          <div className="mb-6 p-3 bg-accent/10 border border-accent/30 rounded-lg text-sm text-center">
            <p className="text-accent">
              <span className="font-semibold">@{refParam}</span> 가 너를 초대했어
            </p>
          </div>
        )}

        {loading ? (
          <LoadingState
            phases={LOGIN_PHASES}
            estimatedSec={5}
            hint="첫 로그인은 서버 콜드 스타트로 5~10초 걸릴 수 있어요"
            size="md"
          />
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-dim uppercase tracking-wider">ID (영문/숫자)</label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="예: junhyeok"
                className="w-full mt-1 px-4 py-3 bg-bg border border-line rounded-lg text-fg focus:border-accent focus:outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-dim uppercase tracking-wider">이름 (선택)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 박준혁"
                className="w-full mt-1 px-4 py-3 bg-bg border border-line rounded-lg text-fg focus:border-accent focus:outline-none"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              className="w-full py-3 bg-accent text-bg font-semibold rounded-lg hover:bg-accent2 transition"
            >
              시작
            </button>
          </form>
        )}

        <p className="text-xs text-dim mt-6 text-center leading-relaxed">
          ID는 식별자입니다. 같은 ID로 다시 들어오면 진행 상태가 이어집니다.
          이건 사고 실험이고 언제든 중단할 수 있습니다.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
