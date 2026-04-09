// Signal — 시나리오 메타데이터 (pure data, client/server 모두 사용 가능)
// 시나리오 system prompt 본문은 lib/prompts/scenarios.ts (server only).
// 이 파일은 client component import 가능 — bundle 가벼움.

import type { ScenarioId } from './types';

export interface ScenarioContext {
  agentName: string;
  agentLabel: string;
  trigger: string;
  domainHint: string;
  estimatedMinutes: string;
}

export const SCENARIO_CONTEXTS: Record<ScenarioId, ScenarioContext> = {
  investment_24h: {
    agentName: '정민',
    agentLabel: '친구 정민 — 7~8년 알고 지낸 친한 친구',
    trigger:
      '정민이 갑자기 카톡으로 다급한 메시지를 보냈다. 친척 형의 투자 기회가 났다고. 1년 후 원금 두 배 보장. 그런데 결정 기한이 오늘 밤이다.',
    domainHint: '의사결정 · 신뢰 · 위험 · 가치관',
    estimatedMinutes: '약 5~7분',
  },
  partner_silence: {
    agentName: '수아',
    agentLabel: '연인 수아 — 2년 사귄 사이',
    trigger:
      '수아의 답이 며칠째 짧다. 평소엔 다정한 사람이 *"응"*, *"별일 없어"* 만 보낸다. 오늘 너는 카톡으로 안부를 물었다.',
    domainHint: '친밀감 · 공감 · 갈등 · 복구',
    estimatedMinutes: '약 5~8분',
  },
  parent_overseas: {
    agentName: '지원',
    agentLabel: '누나/형 지원 — 4~5살 위 맏이, 결혼해서 자기 가족이 있음',
    trigger:
      '지원이 갑자기 카톡을 보냈다. 어제 아빠 검사 결과가 나왔는데 좋지 않다고. 그리고 너는 어제 회사에서 해외 발령 제안을 받았다 — 결정 기한 일주일.',
    domainHint: '가족 · 의무 · 자유',
    estimatedMinutes: '약 7~10분',
  },
  friend_betrayal: {
    agentName: '도현',
    agentLabel: '친한 친구 도현 — 7~10년 알고 지낸 사이',
    trigger:
      '도현이 갑자기 카톡으로 *"야 할 말 있어 ㅜ"* 라고 보냈다. 그리고 한참 망설이다 6개월 전 일을 털어놓기 시작한다 — 너가 좋아했던 사람과 잠깐 만났던 일.',
    domainHint: '신뢰 · 용서 · 관계 복구',
    estimatedMinutes: '약 8~12분',
  },
  terminal_six_months: {
    agentName: '이서',
    agentLabel: '이서 — 정신건강·삶의 의미를 연구하는 전문가',
    trigger:
      '이서가 카톡으로 사고 실험 하나를 같이 해보자고 연락했다. *"6개월 시한부 진단을 받았다고 가정해봅시다"* — 진짜 진단이 아니라 사고 실험이다.',
    domainHint: '궁극 가치 · 삶의 의미',
    estimatedMinutes: '약 7~10분',
  },
};

export const SCENARIO_LABELS: Record<ScenarioId, string> = {
  investment_24h: '시나리오 1 — 24시간 투자 제안',
  partner_silence: '시나리오 2 — 파트너의 침묵',
  parent_overseas: '시나리오 3 — 아픈 부모와 해외 발령',
  friend_betrayal: '시나리오 4 — 친한 친구의 배신',
  terminal_six_months: '시나리오 5 — 6개월 시한부',
};

export const SCENARIO_ORDER: ScenarioId[] = [
  'investment_24h',
  'partner_silence',
  'parent_overseas',
  'friend_betrayal',
  'terminal_six_months',
];

export const TURN_LIMIT = 5;
