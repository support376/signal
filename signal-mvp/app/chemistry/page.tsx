'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ShareModal from '@/app/components/share-modal';
import { trackedFetch } from '@/app/components/api-debug';
import type { Lens } from '@/lib/types';

interface ScoredUser { id: string; name: string; slug: string; completed_count: number; score: number | null; }
interface ChemHistory { user_a_id: string; user_b_id: string; user_a_name: string; user_b_name: string; lens: string; score: number; }

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : null;
}

export default function ChemistryPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ScoredUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [history, setHistory] = useState<ChemHistory[]>([]);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    const id = readCookie('signal_user_id');
    if (!id) { router.push('/'); return; }
    void loadMe(id);
    void loadHistory(id);
  }, []);

  async function loadMe(id: string) {
    try {
      const { data } = await trackedFetch('/api/me', { body: JSON.stringify({ userId: id }) });
      setMe({ id: data.id, name: data.name, slug: data.slug });
    } catch { setMe({ id, name: id, slug: id }); }
  }

  async function loadHistory(id: string) {
    try {
      const { data } = await trackedFetch('/api/history', { body: JSON.stringify({ userId: id }) });
      setHistory(data.chemistries || []);
    } catch {}
  }

  // 검색 시에만 점수 계산 (미리 안 함)
  async function doSearch(q: string) {
    if (!q.trim() || !me) return;
    setSearching(true);
    try {
      const { data } = await trackedFetch('/api/chemistry/scores', {
        body: JSON.stringify({ userId: me.id, lens: 'romantic' }),
      });
      const all: ScoredUser[] = data.users || [];
      const filtered = all.filter((u: ScoredUser) =>
        u.id.toLowerCase().includes(q.toLowerCase()) || u.name.toLowerCase().includes(q.toLowerCase())
      );
      setResults(filtered);
    } catch {}
    finally { setSearching(false); }
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-8 pb-20">
      <h1 className="text-lg font-bold mb-6">Chemistry</h1>

      {/* 검색 (인스타 스타일 — 탭하면 열림) */}
      {!searchOpen ? (
        <button onClick={() => setSearchOpen(true)}
          className="w-full p-3 border border-white/8 rounded-xl text-xs text-white/25 text-left mb-6 hover:border-white/15 transition">
          🔍 이름 또는 ID 검색
        </button>
      ) : (
        <div className="mb-6">
          <div className="flex gap-2 mb-3">
            <input type="text" value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch(query)}
              placeholder="이름 또는 ID"
              className="flex-1 px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-sm text-white focus:border-white/30 focus:outline-none placeholder:text-white/20"
              autoFocus />
            <button onClick={() => doSearch(query)}
              className="px-4 py-3 border border-white/15 rounded-xl text-xs text-white/60 hover:bg-white/5 transition">
              검색
            </button>
          </div>
          <button onClick={() => { setSearchOpen(false); setQuery(''); setResults([]); }}
            className="text-[10px] text-white/20 hover:text-white/40">닫기</button>

          {/* 검색 결과 */}
          {searching && <p className="text-xs text-white/20 py-4 text-center">검색 중...</p>}
          {results.length > 0 && (
            <div className="mt-3 space-y-1">
              {results.map((u) => (
                <button key={u.id} onClick={() => router.push(`/chemistry/${u.id}`)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition text-left">
                  <div>
                    <p className="text-sm text-white/80">{u.name}</p>
                    <p className="text-[10px] text-white/20 font-mono">@{u.slug}</p>
                  </div>
                  {u.score !== null && <p className="text-lg font-bold">{u.score}%</p>}
                </button>
              ))}
            </div>
          )}
          {!searching && query && results.length === 0 && (
            <p className="text-xs text-white/15 text-center py-4">결과 없음</p>
          )}
        </div>
      )}

      {/* 케미 이력 */}
      {history.length > 0 && (
        <section>
          <p className="text-[10px] text-white/20 font-mono mb-3">분석 이력</p>
          <div className="space-y-1">
            {history.map((c) => {
              const otherId = c.user_a_id !== me?.id ? c.user_a_id : c.user_b_id;
              const otherName = c.user_a_id !== me?.id ? c.user_a_name : c.user_b_name;
              return (
                <Link key={`${c.user_a_id}-${c.user_b_id}-${c.lens}`}
                  href={`/chemistry/${otherId}/${c.lens}`}
                  className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-white/[0.03] transition">
                  <div>
                    <p className="text-sm text-white/60">{otherName}</p>
                    <p className="text-[10px] text-white/15 font-mono">@{otherId} · {c.lens}</p>
                  </div>
                  <p className="text-xl font-bold">{c.score}%</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {history.length === 0 && !searchOpen && (
        <div className="text-center py-12 text-white/15 text-sm">
          아직 분석 이력이 없어.<br />검색해서 케미를 확인해봐.
        </div>
      )}

      {/* 초대 (하단) */}
      <div className="mt-10 p-4 border border-white/5 rounded-xl text-center">
        <p className="text-xs text-white/30 mb-1">그 사람이 여기 없어?</p>
        <button onClick={() => setShareOpen(true)}
          className="text-xs text-white/40 hover:text-white/60 transition">
          초대 링크 보내기
        </button>
      </div>

      {me && <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} slug={me.slug} name={me.name} />}
    </div>
  );
}
