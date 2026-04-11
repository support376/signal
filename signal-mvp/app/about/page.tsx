import Link from 'next/link';
import { cookies } from 'next/headers';

export default function AboutPage() {
  const isLoggedIn = !!cookies().get('signal_user_id')?.value;

  return (
    <div className="max-w-lg mx-auto px-6 py-12 pb-24">
      <Link href={isLoggedIn ? '/profile' : '/'} className="text-xs text-faint hover:text-dim">
        ← {isLoggedIn ? 'More' : '돌아가기'}
      </Link>

      <div className="mt-8 mb-12">
        <p className="text-faint text-[10px] tracking-wider mb-6">SIGNALOGY</p>
        <h1 className="text-2xl font-bold text-fg leading-snug mb-8">
          우리는 사람을<br />측정하지 않습니다.<br />신호를 읽습니다.
        </h1>
      </div>

      <div className="space-y-10 text-sm text-dim leading-relaxed">

        <section>
          <p className="text-xs text-faint tracking-wider mb-3">01 — 왜 만들었는가</p>
          <p>
            MBTI는 16개 박스에 사람을 넣습니다.
            사주는 태어난 날로 평생을 정합니다.
            둘 다 편리하지만, 둘 다 당신이 <span className="text-fg">지금 어떤 사람인지</span>는 모릅니다.
          </p>
          <p className="mt-3">
            사람은 변합니다. 어제의 나와 오늘의 나는 다릅니다.
            한번 찍은 스냅샷이 아니라, 매일 흐르는 신호가 필요합니다.
            Signalogy는 그 신호를 읽는 도구입니다.
          </p>
        </section>

        <section>
          <p className="text-xs text-faint tracking-wider mb-3">02 — 어떻게 작동하는가</p>
          <p>
            매일 하나의 시나리오가 주어집니다.
            카카오톡처럼 5턴 대화. 1분이면 끝납니다.
            당신이 무엇을 선택하고, 어떻게 반응하고, 무엇을 회피하는지 —
            그 <span className="text-fg">선택의 패턴</span>이 15축 성격 벡터로 변환됩니다.
          </p>
          <p className="mt-3">
            한 번의 측정은 흐릿합니다. 하지만 매일 쌓이면 선명해집니다.
            시계열 데이터가 누적될수록 신뢰도가 올라가고,
            오래 안 하면 자연스럽게 흐려집니다.
            이게 정적인 라벨과 동적인 신호의 차이입니다.
          </p>
        </section>

        <section>
          <p className="text-xs text-faint tracking-wider mb-3">03 — 15축은 무엇인가</p>
          <div className="space-y-2 mt-3">
            <p className="text-fg text-xs">가치관 (Schwartz)</p>
            <p>안정, 돌봄, 자율, 성취, 보편, 전통 — 당신이 중요하게 여기는 것.</p>

            <p className="text-fg text-xs mt-3">성격 (Big Five)</p>
            <p>정서 불안정, 친화성, 성실 — 당신이 세상과 부딪히는 방식.</p>

            <p className="text-fg text-xs mt-3">애착 (Bowlby)</p>
            <p>관계 불안, 친밀감 회피 — 당신이 사람에게 다가가는 방식.</p>

            <p className="text-fg text-xs mt-3">도덕 (Haidt)</p>
            <p>충성, 돌봄 — 당신이 옳고 그름을 판단하는 기준.</p>

            <p className="text-fg text-xs mt-3">행동</p>
            <p>갈등 처리, 관계 복구 — 부딪혔을 때 당신이 실제로 하는 것.</p>
          </div>
        </section>

        <section>
          <p className="text-xs text-faint tracking-wider mb-3">04 — 케미는 어떻게 계산되는가</p>
          <p>
            두 사람의 15축 벡터를 수학으로 비교합니다.
            LLM이 아닙니다. 순수한 코사인 유사도, 가중 평균, 애착 매트릭스.
            같은 입력이면 같은 결과. 재현 가능하고 설명 가능합니다.
          </p>
          <p className="mt-3">
            친구, 연인, 가족, 동료 — 네 가지 렌즈로 봅니다.
            같은 두 사람이라도 관계의 종류에 따라 궁합이 다릅니다.
            이것도 현실입니다.
          </p>
        </section>

        <section>
          <p className="text-xs text-faint tracking-wider mb-3">05 — 우리가 하지 않는 것</p>
          <div className="space-y-2">
            <p><span className="text-fg">데이터를 팔지 않습니다.</span> 당신의 성격 벡터는 당신의 것입니다.</p>
            <p><span className="text-fg">광고를 넣지 않습니다.</span> 주의를 팔아서 돈을 벌지 않습니다.</p>
            <p><span className="text-fg">라벨을 붙이지 않습니다.</span> INFP, 물고기자리 같은 박스는 없습니다.</p>
            <p><span className="text-fg">한 번으로 판단하지 않습니다.</span> 매일의 신호가 쌓여야 의미가 됩니다.</p>
          </div>
        </section>

        <section>
          <p className="text-xs text-faint tracking-wider mb-3">06 — 신뢰도라는 개념</p>
          <p>
            Signalogy는 모든 측정에 신뢰도를 붙입니다.
            대충 답하면 신뢰도가 낮아지고, 진지하게 답하면 올라갑니다.
            오래 안 하면 자연스럽게 감쇠합니다.
          </p>
          <p className="mt-3">
            신뢰도가 낮은 사람의 케미 결과는 흐리게 표시됩니다.
            이건 벌이 아니라 정직함입니다.
            "이 결과를 얼마나 믿을 수 있는지"를 항상 함께 보여줍니다.
          </p>
        </section>

      </div>

      <div className="mt-12 pt-8 border-t border-line text-center">
        <p className="text-[10px] text-faint">SIGNALOGY</p>
        <p className="text-[10px] text-faint mt-1">잠재의식 측정 기반 정서 연결 인프라</p>
      </div>
    </div>
  );
}
