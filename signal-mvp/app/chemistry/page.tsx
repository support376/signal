'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ShareModal from '@/app/components/share-modal';
import { trackedFetch } from '@/app/components/api-debug';

interface ScoredUser {
  id: string;
  name: string;
  slug: string;
  completed_count: number;
  score: number | null;
  reliability: string | null;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : null;
}

export default function ChemistryPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [users, setUsers] = useState<ScoredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [noVector, setNoVector] = useState(false);

  useEffect(() => {
    const id = readCookie('signal_user_id');
    if (!id) { router.push('/'); return; }
    void loadData(id);
  }, []);

  async function loadData(id: string) {
    setLoading(true);
    try {
      const { data: meData } = await trackedFetch('/api/me', { body: JSON.stringify({ userId: id }) });
      setMe({ id: meData.id, name: meData.name, slug: meData.slug });

      const { data } = await trackedFetch('/api/chemistry/scores', {
        body: JSON.stringify({ userId: id, lens: 'friend' }),
      });

      if (data.error && data.users?.length === 0) {
        setNoVector(true);
      } else {
        setUsers(data.users || []);
      }
    } catch {
      setNoVector(true);
    } finally {
      setLoading(false);
    }
  }

  const withScore = users.filter((u) => u.score !== null);
  const withoutScore = users.filter((u) => u.score === null);

  return (
    <div className="max-w-lg mx-auto px-5 py-8 pb-20">
      <p className="text-lg font-bold mb-6 text-fg">Signalogy</p>

      {/* 초대 */}
      <section className="p-4 border border-line rounded-xl mb-6">
        <p className="text-sm text-fg mb-1">케미 보고 싶은 사람 초대하기</p>
        <p className="text-[10px] text-faint mb-3">상대도 시나리오를 완료하면 케미가 계산됩니다.</p>
        <button onClick={() => setShareOpen(true)}
          className="w-full py-2.5 border border-line rounded-lg text-xs text-dim hover:text-fg transition">
          초대 링크 보내기
        </button>
      </section>

      {/* 로딩 */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-line border-t-fg rounded-full animate-spin" />
        </div>
      )}

      {/* 벡터 없음 */}
      {!loading && noVector && (
        <div className="text-center py-12">
          <p className="text-sm text-dim mb-2">시나리오를 먼저 완료해야 합니다.</p>
          <button onClick={() => router.push('/dashboard')}
            className="text-xs text-faint hover:text-dim">Home으로 →</button>
        </div>
      )}

      {/* 매칭 목록 */}
      {!loading && !noVector && (
        <>
          {withScore.length > 0 && (
            <section className="mb-6">
              <p className="text-xs text-dim mb-3">매칭</p>
              <div className="space-y-1">
                {withScore.map((u) => (
                  <button key={u.id} onClick={() => router.push(`/chemistry/${u.id}`)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-card text-left transition">
                    <div>
                      <p className="text-sm text-fg">{u.name}</p>
                      <p className="text-[10px] text-faint">@{u.slug}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-mono text-fg">{u.score}%</p>
                      {u.reliability && (
                        <p className="text-[9px] text-faint">{u.reliability}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {withoutScore.length > 0 && (
            <section>
              <p className="text-xs text-dim mb-3">측정 대기</p>
              <div className="space-y-1">
                {withoutScore.map((u) => (
                  <div key={u.id}
                    className="flex items-center justify-between p-3 rounded-xl text-left opacity-40">
                    <div>
                      <p className="text-sm text-dim">{u.name}</p>
                      <p className="text-[10px] text-faint">@{u.slug}</p>
                    </div>
                    <p className="text-[10px] text-faint">시나리오 {u.completed_count}/5</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {withScore.length === 0 && withoutScore.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-faint">아직 다른 사용자가 없습니다.</p>
              <p className="text-[10px] text-faint mt-1">초대 링크를 보내세요.</p>
            </div>
          )}
        </>
      )}

      {me && <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} slug={me.slug} name={me.name} />}
    </div>
  );
}
