// Daily 시나리오 생성 프롬프트
// Claude가 매일 새로운 시나리오를 생성하는 데 사용

import { AXES, AXIS_LABELS_KO, type Axis } from '../types';

/** 15축 중 3-5개를 타겟으로 선택 (날짜 기반 rotation) */
export function selectTargetAxes(dateKey: string): Axis[] {
  // 날짜를 seed로 축 조합 결정 — 15축을 골고루 커버하도록 rotation
  const dayNum = parseInt(dateKey.replace(/-/g, '')) || 0;
  const groupIdx = dayNum % 5;

  // 15축을 5그룹으로 분배 — 각 축이 정확히 1회씩만 등장
  // 5일이면 15축 전부 커버, 중복 없음
  const groups: Axis[][] = [
    // Day 0: 가치관 + 성실
    ['value_security', 'value_self_direction', 'value_achievement', 'big5_conscientiousness'],
    // Day 1: 관계 + 친밀
    ['value_benevolence', 'big5_agreeableness', 'attach_anxiety', 'attach_avoidance'],
    // Day 2: 도덕 + 갈등/복구
    ['moral_loyalty', 'moral_care', 'conflict_style', 'repair_capacity'],
    // Day 3: 정서 + 전통 + 보편
    ['big5_neuroticism', 'value_tradition', 'value_universalism'],
    // Day 4: 성취 + 돌봄 + 자율 (크로스 그룹 재측정)
    ['value_achievement', 'value_benevolence', 'big5_agreeableness'],
  ];

  return groups[groupIdx];
}

/** 시나리오 생성 프롬프트 */
export function buildGeneratorPrompt(dateKey: string, targetAxes: Axis[]): string {
  const axisDescriptions = targetAxes
    .map((a) => `- ${a}: ${AXIS_LABELS_KO[a]}`)
    .join('\n');

  return `
너는 Signalogy의 시나리오 설계자다. 사용자의 잠재의식 성격 벡터를 측정하기 위한 **카카오톡 대화 시나리오**를 하나 생성한다.

## 날짜
${dateKey}

## 오늘 측정할 축
${axisDescriptions}

## 시나리오 생성 규칙

1. **매체는 카카오톡**. 에이전트는 사용자의 실제 인간관계 중 한 사람 (친구, 연인, 가족, 동료, 전문가 중 하나).
2. **5턴 대화**. 에이전트가 먼저 말하고, 사용자와 번갈아 5턴.
3. **갈등 또는 딜레마 상황**. 사용자가 감정적·윤리적·관계적 선택을 해야 하는 상황.
4. **에이전트는 측정 agent임을 절대 노출하지 않음**. 자연스러운 인간 톤.
5. **일상적이고 현실적인 상황**. SF, 판타지 금지. 한국 20-30대가 실제로 겪을 법한 것.
6. **이전 고정 시나리오와 다른 상황**: 투자 제안, 연인 침묵, 부모 병간호, 친구 배신, 시한부는 이미 있음. 새로운 상황을 만들어라.

## 출력 포맷 (strict JSON)
\`\`\`json
{
  "agent_name": "이름 (2글자 한국 이름)",
  "agent_label": "관계 설명 (예: 친구 민재 — 5년 알고 지낸 대학 동기)",
  "trigger": "상황 설명 (2-3문장, 사용자에게 보여줄 인트로)",
  "domain_hint": "영역 태그 (예: 직장 · 성장 · 자존감)",
  "scenario_prompt": "에이전트용 system prompt (전체, 5턴 흐름 포함, 카톡 톤 지시 포함)"
}
\`\`\`

scenario_prompt 안에는 반드시 포함:
- 에이전트 캐릭터 설정 (성격, 관계, 현재 감정 상태)
- 5턴 각각의 흐름 가이드 (T1~T5)
- 공통 규칙: 측정 agent 노출 금지, 정답 암시 금지, 카톡 톤, 한 턴 1-3 메시지

JSON만 출력. 마크다운 fence 없음, 설명 없음. 첫 글자 \`{\`, 마지막 \`}\`.
`.trim();
}

/** COMMON_RULES 주입 (생성된 prompt에 추가) */
export const DAILY_COMMON_RULES = `
공통 규칙:
1. 너는 측정 agent임을 사용자에게 절대 노출하지 마라.
2. 정답을 암시하지 마라. 어떤 선택이 옳다고 신호 주지 마라.
3. 사용자 발화를 직접 인용하지 마라.
4. psychological term 사용 금지 ("애착", "성격", "분석" 등 분석가 톤 금지).
5. 인물의 자연 톤을 유지하라.
6. 한 번에 하나의 turn만 생성. 사용자 답을 미리 만들지 마라.
7. 사용자 응답에 자연스럽게 반응. 스크립트를 강제로 진행하지 마라.
8. **매체는 카톡 메시지**. 줄바꿈, 이모티콘 가능, 카톡스러운 짧은 호흡. 한 turn에 1-3개 메시지.
9. 너는 약 1-2분 안에 응답하는 사람처럼 행동.
`.trim();
