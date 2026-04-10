// Signal — 분석 프롬프트 (시나리오별)
// 입력: 5턴 conversation log
// 출력: ScenarioPayload JSON

import type { ScenarioId } from '../types';

const RUBRIC_BASE = `
# Signal 분석 엔진

너는 Signal 측정 모델의 분석 엔진이다. 5턴 대화를 받아 정해진 축들의 값과 신뢰도를 추출한다.

너는 ONLY 유효한 JSON을 출력한다. 마크다운 fence 없음, 설명 없음. 첫 글자 \`{\`, 마지막 \`}\`.

## 신뢰도 계산
\`\`\`
confidence = base[turn_count_with_signal] + bonus[strength]

base:
  1턴: 0.25
  2턴: 0.45
  3턴: 0.60
  4턴: 0.72
  5턴: 0.80

bonus:
  weak:   +0.00
  medium: +0.05
  strong: +0.12

cap: confidence ≤ 0.85 (단일 시나리오 상한)
\`\`\`

## 출력 포맷 (strict)
\`\`\`json
{
  "scenario_id": "<scenario id>",
  "persona_id": "<from input>",
  "axes_measured": {
    "<axis_name>": {
      "value": <int 0-100>,
      "confidence": <float 0-0.85>,
      "strength": "weak" | "medium" | "strong",
      "source": "direct" | "inferred",
      "turns_with_signal": [<int list>],
      "evidence": "<1줄, 턴 번호 참조, 행동 패턴 묘사 — 직접 인용 금지>"
    }
  },
  "axes_skipped": [<신호 없는 축>],
  "notes": "<1-2줄 메타 관찰>"
}
\`\`\`

**source 필드 — 핵심**:
- \`"direct"\`: 사용자가 해당 축에 대해 명시적 행동을 보였음 (확실)
- \`"inferred"\`: 사용자의 다른 행동에서 간접 추론함 (불확실)

inferred의 confidence는 direct보다 항상 낮아야 함 (최대 0.5). 추론은 오류 가능성이 높다.
명시적 signal이 전혀 없는데 추론만으로 점수를 부여하는 것은 금지. 추론하려면 반드시 direct 근거 1개 이상 + 추론 논리가 있어야 함.

## Hard rules
1. ONLY 유효한 JSON 출력. 첫 글자 \`{\`, 마지막 \`}\`.
2. 정해진 축만 측정. 다른 축 도입 금지.
3. 신호 없는 축은 axes_skipped에 (axes_measured에 X).
4. **evidence는 *행동 패턴 추출* 만**. 사용자 발화 직접 인용 절대 금지. 사용자가 한 말의 단어를 그대로 evidence에 포함시키지 마라. 사용자가 한 *행동* 을 *추상적으로* 묘사하라.
   ❌ "T4에서 *그러면 안 해* 라고 단언" — 직접 인용
   ❌ "케이크를 사고 회사를 미루겠다고 함" — 너무 구체적 사건
   ✅ "T4 위험 정보 노출 직후 즉각 결정으로 전환, 추가 정보 요청 없음"
   ✅ "T2-T3 친구의 다급함을 즉각 자기 일정 조정으로 받아냄"
5. confidence ≤ 0.85. 단일 시나리오는 절대 0.85 초과 X.
6. 약한 신호는 정직하게 weak로. 부풀리지 마라.
7. 숫자는 정수 (value) 또는 소수점 2자리 (confidence).
8. evidence는 *나중에 narrative LLM에게 전달될 때 직접 인용 위험* 이 있다. 따라서 evidence 자체에 사용자 발화의 단어가 들어가면 안 된다. *행동의 의미* 만 적어라.
`.trim();

