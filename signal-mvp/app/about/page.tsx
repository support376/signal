import Link from 'next/link';
import { cookies } from 'next/headers';

export default function AboutPage() {
  const isLoggedIn = !!cookies().get('signal_user_id')?.value;

  return (
    <div className="max-w-lg mx-auto px-6 py-12 pb-24">
      <Link href={isLoggedIn ? '/profile' : '/'} className="text-xs text-faint hover:text-dim">
        ← {isLoggedIn ? 'More' : '돌아가기'}
      </Link>

      <div className="mt-10 mb-12">
        <p className="text-faint text-[10px] tracking-wider mb-8">SIGNALOGY</p>
        <h1 className="text-2xl font-bold text-fg leading-snug">
          진짜를 구별하는<br />시대가 시작됩니다.
        </h1>
      </div>

      <div className="space-y-10 text-sm text-dim leading-relaxed">

        <section>
          <p className="text-fg leading-relaxed">
            AI가 만든 얼굴, AI가 쓴 글, AI가 흉내 낸 감정.
            화면 너머의 상대가 사람인지 이미 알 수 없습니다.
            곧 카페에서, 회의실에서, 길 위에서도 그렇게 됩니다.
          </p>
          <p className="mt-3">
            이 세계에서 진짜와 가짜를 구별하는 능력은
            더 이상 선택이 아닙니다. 필수가 됩니다.
          </p>
        </section>

        <section>
          <p className="text-xs text-faint tracking-wider mb-3">01 — 상대를 알 수 있습니다</p>
          <p>
            그 사람이 갈등 앞에서 어떤 선택을 하는지.
            상처받았을 때 도망치는지, 다가오는지.
            무엇을 지키려 하고, 무엇을 포기하는지.
          </p>
          <p className="mt-3">
            Signalogy에서는 이게 보입니다.
            프로필 사진이나 한 줄 소개가 아니라,
            그 사람이 실제로 한 선택들의 궤적으로.
          </p>
        </section>

        <section>
          <p className="text-xs text-faint tracking-wider mb-3">02 — 더 나은 관계를 만들 수 있습니다</p>
          <p>
            상대의 궤적이 보이면, 어디서 맞고 어디서 부딪히는지 알 수 있습니다.
            맞는 사람과는 더 깊어지고, 안 맞는 사람과는 미리 알 수 있습니다.
            관계에 쓰는 시간의 질이 달라집니다.
          </p>
        </section>

        <section>
          <p className="text-xs text-faint tracking-wider mb-3">03 — 나만의 궤적이 증명이 됩니다</p>
          <p>
            AI는 평균을 생성합니다. 하지만 당신의 궤적은 수십억 명 중 하나뿐입니다.
            복제할 수 없고, 흉내 낼 수 없습니다.
          </p>
          <p className="mt-3">
            AI 클론이 당신을 흉내 내도, 휴머노이드가 당신처럼 말해도,
            매일 쌓아온 선택의 궤적까지 복제할 수는 없습니다.
            이 궤적이 곧 당신이 진짜라는 증명이 됩니다.
          </p>
        </section>

        <section>
          <p className="text-xs text-faint tracking-wider mb-3">04 — 신뢰할 수 있는 네트워크를 얻습니다</p>
          <p>
            증명된 사람끼리 연결됩니다.
            신뢰도가 높은 사람의 관계는 선명하고,
            낮은 사람의 관계는 흐립니다.
            이건 벌이 아니라, 현실이 원래 그런 겁니다.
          </p>
          <p className="mt-3">
            당신이 얻는 건 팔로워가 아니라,
            진짜 당신을 아는 사람들의 네트워크입니다.
          </p>
        </section>

      </div>

      <div className="mt-12 pt-8 border-t border-line text-center">
        <p className="text-[10px] text-faint">SIGNALOGY</p>
        <p className="text-[10px] text-faint mt-1">진짜를 구별하고, 진짜 관계를 만드는 신뢰 인프라</p>
      </div>
    </div>
  );
}
