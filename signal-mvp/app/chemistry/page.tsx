'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ShareModal from '@/app/components/share-modal';
import { trackedFetch } from '@/app/components/api-debug';
import { LENSES, type Lens } from '@/lib/types';

interface ScoredUser {
  id: string;
  name: string;
  slug: string;
  completed_count: number;
  score: number | null;
  reliability: '낮음' | '중간' | '높음' | null;
  effective_axes: number;
  major_conflicts_count: number;
}

const LENS_LABELS: Record<Lens, string> = {
  friend: '친구',
  romantic: '연인',
  family: '가족',
  work: '동료',
};

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : null;
}

function scoreColor(score: number | null): string {
  if (score === null) return 'text-dim';
  if (score >= 75) return 'text-accent3';
  if (score >= 50) return 'text-accent';
  if (score >= 30) return 'text-amber-300';
  return 'text-red-400';
}

function reliabilityColor(rel: string | null): string {
  if (rel === '높음') return 'text-accent3';
  if (rel === '중간') return 'text-amber-300';
  return 'text-dim';
}

export default function ChemistryListPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [lens, setLens] = useState<Lens>('romantic');
  const [users, setUsers] = useState<ScoredUser[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [myProgress, setMyProgress] = useState<number>(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = readCookie('signal_user_id');
    const name = readCookie('signal_user_name');
    if (!id) {
      router.push('/');
      return;
    }
    void loadMe(id, name || id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (me) void loadScores(me.id, lens);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, lens]);

  async function loadMe(id: string, fallbackName: string) {
    try {
      const { data } = await trackedFetch('/api/me', { body: JSON.stringify({ userId: id }) });
      setMe({ id: data.id, name: data.name, slug: data.slug });
    } catch {
      setMe({ id, name: fallbackName, slug: id });
    }
  }

  async function loadScores(myId: string, currentLens: Lens) {
    setLoading(true);
    setError('');
    try {
      const { response: r, data } = await trackedFetch('/api/chemistry/scores', {
        body: JSON.stringify({ userId: myId, lens: currentLens }),
      });
      if (!r.ok) {
        setError(data.error || '실패');
        setUsers([]);
        setMyProgress(data.my_completed || 0);
      } else {
        setUsers(data.users || []);
        setMyProgress(data.my_completed || 0);
      }
    } catch (e: any) {
      setError(e.message);
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

  const myFullyReady = myProgress >= 5;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/dashboard" className="text-xs text-dim hover:text-accent">← 대시보드</Link>

      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-bold">궁금한 사람</h1>
        <p className="text-sm text-white/40 mt-2">진짜 맞는지, 여기서 확인해.</p>
      </header>

      {/* 친구 초대 카드 */}
      <div className="mb-6 p-4 bg-card border border-line rounded-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">그 사람이 여기 없어?</p>
            <p className="text-xs text-white/40 mt-1">링크 보내. 상대도 15분만 하면 둘의 케미가 열려.</p>
          </div>
          <button
            onClick={() => setShareOpen(true)}
            className="px-4 py-2 bg-accent text-bg text-sm font-semibold rounded-lg hover:bg-accent2 transition whitespace-nowrap"
          >
            📤 초대
          </button>
        </div>
      </div>

      {/* 내 진행도 안내 */}
      {myProgress < 1 && (
        <div className="mb-6 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl text-sm">
          <p className="text-amber-300 font-semibold mb-1">먼저 시나리오 1개 이상 완료해야 해</p>
          <p className="text-dim text-xs">
            현재 진행: <span className="text-accent3">{myProgress}/5</span>.
          </p>
        </div>
      )}
      {myProgress >= 1 && !myFullyReady && (
        <div className="mb-6 p-3 bg-amber-900/10 border border-amber-700/30 rounded-xl text-xs text-dim">
          나의 시나리오 {myProgress}/5 — 더 많이 풀수록 점수가 더 정확해져.
        </div>
      )}

      {/* 렌즈 토글 */}
      <div className="mb-6">
        <p className="text-xs text-dim uppercase tracking-wider mb-2">관계 렌즈</p>
        <div className="grid grid-cols-4 gap-2">
          {LENSES.map((l) => (
            <button
              key={l}
              onClick={() => setLens(l)}
              className={`py-2 px-3 text-sm rounded-lg border transition ${
                lens === l
                  ? 'bg-accent text-bg border-accent font-semibold'
                  : 'bg-card border-line text-dim hover:border-accent'
              }`}
            >
              {LENS_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      {/* Share modal */}
      {me && (
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          slug={me.slug}
          name={me.name}
        />
      )}

      {/* 검색 */}
      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름 또는 ID로 검색"
          className="w-full px-4 py-3 bg-card border border-line rounded-xl text-fg placeholder:text-dim focus:border-accent focus:outline-none"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-900/40 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading && <p className="text-dim text-sm text-center py-8">계산 중...</p>}

      {!loading && filtered.length === 0 && (
        <div className="p-8 bg-card border border-line rounded-xl text-center text-dim text-sm">
          {query ? `"${query}" 검색 결과 없음` : '아직 등록된 다른 사용자가 없어.'}
        </div>
      )}

      {/* 사용자 목록 (점수순 정렬) */}
      <div className="space-y-2">
        {filtered.map((u) => {
          const otherReady = u.completed_count >= 1;
          const canCompare = myProgress >= 1 && otherReady;

          return (
            <button
              key={u.id}
              onClick={() => canCompare && router.push(`/chemistry/${u.id}/${lens}`)}
              disabled={!canCompare}
              className={`w-full text-left p-5 border rounded-xl transition ${
                canCompare
                  ? 'bg-card border-line hover:border-accent2 cursor-pointer'
                  : 'bg-card/50 border-line/40 cursor-not-allowed opacity-50'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-lg truncate">{u.name}</p>
                  <p className="text-xs text-dim mt-0.5 font-mono">@{u.slug}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-dim">
                    <span>{u.completed_count}/5 시나리오</span>
                    {u.reliability && (
                      <span className={reliabilityColor(u.reliability)}>
                        신뢰도 {u.reliability}
                      </span>
                    )}
                    {u.major_conflicts_count > 0 && (
                      <span className="text-amber-300">
                        충돌 {u.major_conflicts_count}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {u.score !== null ? (
                    <p className={`text-3xl font-bold ${scoreColor(u.score)}`}>
                      {u.score}
                      <span className="text-base text-dim">%</span>
                    </p>
                  ) : (
                    <p className="text-xs text-dim">측정 안 됨</p>
                  )}
                  {canCompare && (
                    <p className="text-xs text-accent2 mt-1">narrative →</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-white/15 text-center mt-6 font-mono">
          점수 = 즉시 계산 (무료). 클릭 = 상세 분석 (크레딧 1)
        </p>
      )}
    </div>
  );
}
