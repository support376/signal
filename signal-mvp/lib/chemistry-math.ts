// Signal Layer 2 — Chemistry Math
// 두 IntegratedVector + lens → 점수 + 매트릭스 정보
// 순수 수학. LLM 호출 0.

import { AXES, type Axis, type IntegratedVector, type Lens } from './types';

type Group = 'value' | 'big5' | 'attachment' | 'moral' | 'behavior';

const AXIS_GROUPS: Record<Axis, Group> = {
  value_security: 'value',
  value_benevolence: 'value',
  value_self_direction: 'value',
  value_achievement: 'value',
  value_universalism: 'value',
  value_tradition: 'value',
  big5_neuroticism: 'big5',
  big5_agreeableness: 'big5',
  big5_conscientiousness: 'big5',
  attach_anxiety: 'attachment',
  attach_avoidance: 'attachment',
  moral_loyalty: 'moral',
  moral_care: 'moral',
  conflict_style: 'behavior',
  repair_capacity: 'behavior',
};

const LENS_WEIGHTS: Record<Lens, Record<Group, number>> = {
  friend: { value: 0.30, big5: 0.20, attachment: 0.15, moral: 0.15, behavior: 0.20 },
  romantic: { value: 0.32, big5: 0.15, attachment: 0.25, moral: 0.10, behavior: 0.18 },
  family: { value: 0.30, big5: 0.20, attachment: 0.25, moral: 0.15, behavior: 0.10 },
  work: { value: 0.25, big5: 0.30, attachment: 0.10, moral: 0.15, behavior: 0.20 },
};

type AttachmentStyle = 'secure' | 'anxious' | 'avoidant' | 'disorganized';

function classifyAttachment(anx: number, avo: number): AttachmentStyle {
  if (anx < 50 && avo < 50) return 'secure';
  if (anx >= 50 && avo < 50) return 'anxious';
  if (anx < 50 && avo >= 50) return 'avoidant';
  return 'disorganized';
}

const ATTACHMENT_MATRIX: Record<AttachmentStyle, Record<AttachmentStyle, number>> = {
  secure:       { secure: 0.95, anxious: 0.70, avoidant: 0.65, disorganized: 0.45 },
  anxious:      { secure: 0.70, anxious: 0.55, avoidant: 0.25, disorganized: 0.35 },
  avoidant:     { secure: 0.65, anxious: 0.25, avoidant: 0.50, disorganized: 0.35 },
  disorganized: { secure: 0.45, anxious: 0.35, avoidant: 0.35, disorganized: 0.30 },
};

export interface ChemistryMathResult {
  display: number;
  raw_score: number;
  raw_base: number;
  conflict_penalty: number;
  major_conflicts: Axis[];
  attachment_a: AttachmentStyle;
  attachment_b: AttachmentStyle;
  attachment_value: number;
  attachment_label: string;
  group_similarities: Record<Group, number>;
  axis_similarities: Record<Axis, number>;
  lens: Lens;
}

export function computeChemistry(
  a: IntegratedVector,
  b: IntegratedVector,
  lens: Lens
): ChemistryMathResult {
  // 1. Axis similarities
  const axisSim: Record<Axis, number> = {} as any;
  for (const ax of AXES) {
    const va = a.axes[ax].value;
    const vb = b.axes[ax].value;
    axisSim[ax] = 1 - Math.abs(va - vb) / 100;
  }

  // 2. Group means
  const groupAxes: Record<Group, Axis[]> = {
    value: [], big5: [], attachment: [], moral: [], behavior: [],
  };
  for (const ax of AXES) groupAxes[AXIS_GROUPS[ax]].push(ax);

  const groupSim: Record<Group, number> = {} as any;
  for (const g of ['value', 'big5', 'attachment', 'moral', 'behavior'] as Group[]) {
    const sims = groupAxes[g].map((ax) => axisSim[ax]);
    groupSim[g] = sims.reduce((s, v) => s + v, 0) / sims.length;
  }

  // 3. Attachment matrix override
  const attA = classifyAttachment(a.axes.attach_anxiety.value, a.axes.attach_avoidance.value);
  const attB = classifyAttachment(b.axes.attach_anxiety.value, b.axes.attach_avoidance.value);
  const attVal = ATTACHMENT_MATRIX[attA][attB];
  groupSim.attachment = attVal;

  // 4. Raw base with lens weights
  const w = LENS_WEIGHTS[lens];
  const rawBase =
    w.value * groupSim.value +
    w.big5 * groupSim.big5 +
    w.attachment * groupSim.attachment +
    w.moral * groupSim.moral +
    w.behavior * groupSim.behavior;

  // 5. Major conflict penalty
  const majorConflicts: Axis[] = [];
  for (const ax of AXES) {
    const va = a.axes[ax].value;
    const vb = b.axes[ax].value;
    const ca = a.axes[ax].confidence;
    const cb = b.axes[ax].confidence;
    if (Math.abs(va - vb) > 55 && ca > 0.5 && cb > 0.5) {
      majorConflicts.push(ax);
    }
  }
  const penalty = Math.min(0.18, majorConflicts.length * 0.03);
  const rawScore = rawBase - penalty;

  // 6. Calibration
  const display = Math.max(0, Math.min(100, Math.round(((rawScore - 0.35) / 0.6) * 100)));

  return {
    display,
    raw_score: rawScore,
    raw_base: rawBase,
    conflict_penalty: penalty,
    major_conflicts: majorConflicts,
    attachment_a: attA,
    attachment_b: attB,
    attachment_value: attVal,
    attachment_label: `${attA} × ${attB}`,
    group_similarities: groupSim,
    axis_similarities: axisSim,
    lens,
  };
}
