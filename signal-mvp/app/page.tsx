'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingState from './components/loading-state';
import { LOGIN_PHASES } from '@/lib/loading-messages';

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
    const existingId = document.cookie.match(/(^|;\s*)signal_user_id=([^;]+)/)?.[2];
    if (existingId && !refParam) router.push('/dashboard');
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
      if (!r.ok) throw new Error(data.error || 'failed');
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

      {/* ══════ HERO ══════ */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative">
        <div className="max-w-3xl">
          <h1 className="text-hero-sm md:text-hero font-bold bg-gradient-to-r from-accent via-accent2 to-accent3 bg-clip-text text-transparent pb-2">
            Signalogy
          </h1>

          <p className="text-lg md:text-2xl text-fg/90 mt-6 leading-relaxed tracking-tight">
            사주는 운명을 본다.
          </p>
          <p className="text-lg md:text-2xl text-accent3 mt-1 leading-relaxed tracking-tight font-medium">
            Signalogy는 너의 signal을 본다.
          </p>

          <p className="text-dim text-sm md:text-base max-w-md mx-auto mt-8 leading-relaxed">
            AI 대화로 잠재의식을 측정하고,<br />
            누구와도 진짜 호환성을 분석한다.
          </p>

          <button
            onClick={scrollToStart}
            className="mt-10 px-10 py-4 bg-accent/90 hover:bg-accent text-bg font-semibold rounded-2xl text-lg transition-all hover:shadow-lg hover:shadow-accent/20"
          >
            무료로 시작하기
          </button>

          <p className="text-xs text-dim/60 mt-5">약 15-20분 · 완전 무료</p>
        </div>

        <div className="absolute bottom-10 text-dim/30 text-xl animate-bounce">↓</div>
      </section>

      {/* ══════ 이런 걸 알 수 있어 ══════ */}
      <section className="py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-2xl md:text-3xl font-bold mb-16 tracking-tight">이런 걸 알 수 있어</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { emoji: '🪞', title: '나를 안다', desc: '15가지 심리 축으로 가치관, 성격, 애착, 갈등 패턴을 분석. MBTI 16칸이 아니라, 살아있는 narrative로.' },
              { emoji: '💕', title: '우리를 안다', desc: '친구, 연인, 가족, 동료 — 4개 렌즈로 두 사람의 진짜 호환성. 어디서 만나고 어디서 부딪히는지.' },
              { emoji: '📤', title: '공유한다', desc: 'Signalogy 프로필을 친구에게 보내. 카톡 한 번이면 케미 분석 시작. QR로도.' },
            ].map((item) => (
              <div key={item.title} className="glass rounded-3xl p-8 text-center hover:border-white/10 transition-all group">
                <div className="text-4xl mb-5 group-hover:scale-110 transition-transform">{item.emoji}</div>
                <h3 className="font-semibold text-lg mb-3">{item.title}</h3>
                <p className="text-sm text-dim leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 어떻게 작동해 ══════ */}
      <section className="py-28 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-center text-2xl md:text-3xl font-bold mb-16 tracking-tight">어떻게 작동해</h2>
          <div className="space-y-10">
            {[
              { step: '01', emoji: '💬', title: 'AI와 대화', desc: '카톡처럼 자연스러운 대화. 정답은 없어. 네가 느끼는 대로.' },
              { step: '02', emoji: '🧬', title: '잠재의식 측정', desc: 'AI가 대화 패턴에서 15가지 심리 축을 추출. 네가 의식하지 못하는 것까지.' },
              { step: '03', emoji: '📊', title: '결과 확인', desc: '나만의 성격 프로파일 + 다른 사람과의 케미 분석.' },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl glass flex items-center justify-center text-accent font-bold text-sm glow-accent">
                  {item.step}
                </div>
                <div className="pt-2">
                  <p className="font-semibold text-lg">{item.emoji} {item.title}</p>
                  <p className="text-sm text-dim mt-2 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ 비교 ══════ */}
      <section className="py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-2xl md:text-3xl font-bold mb-16 tracking-tight">뭐가 다른데</h2>
          <div className="glass rounded-3xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-5 px-6 text-dim font-normal" />
                  <th className="text-center py-5 px-4 text-dim font-normal">사주</th>
                  <th className="text-center py-5 px-4 text-dim font-normal">MBTI</th>
                  <th className="text-center py-5 px-4 text-accent font-semibold">Signalogy</th>
                </tr>
              </thead>
              <tbody className="text-center">
                {[
                  ['기반', '생년월일', '자기보고', 'AI 대화 (잠재의식)'],
                  ['조작 가능?', '불가', '가능', '불가'],
                  ['결과', '점수', '4글자', '문학적 narrative'],
                  ['호환성', '궁합 점수', '없음', '4렌즈 × 15축'],
                  ['학술 근거', '없음', '약함', '5개 황금표준'],
                  ['비용', '유료', '무료', '무료'],
                ].map(([label, ...cols], i) => (
                  <tr key={i} className="border-b border-white/3">
                    <td className="text-left py-4 px-6 text-dim">{label}</td>
                    {cols.map((c, j) => (
                      <td key={j} className={`py-4 px-4 ${j === 2 ? 'text-accent3 font-medium' : 'text-fg/70'}`}>
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

      {/* ══════ 프라이버시 ══════ */}
      <section className="py-20 px-6">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-dim text-xs uppercase tracking-widest mb-4">🔒 프라이버시</p>
          <p className="text-sm text-dim/80 leading-relaxed">
            너의 데이터는 광고에 팔리지 않아.<br />
            Signalogy는 너의 signal을 위한 인프라야.
          </p>
        </div>
      </section>

      {/* ══════ 시작하기 ══════ */}
      <section ref={startRef} id="start" className="py-28 px-6">
        <div className="max-w-sm mx-auto">
          <div className="glass rounded-3xl p-10 glow-accent">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight">시작하기</h2>
              <p className="text-xs text-dim mt-3">약 15-20분 · 완전 무료</p>
            </div>

            {refParam && (
              <div className="mb-8 p-4 glass-light rounded-2xl text-sm text-center">
                <span className="font-semibold text-accent">@{refParam}</span> 가 너를 초대했어
              </div>
            )}

            {loading ? (
              <LoadingState
                phases={LOGIN_PHASES}
                estimatedSec={5}
                hint="서버 준비 중"
                size="md"
              />
            ) : (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="text-xs text-dim uppercase tracking-wider">ID</label>
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="영문/숫자"
                    className="w-full mt-2 px-5 py-4 bg-bg-elevated border border-white/5 rounded-2xl text-fg focus:border-accent/50 focus:outline-none transition-colors"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs text-dim uppercase tracking-wider">이름</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="한글/영문"
                    className="w-full mt-2 px-5 py-4 bg-bg-elevated border border-white/5 rounded-2xl text-fg focus:border-accent/50 focus:outline-none transition-colors"
                  />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <button type="submit" className="w-full py-4 bg-accent/90 hover:bg-accent text-bg font-semibold rounded-2xl transition-all hover:shadow-lg hover:shadow-accent/20 text-lg">
                  시작
                </button>
              </form>
            )}

            <p className="text-xs text-dim/50 mt-8 text-center leading-relaxed">
              같은 ID로 다시 들어오면 이어서 할 수 있어.
            </p>
          </div>
        </div>
      </section>

      {/* ══════ 푸터 ══════ */}
      <footer className="py-12 px-6 text-center text-xs text-dim/40">
        Signalogy — 너의 signal을 읽는다
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
