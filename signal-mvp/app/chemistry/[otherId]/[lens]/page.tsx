'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { LENSES, type Lens } from '@/lib/types';
import RadarChart from '@/app/components/radar-chart';
import AttachmentQuadrant from '@/app/components/attachment-quadrant';
import SectionCard from '@/app/components/section-card';
import LoadingState from '@/app/components/loading-state';
import ShareModal from '@/app/components/share-modal';
import { trackedFetch } from '@/app/components/api-debug';
import { CHEMISTRY_PHASES } from '@/lib/loading-messages';
import { parseTags } from '@/lib/parse-tags';
import { computeRadarDimensions, getAttachmentPoint } from '@/lib/radar-dimensions';
import type { IntegratedVector } from '@/lib/types';

const LENS_LABELS: Record<string, string> = { friend: '친구', romantic: '연인', family: '가족', work: '동료' };

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

function scoreColor(s: number): string {
  if (s >= 75) return 'from-accent3 to-accent3';
  if (s >= 50) return 'from-accent to-accent2';
  if (s >= 30) return 'from-amber-400 to-amber-500';
  return 'from-red-400 to-red-500';
}

export default function ChemistryResultPage() {
  const router = useRouter();
  const params = useParams<{ otherId: string; lens: string }>();
  const otherId = params.otherId;
  const lens = params.lens as Lens;

  const [score, setScore] = useState<number | null>(null);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [body, setBody] = useState<string>('');
  const [reliability, setReliability] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [scoreAnim, setScoreAnim] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [error, setError] = useState('');
  const userSlug = useRef('');
  const userName = useRef('');

  useEffect(() => {
    if (!LENSES.includes(lens)) { setError('잘못된 렌즈'); setLoading(false); return; }
    const uid = readCookie('signal_user_id');
    if (!uid) { router.push('/'); return; }
    // Load me for share
    fetch('/api/me', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid }) })
      .then((r) => r.json())
      .then((d) => { userSlug.current = d.slug || uid; userName.current = d.name || uid; });
    void loadResult(uid, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherId, lens]);

  async function loadResult(uid: string, force: boolean) {
    if (force) setRegenerating(true);
    else setLoading(true);
    setError('');
    try {
      const { response: r, data } = await trackedFetch('/api/chemistry', {
        body: JSON.stringify({ userAId: uid, userBId: otherId, lens, force }),
      });
      if (!r.ok) throw new Error(data.error);

      setScore(data.score);
      setReliability(data.reliability || data.raw_data?.reliability_label || null);

      const { tags: t, body: b } = parseTags(data.narrative);
      setNarrative(data.narrative);
      setTags(t);
      setBody(b);

      // Reveal 애니메이션
      if (!data.cached) {
        setRevealed(false);
        setScoreAnim(0);
        setTimeout(() => setRevealed(true), 200);
        // 점수 카운트업 애니메이션
        const target = data.score;
        let current = 0;
        const step = Math.max(1, Math.ceil(target / 30));
        const timer = setInterval(() => {
          current = Math.min(current + step, target);
          setScoreAnim(current);
          if (current >= target) clearInterval(timer);
        }, 30);
      } else {
        setRevealed(true);
        setScoreAnim(data.score);
      }
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
    if (!confirm('새 케미 분석을 생성할까?')) return;
    void loadResult(uid, true);
  }

  // Narrative를 섹션으로 분리
  const headline = body.match(/^(?:##? )?(.+?)$/m)?.[1]?.replace(/[*#]/g, '').trim() || '';
  const sections = body.split(/^### /m).slice(1).map((s) => {
    const nl = s.indexOf('\n');
    return { title: s.slice(0, nl).trim(), content: s.slice(nl).trim() };
  });
  // 핵심 역학 (첫 ### 전 텍스트)
  const coreText = body.split(/^### /m)[0]?.replace(/^(?:##? )?.+$/m, '').trim() || '';

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link href="/chemistry" className="text-xs text-dim hover:text-accent">← 친구찾기</Link>

      {/* ─── 로딩 ─── */}
      {(loading || regenerating) && (
        <div className="mt-8 bg-card border border-line rounded-2xl p-6">
          <LoadingState
            phases={CHEMISTRY_PHASES}
            estimatedSec={30}
            hint={regenerating ? '새 케미 분석 재생성 중' : '두 사람의 벡터 비교 + 관계 narrative'}
          />
        </div>
      )}

      {error && (
        <div className="mt-8 p-4 bg-red-900/20 border border-red-900/40 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      {/* ─── 결과 ─── */}
      {narrative && !loading && (
        <div className={`mt-8 transition-all duration-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

          {/* ─── 점수 카드 ─── */}
          <div className="bg-card border border-line rounded-2xl p-8 text-center mb-6">
            <p className="text-xs text-dim uppercase tracking-wider mb-1">{LENS_LABELS[lens] || lens} 렌즈</p>

            {/* 큰 점수 (카운트업 애니메이션) */}
            <div className={`text-7xl font-bold bg-gradient-to-r ${scoreColor(score || 0)} bg-clip-text text-transparent my-4`}>
              {scoreAnim}<span className="text-3xl">%</span>
            </div>

            {reliability && reliability !== '높음' && (
              <p className="text-xs text-amber-300 mb-3">신뢰도: {reliability} (일부만 본 결과)</p>
            )}

            {/* Headline */}
            {headline && (
              <p className="text-lg font-medium text-fg leading-relaxed mb-4">{headline}</p>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {tags.map((t) => (
                  <span key={t} className="px-3 py-1 bg-accent2/10 border border-accent2/30 rounded-full text-xs text-accent2">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ─── 핵심 역학 ─── */}
          {coreText && (
            <SectionCard emoji="⚡" title="핵심 역학" summary={coreText.slice(0, 60) + '...'} defaultOpen>
              <article className="prose prose-invert max-w-none mt-4" dangerouslySetInnerHTML={{ __html: renderMarkdown(coreText) }} />
            </SectionCard>
          )}

          {/* ─── 나머지 섹션 (접이식) ─── */}
          <div className="space-y-3 mt-3 mb-6">
            {sections.map((sec, i) => {
              let emoji = '📖';
              if (sec.title.includes('만나는')) emoji = '✅';
              else if (sec.title.includes('부딪히는')) emoji = '❌';
              else if (sec.title.includes('그림자')) emoji = '🌑';
              else if (sec.title.includes('예언')) emoji = '🔮';
              return (
                <SectionCard
                  key={i}
                  emoji={emoji}
                  title={sec.title}
                  summary={sec.content.split('\n')[0]?.replace(/\*\*/g, '').slice(0, 60) + '...'}
                  defaultOpen={i < 2}
                >
                  <article className="prose prose-invert max-w-none mt-4" dangerouslySetInnerHTML={{ __html: renderMarkdown(sec.content) }} />
                </SectionCard>
              );
            })}
          </div>

          {/* ─── 하단 액션 ─── */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6 border-t border-line">
            <button
              onClick={() => setShareOpen(true)}
              className="px-6 py-3 bg-accent text-bg rounded-xl text-sm font-semibold hover:bg-accent2 transition"
            >
              📤 이 결과 공유 — 너도 해봐!
            </button>
            <button
              onClick={regenerate}
              disabled={regenerating}
              className="px-6 py-3 bg-card border border-line rounded-xl text-sm text-dim hover:text-accent hover:border-accent transition disabled:opacity-50"
            >
              🔄 다시 분석
            </button>
          </div>

          <ShareModal
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            slug={userSlug.current}
            name={userName.current}
          />
        </div>
      )}
    </div>
  );
}