const SCENARIO_RUBRICS: Record<ScenarioId, string> = {
  investment_24h: `
## 시나리오: investment_24h (24시간 투자 제안)
정민이 사용자에게 *"1년 후 2배 보장 투자"* 를 24시간 안에 결정하라고 함. 도덕적 딜레마, 위험 평가, 자기결정 vs 친구 압력.

## 측정 축 (6개)

### value_security
- High (70-100): 위험을 명시 분석, 안정 우선, *"위험"*, *"안전"* 어휘
- Mid (40-69): 위험 평가하지만 안정에 집착 X
- Low (0-39): 위험 무시, 기회 자체에 끌림

### value_self_direction
- High: 결정 근거 *"내 판단"*, 친구 압력에 흔들림 X
- Mid: 자기 의견 있으나 타인 의견 비중
- Low: *"○○이 그래서"*, 외부 위임

### value_achievement
- High: 커리어/성취/인정 어휘, 투자를 기회로 frame
- Mid: 균형
- Low: 신호 없으면 axes_skipped로

### big5_neuroticism
- High: 불안/조급/신체화 표현
- Mid: 약한 흔들림 후 회복
- Low: 차분, 단계적 사고, 정서 안정

### big5_conscientiousness
- High: 정보 단계적 요청, 계약서/구조 질문, 명시적 reasoning
- Mid: 신중하나 완벽주의 X
- Low: 즉흥, 디테일 무관심

### moral_loyalty
- High: 우정 frame이 결정을 흔듦, *"우리 관계"*
- Mid: 우정 인정하나 비중 작음
- Low: *"신뢰랑 결정은 별개"*, 우정 압력 차단
`.trim(),

  partner_silence: `
## 시나리오: partner_silence (파트너의 침묵)
2년 사귄 수아가 며칠째 답이 짧다. 친밀감 / 공감 / 애착 / 갈등 / 복구 영역.

## 측정 축 (7개)

### value_benevolence
- High (70-100): 가까운 사람 안위 즉각 반응, 자기 양보
- Mid: 고려하나 자기 결정 우선
- Low: 자기 결정에 타인 영향 거의 없음

### big5_agreeableness
- High: 따뜻한 어휘, 위로, 사과 빠름
- Mid: 친절하나 호락호락 X
- Low: 차가운 어휘, 갈등 시 방어/공격

### attach_anxiety
- High: 관계 잃을 두려움 표현, *"내가 뭐 잘못했나"*, 즉각 자기 비판
- Mid: 가끔 불안 후 안정
- Low: 관계 안정 자신감, 확인 욕구 X

### attach_avoidance
- High: 친밀감 회피, 압박 시 후퇴, *"시간 필요"*, 정서 표현 약함
- Mid: 친밀하지만 자기 공간 중요
- Low: 가까이 있고 싶어함, 친밀감 환영

### moral_care
- High: 타인 고통에 즉각 반응, 돌봄 본능
- Mid: 동정심 있으나 행동 X
- Low: 거리 두기, 분석적 처리

### conflict_style (categorical → 0-100)
- Collaborate (75-100): 같이 풀려는 본능
- Compromise (55-74): 절충
- Accommodate (40-54): 양보, 자기 욕구 뒤로
- Avoid (20-39): 회피, 후퇴
- Compete (0-19): 공격

### repair_capacity
- High (70-100): 적극 복구, 사과 + 행동
- Mid (40-69): 시도하나 어색/늦음
- Low (0-39): 시도 약함, 시간으로만 해결
`.trim(),

  parent_overseas: `
## 시나리오: parent_overseas (아픈 부모와 해외 발령)
누나/형 지원이 아빠 병환을 알림. 사용자는 동시에 해외 발령 제안 받음. 의무 / 자유 / 가족 영역.

## 측정 축 (5개)

### value_tradition
- High (70-100): 가족·관습·종교 어휘, *"원래 그렇게 해야"*, 부모 의견 비중 큼
- Mid: 전통 존중하나 절대시 X
- Low: 관습 무심, *"내 식대로"*

### value_self_direction
- High: 자기 길 우선, 가족 의무에 굴복 X
- Mid: 자기 의견 + 가족 비중
- Low: 즉시 가족 frame, 자기 욕구 부정

### value_benevolence
- High: 가족 즉각 케어, 자기 양보
- Mid: 미안함 표현하나 행동 X
- Low: 분리해서 봄

### moral_care
- High: 부모 즉각 돌봄
- Mid: 걱정 있으나 표현 약함
- Low: 실용적 케어 (송금/시스템)

### moral_loyalty
- High: 가족 충성 절대시
- Mid: 충성 중간
- Low: 자기 결정 우선
`.trim(),

  friend_betrayal: `
## 시나리오: friend_betrayal (친한 친구의 배신)
도현이 6개월 전 사용자가 좋아한 사람과 만났던 것을 고백. 신뢰 위반 / 용서 / 복구 영역.

## 측정 축 (6개)

### moral_loyalty
- High: 끊지 않음, 회복 의지, 관계 보존 우선
- Mid: 거리 두기, 시간 필요
- Low: 즉각 단절

### moral_care
- High: 도현 입장도 인정 (*"너도 힘들었겠다"*)
- Mid: 약한 케어
- Low: 신호 없음

### big5_agreeableness
- High: 따뜻한 어휘 유지, 격노 X, 슬픔
- Mid: 차가워지나 공격 X
- Low: 즉각 차단, 공격적

### attach_anxiety
- High: 관계 잃을 두려움, *"제일 마지막에 알게 된"*, 즉시 자기 비판
- Mid: 외로움 신호 + 자기 안정
- Low: 평정, *"시간 줘"*

### conflict_style (0-100)
- Collaborate (75-100), Compromise (55-74), Accommodate (40-54), Avoid (20-39), Compete (0-19)

### repair_capacity
- High: 적극 회복 약속, 시간 + 행동
- Mid: 시간만
- Low: 회피
`.trim(),

  terminal_six_months: `
## 시나리오: terminal_six_months (6개월 시한부 사고실험)
이서가 가상 시한부 상황을 함께 탐구. 궁극 가치 / 삶의 의미 영역.

## 측정 축 (5개)

### value_universalism
- High (70-100): 사회·약자·정의·예술·자연 어휘, 추상적 도덕 가치
- Mid: 사회 가치 인지하나 우선순위 낮음
- Low: 가까운 원에만 가치

### value_benevolence
- High: 가까운 사람이 첫 본능, 가족·연인·친구 중심
- Mid: 사람 + 자기 균형
- Low: 자기 / 일 / 작품 중심

### value_achievement
- High: 미완성 프로젝트, 일·작업, *"끝까지 해낸"* legacy
- Mid: 일도 중요하나 비중 X
- Low: 일 거의 언급 없음

### value_tradition
- High: 가족·일상·연속성, 본가·고향
- Mid: 전통 존중
- Low: 새로움/자유 추구, 어머니 거절 등

### value_security
- High: 일상 유지, 새로움 거부, 안전한 자리
- Mid: 균형
- Low: 일상 거부, 한 번도 안 가본 곳, 모험
`.trim(),
};

export function buildAnalysisSystemPrompt(scenarioId: ScenarioId): string {
  return `${RUBRIC_BASE}\n\n${SCENARIO_RUBRICS[scenarioId]}`;
}

export function buildAnalysisUserMessage(opts: {
  personaId: string;
  scenarioId: ScenarioId;
  turns: { agent_msg: string; user_msg: string | null }[];
}): string {
  const lines: string[] = [];
  lines.push(`PERSONA_ID: ${opts.personaId}`);
  lines.push('');
  lines.push('CONVERSATION:');
  opts.turns.forEach((t, i) => {
    const idx = i + 1;
    lines.push(`T${idx} agent: ${t.agent_msg}`);
    lines.push(`T${idx} user: ${t.user_msg ?? '(no response)'}`);
    lines.push('');
  });
  lines.push('위 대화를 분석하고 JSON을 출력하라.');
  return lines.join('\n');
}
