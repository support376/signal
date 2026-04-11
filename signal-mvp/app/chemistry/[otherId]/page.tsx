import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser, getCompletedScenarios, getIntegratedVector, getDailyHistory } from '@/lib/db';
import { computeCompleteness } from '@/lib/integrator';
import { AXES, AXIS_LABELS_KO, LENSES, type Axis } from '@/lib/types';

export const dynamic = 'force-dynamic';

const LENS_META: Record<string, { ko: string; desc: string }> = {
  romantic: { ko: '연인', desc: '단기 끌림부터 장기 헌신까지' },
  friend: { ko: '친구', desc: '일상의 편안함, 갈등 회피, 지속성' },
  family: { ko: '가족', desc: '부모, 자식, 형제, 친척' },
  work: { ko: '동료', desc: '프로젝트, 상사, 파트너' },
};

export default async function ChemistryProfilePage({ params }: { params: { otherId: string } }) {
  const myId = cookies().get('signal_user_id')?.value;
  if (!myId) redirect('/');

  const other = await getUser(params.otherId);
  if (!other) {
    return (
      <div className="max-w-md mx-auto px-5 py-12 text-center">
        <p className="text-dim">사용자를 찾을 수 없습니다.</p>
        <Link href="/chemistry" className="text-xs text-faint mt-4 block">← Chemistry</Link>
      </div>
    );
  }

  const [vector, completed, dailyHistory] = await Promise.all([
    getIntegratedVector(other.id),
    getCompletedScenarios(other.id),
    getDailyHistory(other.id),
  ]);

  const completeness = computeCompleteness(vector);
  const avgConf = vector?.summary?.average_confidence ?? 0;
  const trustPct = Math.round(avgConf * 100);
  const totalDays = completed.length + dailyHistory.length;

  // 상위 축
  const topAxes: { label: string; value: number; confidence: number }[] = [];
  if (vector?.axes) {
    for (const axis of AXES) {
      const m = (vector.axes as any)[axis];
      if (m && m.confidence >= 0.5) {
        topAxes.push({ label: AXIS_LABELS_KO[axis], value: m.value, confidence: m.confidence });
      }
    }
    topAxes.sort((a, b) => b.confidence - a.confidence);
  }

  const sns = other.sns_links || {};
  const SNS_URLS: Record<string, (h: string) => string> = {
    IG: (h) => `https://instagram.com/${h}`,
    TH: (h) => `https://threads.net/@${h}`,
    X: (h) => `https://x.com/${h}`,
    YT: (h) => `https://youtube.com/@${h}`,
    TT: (h) => `https://tiktok.com/@${h}`,
  };
  const snsEntries: { label: string; handle: string; verified: boolean; url: string }[] = [];
  if (other.instagram) snsEntries.push({ label: 'IG', handle: other.instagram, verified: !!(sns as any).instagram?.verified, url: SNS_URLS.IG(other.instagram) });
  for (const [key, label] of [['threads', 'TH'], ['twitter', 'X'], ['youtube', 'YT'], ['tiktok', 'TT']] as const) {
    const s = (sns as any)[key];
    if (s?.handle) snsEntries.push({ label, handle: s.handle, verified: s.verified, url: SNS_URLS[label](s.handle) });
  }

  return (
    <div className="max-w-md mx-auto px-5 py-8 pb-20">
      <Link href="/chemistry" className="text-xs text-faint hover:text-dim">← Chemistry</Link>

      {/* 프로필 */}
      <section className="mt-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-card border border-line flex items-center justify-center text-lg text-dim">
            {other.name[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-fg">{other.name}</p>
            <p className="text-xs text-faint">@{other.slug || other.id}</p>
            <div className="flex items-center gap-2 mt-1">
              {other.birth_year && <span className="text-[10px] text-faint">{other.birth_year}년생</span>}
              {other.nationality && <span className="text-[10px] text-faint">· {other.nationality}</span>}
              {other.location_current && (
                <span className="text-[10px] text-faint">· {(other.location_current as any).label}</span>
              )}
            </div>
          </div>
        </div>

        {snsEntries.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {snsEntries.map((s) => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-faint border border-line rounded px-2 py-0.5 hover:text-fg hover:border-dim transition">
                {s.label} @{s.handle} {s.verified ? '✓' : ''}
              </a>
            ))}
          </div>
        )}

        {/* 신뢰도 */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-dim">signal 신뢰도</span>
          <span className="text-xs font-mono text-fg">{trustPct}%</span>
        </div>
        <div className="h-1 bg-line rounded-full mb-3">
          <div className="h-full bg-fg rounded-full" style={{ width: `${trustPct}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-faint mb-4">
          <span>{completeness.measured_axes}/15 축</span>
          <span>{totalDays}일 측정</span>
        </div>

        {/* 주요 축 */}
        {topAxes.length > 0 && (
          <div className="space-y-1.5 mb-4">
            {topAxes.slice(0, 5).map((a) => (
              <div key={a.label} className="flex items-center justify-between">
                <span className="text-[10px] text-dim flex-1">{a.label}</span>
                <div className="w-20 h-1 bg-line rounded-full mx-2">
                  <div className="h-full bg-dim rounded-full" style={{ width: `${a.value}%` }} />
                </div>
                <span className="text-[10px] font-mono text-faint w-14 text-right">{a.value} / {Math.round(a.confidence * 100)}%</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 케미 분석 렌즈 선택 */}
      <section className="border-t border-line pt-6">
        <p className="text-xs text-dim mb-3">케미 분석</p>
        <div className="space-y-2">
          {LENSES.map((lens) => {
            const meta = LENS_META[lens];
            return (
              <Link key={lens} href={`/chemistry/${other.id}/${lens}`}
                className="block p-4 border border-line rounded-xl hover:bg-card transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-fg">{meta.ko}</p>
                    <p className="text-[10px] text-faint">{meta.desc}</p>
                  </div>
                  <span className="text-faint text-xs">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
