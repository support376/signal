'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { trackedFetch } from './api-debug';

interface SnsMatch { id: string; slug: string; score: number; instagram: string | null; snsLinks: any; }

export default function SnsMatches({ userId }: { userId: string }) {
  const [matches, setMatches] = useState<SnsMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, [userId]);

  async function load() {
    try {
      const { data } = await trackedFetch('/api/sns-matches', { body: JSON.stringify({ userId }) });
      setMatches(data.matches || []);
    } catch {}
    finally { setLoading(false); }
  }

  if (loading) return <p className="text-xs text-faint py-4">불러오는 중...</p>;
  if (matches.length === 0) return null;

  return (
    <section className="mb-10">
      <p className="text-[10px] text-faint mb-4">SNS 연결된 사람들</p>
      <div className="space-y-2">
        {matches.map((m) => {
          const snsLink = m.instagram
            ? { url: `https://instagram.com/${m.instagram}`, label: 'IG' }
            : m.snsLinks?.threads?.handle
            ? { url: `https://threads.net/@${m.snsLinks.threads.handle}`, label: 'TH' }
            : m.snsLinks?.twitter?.handle
            ? { url: `https://x.com/${m.snsLinks.twitter.handle}`, label: 'X' }
            : null;

          return (
            <div key={m.id} className="flex items-center justify-between py-3 border-b border-line">
              <div className="flex items-center gap-3 min-w-0">
                <Link href={`/u/${m.slug}`} className="text-sm text-dim hover:text-fg truncate">
                  @{m.slug}
                </Link>
                {snsLink && (
                  <a href={snsLink.url} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-faint border border-line rounded px-1.5 py-0.5 hover:text-dim flex-shrink-0">
                    {snsLink.label}
                  </a>
                )}
              </div>
              <Link href={`/u/${m.slug}`} className="text-lg font-bold text-fg ml-3">
                {m.score}%
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
