'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ShareModal from '@/app/components/share-modal';
import { trackedFetch } from '@/app/components/api-debug';
import { LENSES, type Lens } from '@/lib/types';

interface ChemHistory {
  user_a_id: string; user_b_id: string; user_a_name: string; user_b_name: string;
  lens: string; score: number; created_at: string;
}

interface ScoredUser {
  id: string;
  name: string;
  slug: string;
  completed_count: number;
  score: number | null;
  reliability: string | null;
  major_conflicts_count: number;
}

const LENS_LABELS: Record<Lens, string> = { friend: '친구', romantic: '연인', family: '가족', work: '동료' };

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : null;
}

export default function ChemistryPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [users, setUsers] = useState<ScoredUser[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [myProgress, setMyProgress] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [history, setHistory] = useState<ChemHistory[]>([]);

  const scoreLens: Lens = 'romantic';

  useEffect(() => {
    const id = readCookie('signal_user_id');
    if (!id) { router.push('/'); return; }
    void loadMe(id);
    void loadScores(id);
    void loadHistory(id);
  }, []);

  async function loadMe(id: string) {
    try {
      const { data } = await trackedFetch('/api/me', { body: JSON.stringify({ userId: id }) });
      setMe({ id: data.id, name: data.name, slug: data.slug });
    } catch {
      setMe({ id, name: id, slug: id });
    }
  }

  async function loadHistory(myId: string) {
    try {
      const { data } = await trackedFetch('/api/history', { body: JSON.stringify({ userId: myId }) });
      setHistory(data.chemistries || []);
    } catch {}
  }

  async function loadScores(myId: string) {
    setLoading(true);
    try {
      const [scoresResult, compResult] = await Promise.all([
        trackedFetch('/api/chemistry/scores', { body: JSON.stringify({ userId: myId, lens: scoreLens }) }),
        trackedFetch('/api/completeness', { body: JSON.stringify({ userId: myId }) }),
      ]);
      setUsers(scoresResult.data.users || []);
      setMyProgress(compResult.data?.completeness?.scenarios_completed || 0);
    } catch {}
    finally { setLoading(false); }
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return users;
    const q = query.trim().toLowerCase();
    return users.filter((u) => u.id.toLowerCase().includes(q) || u.name.toLowerCase().includes(q));
  }, [users, query]);

  return (
    <div className="max-w-lg mx-auto px-5 py-8 pb-20">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Chemistry</h1>
        <p className="text-sm text-white/30 mt-1">사람을 선택하면 관계 렌즈를 고를 수 있어.</p>
      </header>

      {/* 내 진행도 경고 */}
      {myProgress < 1 && (
        <div className="mb-6 p-4 border border-white/10 rounded-xl text-sm text-white/40">
          먼저 signal을 읽어야 해. <Link href="/scenario" className="text-white/70 underline">시작 →</Link>
        </div>
      )}

      {/* 케미 이력 */}
      {history.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] text-white/25 font-mono mb-2">최근 분석</p>
          <div className="space-y-1">
            {history.slice(0, 5).map((c) => {
              const otherId = c.user_a_id !== me?.id ? c.user_a_id : c.user_b_id;
              const otherName = c.user_a_id !== me?.id ? c.user_a_name : c.user_b_name;
              return (
                <Link key={`${c.user_a_id}-${c.user_b_id}-${c.lens}`}
                  href={`/chemistry/${otherId}/${c.lens}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.03] transition">
                  <span className="text-xs text-white/50 font-mono">@{otherId} · {c.lens}</span>
                  <span className="text-sm font-bold">{c.score}%</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 검색 */}
      <div className="mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ID 또는 이름으로 검색"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-white/30 focus:outline-none placeholder:text-white/20"
        />
      </div>

      {loading && <p className="text-white/20 text-sm text-center py-8">계산 중...</p>}

      {!loading && filtered.length === 0 && (
        <div className="py-12 text-center text-white/20 text-sm">
          {query ? `"${query}" 결과 없음` : '아직 다른 사용자가 없어.'}
        </div>
      )}

      {/* 사용자 목록 — 클릭하면 렌즈 선택 페이지로 */}
      <div className="space-y-2 mb-10">
        {filtered.map((u) => {
          const canClick = myProgress >= 1 && u.completed_count >= 1;
          return (
            <button
              key={u.id}
              onClick={() => canClick && router.push(`/chemistry/${u.id}`)}
              disabled={!canClick}
              className={`w-full text-left p-4 rounded-xl border transition ${
                canClick ? 'border-white/8 hover:border-white/20 hover:bg-white/[0.02]' : 'border-white/5 opacity-30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white/90">{u.name}</p>
                  <p className="text-[10px] text-white/20 font-mono mt-0.5">@{u.slug} · {u.completed_count}/5</p>
                </div>
                {u.score !== null ? (
                  <p className={`text-2xl font-bold ${u.score >= 70 ? 'text-white' : u.score >= 45 ? 'text-white/70' : 'text-white/40'}`}>
                    {u.score}<span className="text-sm text-white/30">%</span>
                  </p>
                ) : (
                  <p className="text-xs text-white/15">—</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 초대 (맨 아래) */}
      <div className="p-5 border border-white/5 rounded-xl text-center">
        <p className="text-sm text-white/50 mb-1">그 사람이 여기 없어?</p>
        <p className="text-xs text-white/25 mb-4">링크 보내. 15분만 하면 둘의 케미가 열려.</p>
        <button
          onClick={() => setShareOpen(true)}
          className="px-6 py-2 border border-white/15 text-white/60 text-xs rounded-lg hover:bg-white/5 transition"
        >
          초대 링크 보내기
        </button>
      </div>

      <p className="text-[10px] text-white/10 text-center mt-6 font-mono">
        점수 = 즉시 (무료). 상세 분석 = 크레딧 1
      </p>

      {me && <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} slug={me.slug} name={me.name} />}
    </div>
  );
}
