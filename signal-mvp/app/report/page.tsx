'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : null;
}

// 매우 단순한 markdown → HTML (h2, h3, **bold**, *italic*, paragraphs, hr)
function renderMarkdown(md: string): string {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold mt-8 mb-3 text-fg">$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-2 text-accent3">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold mt-4 mb-4 text-accent">$1</h1>');
  html = html.replace(/^---$/gm, '<hr class="my-6 border-line" />');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-fg">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em class="text-accent3 not-italic">$1</em>');

  // 빈 줄 기준 paragraph
  const paragraphs = html.split(/\n\n+/).map((p) => {
    if (p.trim().startsWith('<h') || p.trim().startsWith('<hr')) return p;
    return `<p class="text-fg leading-relaxed mb-4">${p.replace(/\n/g, '<br />')}</p>`;
  });
  return paragraphs.join('\n');
}

export default function ReportPage() {
  const router = useRouter();
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const uid = readCookie('signal_user_id');
    if (!uid) {
      router.push('/');
      return;
    }
    void load(uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(uid: string) {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setNarrative(data.narrative);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link href="/dashboard" className="text-xs text-dim hover:text-accent">← 대시보드</Link>

      {loading && <p className="text-dim mt-8">분석 생성 중... (10-20초)</p>}

      {error && (
        <div className="mt-8 p-4 bg-red-900/20 border border-red-900/40 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {narrative && (
        <article
          className="mt-8 prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(narrative) }}
        />
      )}
    </div>
  );
}
