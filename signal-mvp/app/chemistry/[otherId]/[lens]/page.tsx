'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { LENSES, type Lens } from '@/lib/types';

interface CompletenessReport {
  percent: number;
  scenarios_completed: number;
  scenarios_total: number;
  level: string;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : null;
}

const LENS_LABELS: Record<string, string> = {
  friend: '친구',
  romantic: '연인',
  family: '가족',
  work: '동료',
};

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

export default function ChemistryResultPage() {
  const router = useRouter();
  const params = useParams<{ otherId: string; lens: string }>();
  const otherId = params.otherId;
  const lens = params.lens as Lens;

  const [score, setScore] = useState<number | null>(null);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [reliability, setReliability] = useState<string | null>(null);
  const [compA, setCompA] = useState<CompletenessReport | null>(null);
  const [compB, setCompB] = useState<CompletenessReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!LENSES.includes(lens)) {
      setError('잘못된 렌즈');
      setLoading(false);
      return;
    }
    const uid = readCookie('signal_user_id');
    if (!uid) {
      router.push('/');
      return;
    }
    void load(uid, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherId, lens]);

  async function load(uid: string, force: boolean) {
    if (force) setRegenerating(true);
    else setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/chemistry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAId: uid, userBId: otherId, lens, force }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setScore(data.score);
      setNarrative(data.narrative);
      setReliability(data.reliability || data.raw_data?.reliability_label || null);
      setCompA(data.completeness_a || data.raw_data?.completeness_a || null);
      setCompB(data.completeness_b || data.raw_data?.completeness_b || null);
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
    if (!confirm('새로운 케미 분석을 생성할까? (LLM 비용 발생)')) return;
    void load(uid, true);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link href="/chemistry" className="text-xs text-dim hover:text-accent">← 케미 목록</Link>

      <header className="mt-6 mb-8">
        <p className="text-xs text-dim uppercase tracking-wider">{LENS_LABELS[lens] || lens} 렌즈</p>
        {score !== null && (
          <div className="mt-3 text-6xl font-bold bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">
            {score}%
          </div>
        )}
        {reliability && reliability !== '높음' && (
          <p className="text-xs text-amber-300 mt-2">신뢰도: {reliability} (아직 일부만 본 결과)</p>
        )}
      </header>

      {loading && <p className="text-dim">분석 생성 중... (15~30초)</p>}

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-900/40 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* 부분 데이터 경고 — 한쪽이라도 80% 미만이면 표시 */}
      {narrative && ((compA?.percent ?? 100) < 80 || (compB?.percent ?? 100) < 80) && (
        <div className="mb-6 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl">
          <p className="text-amber-300 text-sm font-semibold mb-1">⚠️ 부분 데이터 기반</p>
          <p className="text-xs text-dim leading-relaxed">
            {compA && <span>나 추정 완성도 {compA.percent}% ({compA.scenarios_completed}/5 시나리오)</span>}
            {compA && compB && <span> · </span>}
            {compB && <span>상대 추정 완성도 {compB.percent}% ({compB.scenarios_completed}/5 시나리오)</span>}
          </p>
          <p className="text-xs text-dim mt-2 leading-relaxed">
            5/5 모두 완료한 후 *다시 분석* 버튼으로 더 정확한 narrative를 받을 수 있어.
          </p>
        </div>
      )}

      {narrative && (
        <>
          <article
            className="prose prose-invert max-w-none"
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
