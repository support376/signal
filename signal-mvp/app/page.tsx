'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!id.trim()) {
      setError('ID를 입력해줘');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id.trim(), name: name.trim() || id.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'login failed');
      // 쿠키 저장 (브라우저)
      document.cookie = `signal_user_id=${data.id}; path=/; max-age=${60 * 60 * 24 * 30}`;
      document.cookie = `signal_user_name=${encodeURIComponent(data.name)}; path=/; max-age=${60 * 60 * 24 * 30}`;
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
          <p className="text-dim text-sm mt-2">Internal MVP</p>
        </div>

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
            disabled={loading}
            className="w-full py-3 bg-accent text-bg font-semibold rounded-lg hover:bg-accent2 transition disabled:opacity-50"
          >
            {loading ? '...' : '시작'}
          </button>
        </form>

        <p className="text-xs text-dim mt-6 text-center leading-relaxed">
          ID는 식별자입니다. 같은 ID로 다시 들어오면 진행 상태가 이어집니다.
          이건 사고 실험이고 언제든 중단할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
