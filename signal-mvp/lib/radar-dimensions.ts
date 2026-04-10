// Signal — 소비자용 레이다 차원
// 15축 → 6개 핵심 차원으로 압축 (레이다 차트용)
// 원칙: "사람들이 느끼는 중요한 것만"

import type { IntegratedVector, Axis } from './types';

export interface RadarDimension {
  key: string;
  label: string;
  emoji: string;
  question: string;      // 사용자에게 이게 뭔지 한 줄
  value: number;          // 0-100
  sourceAxes: Axis[];     // 어디서 왔는지
}

// 6스포크 헥사곤 레이다
export function computeRadarDimensions(v: IntegratedVector): RadarDimension[] {
  const ax = v.axes;
  return [
    {
      key: 'warmth',
      label: '따뜻함',
      emoji: '🔥',
      question: '가까운 사람을 본능적으로 챙기는 정도',
      value: Math.round((ax.value_benevolence.value + ax.moral_care.value + ax.big5_agreeableness.value) / 3),
      sourceAxes: ['value_benevolence', 'moral_care', 'big5_agreeableness'],
    },
    {
      key: 'autonomy',
      label: '자율성',
      emoji: '🧭',
      question: '내 판단으로 내 길을 가는 정도',
      value: ax.value_self_direction.value,
      sourceAxes: ['value_self_direction'],
    },
    {
      key: 'stability',
      label: '안정감',
      emoji: '🛡️',
      question: '감정적으로 흔들리지 않는 정도',
      value: Math.round(((100 - ax.big5_neuroticism.value) + ax.value_security.value) / 2),
      sourceAxes: ['big5_neuroticism', 'value_security'],
    },
    {
      key: 'diligence',
      label: '성실함',
      emoji: '📐',
      question: '꼼꼼하고 신중하게 일을 처리하는 정도',
      value: ax.big5_conscientiousness.value,
      sourceAxes: ['big5_conscientiousness'],
    },
    {
      key: 'loyalty',
      label: '충성심',
      emoji: '🤝',
      question: '가까운 관계를 지키려는 의지',
      value: Math.round((ax.moral_loyalty.value + ax.value_tradition.value) / 2),
      sourceAxes: ['moral_loyalty', 'value_tradition'],
    },
    {
      key: 'resilience',
      label: '회복력',
      emoji: '🔄',
      question: '갈등 후 관계를 복구하는 능력',
      value: Math.round((ax.conflict_style.value + ax.repair_capacity.value) / 2),
      sourceAxes: ['conflict_style', 'repair_capacity'],
    },
  ];
}

// 애착 4분면용 좌표 (0-100 → -1..1 정규화)
export function getAttachmentPoint(v: IntegratedVector): { x: number; y: number; label: string } {
  const anx = v.axes.attach_anxiety.value;
  const avo = v.axes.attach_avoidance.value;
  const x = (avo - 50) / 50;   // -1 (회피 낮음) ~ +1 (회피 높음)
  const y = (anx - 50) / 50;   // -1 (불안 낮음) ~ +1 (불안 높음)

  let label: string;
  if (anx < 50 && avo < 50) label = '안정형';
  else if (anx >= 50 && avo < 50) label = '불안형';
  else if (anx < 50 && avo >= 50) label = '회피형';
  else label = '혼란형';

  return { x, y, label };
}
