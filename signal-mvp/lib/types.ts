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

export interface AxisMeasurement {
  value: number;        // 0..100
  confidence: number;   // 0..0.85 (single scenario) or 0..0.95 (integrated)
  strength?: 'weak' | 'medium' | 'strong';
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
