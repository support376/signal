'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RadarChart from '@/app/components/radar-chart';
import AttachmentQuadrant from '@/app/components/attachment-quadrant';
import SectionCard from '@/app/components/section-card';
import LoadingState from '@/app/components/loading-state';
import ShareModal from '@/app/components/share-modal';
import { trackedFetch } from '@/app/components/api-debug';
import { SELF_REPORT_PHASES } from '@/lib/loading-messages';
import { parseTags } from '@/lib/parse-tags';
import type { IntegratedVector } from '@/lib/types';
import { AXIS_LABELS_KO, type Axis } from '@/lib/types';
import { computeRadarDimensions, getAttachmentPoint, type RadarDimension } from '@/lib/radar-dimensions';

interface CompletenessReport {
  percent: number;
  scenarios_completed: number;
  scenarios_total: number;
  measured_axes: number;
  axes_total: number;
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

// 5개 그룹 정의 — 각 그룹에 속하는 축과 이모지/라벨
const AXIS_GROUPS: { key: string; emoji: string; label: string; axes: Axis[] }[] = [
  { key: 'values', emoji: '🧭', label: '가치관', axes: ['value_security', 'value_benevolence', 'value_self_direction', 'value_achievement', 'value_universalism', 'value_tradition'] },
  { key: 'personality', emoji: '🧠', label: '성격', axes: ['big5_neuroticism', 'big5_agreeableness', 'big5_conscientiousness'] },
  { key: 'attachment', emoji: '💕', label: '애착', axes: ['attach_anxiety', 'attach_avoidance'] },
  { key: 'moral', emoji: '⚖️', label: '도덕', axes: ['moral_loyalty', 'moral_care'] },
  { key: 'behavior', emoji: '🤝', label: '행동', axes: ['conflict_style', 'repair_capacity'] },
];

export default function ReportPage() {
  const router = useRouter();
  const [narrative, setNarrative] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [body, setBody] = useState<string>('');
  const [vector, setVector] = useState<IntegratedVector | null>(null);
  const [completeness, setCompleteness] = useState<CompletenessReport | null>(null);
  const [radarDims, setRadarDims] = useState<RadarDimension[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [error, setError] = useState('');

  const userId = useRef<string | null>(null);
  const userName = useRef<string>('');
  const userSlug = useRef<string>('');

  useEffect(() => {
    const uid = readCookie('signal_user_id');
    const uname = readCookie('signal_user_name') || '';
    if (!uid) {
      router.push('/');
      return;
    }
    userId.current = uid;
    userName.current = uname;
    void loadAll(uid, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll(uid: string, force: boolean) {
    if (force) setRegenerating(true);
    else setLoading(true);
    setError('');
    try {
      // 병렬: me + completeness + report
      const [meResult, compResult, repResult] = await Promise.all([
        trackedFetch('/api/me', { body: JSON.stringify({ userId: uid }) }),
        trackedFetch('/api/completeness', { body: JSON.stringify({ userId: uid }) }),
        trackedFetch('/api/report', { body: JSON.stringify({ userId: uid, force }) }),
      ]);

      if (meResult.response.ok) {
        userName.current = meResult.data.name;
        userSlug.current = meResult.data.slug;
      }

      if (compResult.response.ok) setCompleteness(compResult.data.completeness);

      const repData = repResult.data;
      if (!repResult.response.ok) throw new Error(repData.error);

      const { tags: t, body: b } = parseTags(repData.narrative);
      setNarrative(repData.narrative);
      setTags(t);
      setBody(b);

      // Vector 가져오기 (별도 호출)
      try {
        const vR = await fetch('/api/completeness', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid }) });
        // completeness doesn't return vector itself. Need a direct endpoint.
        // For now: parse from report's completeness or fetch integrated_vector via new endpoint
        // Simplification: we compute radar from vector. Let's add /api/vector endpoint.
        // For now, skip radar if vector not available.
      } catch {}

      // Reveal 애니메이션 (새 생성일 때만)
      if (!repData.cached) {
        setRevealed(false);
        setTimeout(() => setRevealed(true), 300);
      } else {
        setRevealed(true);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }

  async function regenerate() {
    if (!userId.current) return;
    if (!confirm('새 분석을 생성할까? (LLM 비용 발생)')) return;
    void loadAll(userId.current, true);
  }

  // Headline 추출 (## 으로 시작하는 첫 줄)
  const headline = body.match(/^## (.+)$/m)?.[1] || body.match(/^# (.+)$/m)?.[1] || '';
  // narrative를 섹션별로 분리
  const sections = body.split(/^### /m).slice(1).map((s) => {
    const firstNewline = s.indexOf('\n');
    return {
      title: s.slice(0, firstNewline).trim(),
      content: s.slice(firstNewline).trim(),
    };
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link href="/dashboard" className="text-xs text-dim hover:text-accent">← 대시보드</Link>

      {/* ─── 로딩 ─── */}
      {(loading || regenerating) && (
        <div className="mt-8 bg-card border border-line rounded-2xl p-6">
          <LoadingState
            phases={SELF_REPORT_PHASES}
            estimatedSec={20}
            hint={regenerating ? '새 narrative 재생성 중' : '15축 벡터 → 자기 분석 narrative'}
          />
        </div>
      )}

      {error && (
        <div className="mt-8 p-4 bg-red-900/20 border border-red-900/40 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      {/* ─── 결과 (reveal 애니메이션) ─── */}
      {narrative && !loading && (
        <div className={`mt-8 transition-all duration-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

          {/* ─── 완성도 경고 ─── */}
          {completeness && completeness.percent < 80 && (
            <div className="mb-6 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl">
              <p className="text-amber-300 text-sm font-semibold mb-1">⚠️ 완성도 {completeness.percent}%</p>
              <p className="text-xs text-dim">더 많은 시나리오를 마치면 분석이 깊어져.</p>
            </div>
          )}

          {/* ─── 프로필 카드 (3초 파악) ─── */}
          <div className="bg-card border border-line rounded-2xl p-8 text-center mb-6">
            <p className="text-xs text-dim uppercase tracking-wider mb-3">너의 Signalogy Profile</p>

            {/* Headline */}
            {headline && (
              <h1 className="text-2xl font-bold leading-snug bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent mb-4">
                {headline.replace(/\*/g, '')}
              </h1>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1 bg-accent/10 border border-accent/30 rounded-full text-xs text-accent"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* TODO: 레이다 차트 (vector 있을 때) */}
            {/* <RadarChart dimensions={radarDims} /> */}
          </div>

          {/* ─── 섹션 카드 (접이식) ─── */}
          <div className="space-y-3 mb-6">
            {sections.map((sec, i) => (
              <SectionCard
                key={i}
                emoji={sec.title.includes('일상') ? '🌅' : sec.title.includes('그림자') ? '🌑' : sec.title.includes('성장') ? '🌱' : '📖'}
                title={sec.title}
                summary={sec.content.split('\n')[0]?.replace(/\*\*/g, '').slice(0, 60) + '...'}
                defaultOpen={i === 0}
              >
                <article
                  className="prose prose-invert max-w-none mt-4"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(sec.content) }}
                />
              </SectionCard>
            ))}

            {/* 핵심 패턴 (headline 이후, 첫 섹션 이전 텍스트) */}
            {(() => {
              const beforeFirstSection = body.split(/^### /m)[0]?.replace(/^##? .+$/m, '').trim();
              if (!beforeFirstSection) return null;
              return (
                <SectionCard emoji="💡" title="핵심 패턴" summary={beforeFirstSection.slice(0, 60) + '...'} defaultOpen>
                  <article
                    className="prose prose-invert max-w-none mt-4"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(beforeFirstSection) }}
                  />
                </SectionCard>
              );
            })()}
          </div>

          {/* ─── 하단 액션 ─── */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6 border-t border-line">
            <button
              onClick={() => setShareOpen(true)}
              className="px-6 py-3 bg-accent text-bg rounded-xl text-sm font-semibold hover:bg-accent2 transition"
            >
              📤 나 이런 사람이야 — 공유하기
            </button>
            <button
              onClick={regenerate}
              disabled={regenerating}
              className="px-6 py-3 bg-card border border-line rounded-xl text-sm text-dim hover:text-accent hover:border-accent transition disabled:opacity-50"
            >
              {regenerating ? '재생성 중...' : '🔄 다시 분석'}
            </button>
          </div>

          {/* 공유 모달 */}
          <ShareModal
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            slug={userSlug.current || userId.current || ''}
            name={userName.current}
          />
        </div>
      )}
    </div>
  );
}
