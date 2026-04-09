'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CompletenessReport {
  percent: number;
  scenarios_completed: number;
  scenarios_total: number;
  measured_axes: number;
  axes_total: number;
  high_confidence_axes: number;
  level: string;
  warning: string | null;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : null;
}

function renderMarkdown(md: string): string {
  let html = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold mt-8 mb-3 text-fg">$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-2 text-accent3">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold mt-4 mb-4 text-accent">$1</h1>');
  html = html.replace(/^---$/gm, '<hr class="my-6 border-line" />');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-fg">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em class="text-accent3 not-italic">$1</em>');
  const paragraphs = html.split(/\n\n+/).map((p) => {
    if (p.trim().startsWith('<h') || p.trim().startsWith('<hr')) return p;
    return `<p class="text-fg leading-relaxed mb-4">${p.replace(/\n/g, '<br />')}</p>`;
  });
  return paragraphs.join('\n');
}

export default function ReportPage() {
  const router = useRouter();
  const [narrative, setNarrative] = useState<string | null>(null);
  const [completeness, setCompleteness] = useState<CompletenessReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const uid = readCookie('signal_user_id');
    if (!uid) {
      router.push('/');
      return;
    }
    void load(uid, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(uid: string, force: boolean) {
    if (force) setRegenerating(true);
    else setLoading(true);
    setError('');
    try {
      // 완성도 fetch
      const cR = await fetch('/api/completeness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid }),
      });
      const cData = await cR.json();
      if (cR.ok) setCompleteness(cData.completeness);

      const r = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, force }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setNarrative(data.narrative);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }

  async function regenerate() {
    const uid = readCookie('signal_user_id');
    if (!uid) return;
    if (!confirm('새로운 분석을 생성할까? (LLM 비용 발생)')) return;
    void load(uid, true);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link href="/dashboard" className="text-xs text-dim hover:text-accent">← 대시보드</Link>

      {loading && <p className="text-dim mt-8">분석 생성 중... (10~20초)</p>}

      {error && (
        <div className="mt-8 p-4 bg-red-900/20 border border-red-900/40 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* 완성도 + 부분 경고 */}
      {completeness && completeness.percent < 80 && narrative && (
        <div className="mt-6 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl">
          <p className="text-amber-300 text-sm font-semibold mb-1">
            ⚠️ 완성도 {completeness.percent}% — {completeness.level}
          </p>
          <p className="text-xs text-dim leading-relaxed">
            시나리오 {completeness.scenarios_completed}/{completeness.scenarios_total} 완료. 측정된 축 {completeness.measured_axes}/{completeness.axes_total}.
            나머지 시나리오를 마치면 더 정확해져. 지금 결과는 일부만 본 첫 인상이라고 생각하면 돼.
          </p>
        </div>
      )}

      {narrative && (
        <>
          <article
            className="mt-8 prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(narrative) }}
          />
          <div className="mt-12 pt-6 border-t border-line text-center">
            <button
              onClick={regenerate}
              disabled={regenerating}
              className="px-4 py-2 text-sm bg-card border border-line rounded-lg text-dim hover:text-accent hover:border-accent transition disabled:opacity-50"
            >
              {regenerating ? '재생성 중...' : '🔄 다시 분석 (새 narrative 생성)'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
