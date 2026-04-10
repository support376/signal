// Signal — 공통 타입

export const AXES = [
  'value_security',
  'value_benevolence',
  'value_self_direction',
  'value_achievement',
  'value_universalism',
  'value_tradition',
  'big5_neuroticism',
  'big5_agreeableness',
  'big5_conscientiousness',
  'attach_anxiety',
  'attach_avoidance',
  'moral_loyalty',
  'moral_care',
  'conflict_style',
  'repair_capacity',
] as const;

export type Axis = (typeof AXES)[number];

export const SCENARIOS = [
  'investment_24h',
  'partner_silence',
  'parent_overseas',
  'friend_betrayal',
  'terminal_six_months',
] as const;

export type ScenarioId = (typeof SCENARIOS)[number];

export const LENSES = ['friend', 'romantic', 'family', 'work'] as const;
export type Lens = (typeof LENSES)[number];

// 축 ID → 한국어 label (decoder 입력에 사용, 영문 ID leak 방지)
export const AXIS_LABELS_KO: Record<Axis, string> = {
  value_security: '안정·예측가능성',
  value_benevolence: '가까운 사람 돌봄',
  value_self_direction: '자기결정·자율',
  value_achievement: '성취·인정',
  value_universalism: '보편·정의·약자 보호',
  value_tradition: '전통·관습·연속성',
  big5_neuroticism: '정서 불안정',
  big5_agreeableness: '친화성',
  big5_conscientiousness: '성실·신중',
  attach_anxiety: '관계 불안',
  attach_avoidance: '친밀감 회피',
  moral_loyalty: '관계 충성',
  moral_care: '돌봄 도덕',
  conflict_style: '갈등 처리 (높을수록 협력적, 낮을수록 회피·공격)',
  repair_capacity: '관계 복구 능력',
};

export interface AxisMeasurement {
  value: number;        // 0..100
  confidence: number;   // 0..0.85 (single scenario) or 0..0.95 (integrated)
  strength?: 'weak' | 'medium' | 'strong';
  source?: 'direct' | 'inferred';  // 직접 관찰 vs 간접 추론
  turns_with_signal?: number[];
  evidence: string;
}

export interface ScenarioPayload {
  scenario_id: ScenarioId;
  persona_id: string;
  axes_measured: Partial<Record<Axis, AxisMeasurement>>;
  axes_skipped: Axis[];
  notes: string;
}

export interface IntegratedVector {
  persona_id: string;
  scenarios_completed: ScenarioId[];
  axes: Record<Axis, AxisMeasurement & { measurement_count: number; spread: number }>;
  summary: {
    measured_axes: number;
    high_confidence_axes: number;
    average_confidence: number;
    flagged_conflicts: Axis[];
  };
}

export interface Turn {
  turn_idx: number;
  agent_msg: string;
  user_msg: string | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
