'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserRow {
  id: string;
  name: string;
  completed_count: number;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : null;
}

export default function ChemistryListPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [myProgress, setMyProgress] = useState<number>(0);

  useEffect(() => {
    const id = readCookie('signal_user_id');
    const name = readCookie('signal_user_name');
    if (!id) {
      router.push('/');
      return;
    }
    setMe({ id, name: name || id });
    void loadUsers(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadUsers(myId: string) {
    setLoading(true);
    try {
      const r = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excludeId: myId }),
      });
      const data = await r.json();
      setUsers(data.users || []);
      // 내 진행 상태 별도 fetch (전체 목록에 포함되지 않으므로)
      const r2 = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data2 = await r2.json();
      const meRow = (data2.users || []).find((u: UserRow) => u.id === myId);
      setMyProgress(meRow?.completed_count || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return users;
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) => u.id.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
    );
  }, [users, query]);

  const myReady = myProgress >= 1; // 1개 이상 완료하면 케미 가능
  const myFullyReady = myProgress >= 5;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/dashboard" className="text-xs text-dim hover:text-accent">← 대시보드</Link>

      <header className="mt-4 mb-8">
        <h1 className="text-3xl font-bold">케미 테스트</h1>
        <p className="text-sm text-dim mt-2">상대방을 선택해. 부분 데이터로도 가능 (정확도는 낮아).</p>
      </header>

      {/* 내 상태 경고 */}
      {!myReady && (
        <div className="mb-6 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl text-sm">
          <p className="text-amber-300 font-semibold mb-1">먼저 시나리오 1개라도 완료해야 해</p>
          <p className="text-dim text-xs">
            현재 진행: <span className="text-accent3">{myProgress}/5</span>. 1개 이상부터 케미 가능 (단 정확도 낮음).
          </p>
        </div>
      )}
      {myReady && !myFullyReady && (
        <div className="mb-6 p-4 bg-amber-900/10 border border-amber-700/30 rounded-xl text-sm">
          <p className="text-amber-300 font-semibold mb-1">⚠️ 완성도 낮음</p>
          <p className="text-dim text-xs">
            시나리오 {myProgress}/5 완료. 케미 분석은 가능하지만 정확도가 낮을 수 있어. 5개 모두 완료하면 더 깊은 분석이 나와.
          </p>
        </div>
      )}

      {/* 검색 */}
      <div className="mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름 또는 ID로 검색"
          className="w-full px-4 py-3 bg-card border border-line rounded-xl text-fg placeholder:text-dim focus:border-accent focus:outline-none"
        />
      </div>

      {loading && <p className="text-dim text-sm">불러오는 중...</p>}

      {!loading && filtered.length === 0 && (
        <div className="p-8 bg-card border border-line rounded-xl text-center text-dim text-sm">
          {query ? `"${query}" 검색 결과 없음` : '아직 등록된 다른 사용자가 없어.'}
        </div>
      )}

      {/* 사용자 목록 */}
      <div className="space-y-2">
        {filtered.map((u) => {
          const otherReady = u.completed_count >= 1;
          const canCompare = myReady && otherReady;
          const otherFullyReady = u.completed_count >= 5;

          return (
            <button
              key={u.id}
              onClick={() => canCompare && router.push(`/chemistry/${u.id}`)}
              disabled={!canCompare}
              className={`w-full text-left p-5 border rounded-xl transition ${
                canCompare
                  ? 'bg-card border-line hover:border-accent2 cursor-pointer'
                  : 'bg-card/50 border-line/40 cursor-not-allowed opacity-50'
              }`}
            >
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="font-semibold text-lg">{u.name}</p>
                  <p className="text-xs text-dim mt-1">{u.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs">
                    {otherFullyReady ? (
                      <span className="text-accent3">✓ 5/5 완료</span>
                    ) : otherReady ? (
                      <span className="text-amber-300">{u.completed_count}/5 (부분)</span>
                    ) : (
                      <span className="text-dim">시나리오 0개</span>
                    )}
                  </p>
                  {canCompare && (
                    <p className={`text-xs mt-1 ${otherFullyReady ? 'text-accent2' : 'text-amber-300'}`}>
                      선택 →
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
