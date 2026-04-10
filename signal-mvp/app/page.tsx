'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingState from './components/loading-state';
import { LOGIN_PHASES } from '@/lib/loading-messages';

// ──────────────────────────────────────────
// 랜딩 + 로그인 통합 페이지
// 스크롤: 소개 → 설명 → 비교 → 시작
// ──────────────────────────────────────────

function LandingInner() {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const startRef = useRef<HTMLDivElement>(null);

  const refParam = searchParams.get('ref');
  useEffect(() => {
    if (refParam) {
      document.cookie = `signal_ref=${encodeURIComponent(refParam)}; path=/; max-age=${60 * 60 * 24 * 30}`;
    }
    // 이미 로그인되어 있으면 dashboard로
    const existingId = document.cookie.match(/(^|;\s*)signal_user_id=([^;]+)/)?.[2];
    if (existingId && !refParam) {
      router.push('/dashboard');
    }
  }, [refParam, router]);

  function readRefCookie(): string | null {
    const m = document.cookie.match(/(^|;\s*)signal_ref=([^;]+)/);
    return m ? decodeURIComponent(m[2]) : null;
  }

  function scrollToStart() {
    startRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!id.trim()) { setError('ID를 입력해줘'); return; }
    setLoading(true);
    setError('');
    try {
      const referrerSlug = refParam || readRefCookie() || undefined;
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id.trim(), name: name.trim() || id.trim(), referrerSlug }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'login failed');
      document.cookie = `signal_user_id=${data.id}; path=/; max-age=${60 * 60 * 24 * 30}`;
      document.cookie = `signal_user_name=${encodeURIComponent(data.name)}; path=/; max-age=${60 * 60 * 24 * 30}`;
      if (data.isNew) document.cookie = 'signal_ref=; path=/; max-age=0';
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">

      {/* ────────── HERO ────────── */}
      <section className="min-h-screen flex flex-col items-center justify-center px-4 text-center relative">
        <div className="max-w-2xl">
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent mb-4">
            Signal
          </h1>
          <p className="text-xl md:text-2xl text-fg mb-3">
            사주는 운명을 본다. <span className="text-accent3">Signal은 너의 선택을 본다.</span>
          </p>
          <p className="text-dim text-sm md:text-base max-w-lg mx-auto leading-relaxed mb-8">
            AI 대화로 너의 잠재의식을 측정하고,<br />
            누구와도 진짜 호환성을 분석한다.
          </p>
          <button
            onClick={scrollToStart}
            className="px-8 py-4 bg-accent text-bg font-semibold rounded-xl text-lg hover:bg-accent2 transition"
          >
            무료로 시작하기
          </button>
          <p className="text-xs text-dim mt-4">약 15-20분 · 완전 무료 · 로그인만으로 시작</p>
        </div>
        {/* 스크롤 힌트 */}
        <div className="absolute bottom-8 animate-bounce text-dim text-2xl">↓</div>
      </section>

      {/* ────────── 이런 걸 알 수 있어 ────────── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-2xl font-bold mb-12">이런 걸 알 수 있어</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card border border-line rounded-2xl p-6 text-center">
              <div className="text-4xl mb-4">🪞</div>
              <h3 className="font-semibold text-lg mb-2">나를 안다</h3>
              <p className="text-sm text-dim leading-relaxed">
                15가지 심리 축으로 너의 가치관, 성격, 애착, 갈등 패턴을 분석. MBTI 16칸이 아니라, 살아있는 narrative로.
              </p>
            </div>
            <div className="bg-card border border-line rounded-2xl p-6 text-center">
              <div className="text-4xl mb-4">💕</div>
              <h3 className="font-semibold text-lg mb-2">우리를 안다</h3>
              <p className="text-sm text-dim leading-relaxed">
                친구, 연인, 가족, 동료 — 4개 렌즈로 두 사람의 진짜 호환성. 어디서 만나고 어디서 부딪히는지.
              </p>
            </div>
            <div className="bg-card border border-line rounded-2xl p-6 text-center">
              <div className="text-4xl mb-4">📤</div>
              <h3 className="font-semibold text-lg mb-2">공유한다</h3>
              <p className="text-sm text-dim leading-relaxed">
                내 Signal 프로필을 친구에게 보내. 카톡 한 번이면 케미 분석 시작. QR로도 가능.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ────────── 어떻게 작동해 ────────── */}
      <section className="py-20 px-4 bg-card/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-2xl font-bold mb-12">어떻게 작동해</h2>
          <div className="space-y-8">
            {[
              { step: '01', emoji: '💬', title: 'AI와 대화', desc: '5가지 상황에서 카톡처럼 자연스러운 대화. 정답은 없어. 네가 느끼는 대로.' },
              { step: '02', emoji: '🧬', title: '잠재의식 측정', desc: 'AI가 대화 패턴에서 15가지 심리 축을 추출. 네가 의식하지 못하는 것까지 본다.' },
              { step: '03', emoji: '📊', title: '결과 확인', desc: '나만의 성격 프로파일 + 다른 사람과의 케미 분석. 문학적 깊이의 narrative.' },
            ].map((item) => (
              <div key={item.step} className="flex gap-5 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent font-bold text-sm">
                  {item.step}
                </div>
                <div>
                  <p className="font-semibold text-lg">{item.emoji} {item.title}</p>
                  <p className="text-sm text-dim mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── 사주/MBTI와 뭐가 달라 ────────── */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-2xl font-bold mb-12">뭐가 다른데</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left py-3 text-dim font-normal" />
                  <th className="text-center py-3 text-dim font-normal">사주</th>
                  <th className="text-center py-3 text-dim font-normal">MBTI</th>
                  <th className="text-center py-3 text-accent font-semibold">Signal</th>
                </tr>
              </thead>
              <tbody className="text-center">
                {[
                  ['기반', '생년월일 (운명)', '자기보고 (의식)', 'AI 대화 (잠재의식)'],
                  ['조작 가능?', '불가', '가능', '불가 — LLM이 뭘 보는지 모름'],
                  ['결과 형태', '점수 / 궁합', '4글자 코드', '문학적 narrative'],
                  ['호환성 분석', '궁합 점수만', '없음', '4렌즈 × 15축 깊이 분석'],
                  ['학술 근거', '없음', '약함', 'Schwartz + Big Five + Bowlby + Haidt + Gottman'],
                  ['비용', '유료', '무료', '무료'],
                ].map(([label, ...cols], i) => (
                  <tr key={i} className="border-b border-line/30">
                    <td className="text-left py-3 text-dim">{label}</td>
                    {cols.map((c, j) => (
                      <td key={j} className={`py-3 ${j === 2 ? 'text-accent3 font-medium' : 'text-fg'}`}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ────────── 프라이버시 ────────── */}
      <section className="py-12 px-4 bg-card/30">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="font-semibold mb-3">🔒 프라이버시</h3>
          <p className="text-sm text-dim leading-relaxed">
            너의 데이터는 광고에 팔리지 않아. 대화 내용은 분석 후 벡터만 저장되고, 원문은 너만 볼 수 있어.
            Signal은 사랑을 위한 인프라야. 너의 데이터를 무기로 쓰지 않아.
          </p>
        </div>
      </section>

      {/* ────────── 로그인 (시작하기) ────────── */}
      <section ref={startRef} id="start" className="py-20 px-4">
        <div className="max-w-sm mx-auto">
          <div className="bg-card border border-line rounded-2xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">시작하기</h2>
              <p className="text-xs text-dim mt-2">약 15-20분 · 완전 무료</p>
            </div>

            {refParam && (
              <div className="mb-6 p-3 bg-accent/10 border border-accent/30 rounded-lg text-sm text-center">
                <span className="font-semibold text-accent">@{refParam}</span> 가 너를 초대했어
              </div>
            )}

            {loading ? (
              <LoadingState
                phases={LOGIN_PHASES}
                estimatedSec={5}
                hint="첫 로그인은 서버 콜드 스타트로 5~10초 걸릴 수 있어요"
                size="md"
              />
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs text-dim uppercase tracking-wider">ID (영문/숫자)</label>
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="예: junhyeok"
                    className="w-full mt-1 px-4 py-3 bg-bg border border-line rounded-lg text-fg focus:border-accent focus:outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs text-dim uppercase tracking-wider">이름</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 박준혁"
                    className="w-full mt-1 px-4 py-3 bg-bg border border-line rounded-lg text-fg focus:border-accent focus:outline-none"
                  />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <button type="submit" className="w-full py-3 bg-accent text-bg font-semibold rounded-lg hover:bg-accent2 transition">
                  시작
                </button>
              </form>
            )}

            <p className="text-xs text-dim mt-6 text-center leading-relaxed">
              같은 ID로 다시 들어오면 진행 상태가 이어져.
            </p>
          </div>
        </div>
      </section>

      {/* ────────── 푸터 ────────── */}
      <footer className="py-8 px-4 border-t border-line text-center text-xs text-dim">
        Signal — 잠재의식 + 케미 분석 · 진짜 사람을 위한, 진짜 연결을 위한
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingInner />
    </Suspense>
  );
}
