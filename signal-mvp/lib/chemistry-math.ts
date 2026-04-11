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
  friend:   { value: 0.30, big5: 0.20, attachment: 0.15, moral: 0.15, behavior: 0.20 },
  romantic: { value: 0.32, big5: 0.15, attachment: 0.25, moral: 0.10, behavior: 0.18 },
  family:   { value: 0.30, big5: 0.20, attachment: 0.25, moral: 0.15, behavior: 0.10 },
  work:     { value: 0.25, big5: 0.30, attachment: 0.10, moral: 0.15, behavior: 0.20 },
};

type AttachmentStyle = 'secure' | 'anxious' | 'avoidant' | 'disorganized';

/**
 * 애착 분류 — 경계 구간(40-60) 처리
 * 40 미만 = 확실히 낮음, 60 이상 = 확실히 높음
 * 40-60 = 경계 구간 → 가까운 쪽으로 분류하되 confidence가 낮다고 간주
 */
function classifyAttachment(anx: number, avo: number): { style: AttachmentStyle; borderline: boolean } {
  const anxHigh = anx >= 60;
  const avoHigh = avo >= 60;
  const anxLow = anx < 40;
  const avoLow = avo < 40;
  const borderline = (!anxHigh && !anxLow) || (!avoHigh && !avoLow);

  if (anx < 50 && avo < 50) return { style: 'secure', borderline };
  if (anx >= 50 && avo < 50) return { style: 'anxious', borderline };
  if (anx < 50 && avo >= 50) return { style: 'avoidant', borderline };
  return { style: 'disorganized', borderline };
}

/**
 * 애착 매트릭스 — Mikulincer & Shaver (2007) 기반
 *
 * secure × secure (0.90): 안정 애착끼리 — 안전기지 형성, 갈등 시 건설적 대응
 * anxious × avoidant (0.25): 추구-회피 역학 — 가장 갈등이 높은 조합
 * anxious × anxious (0.50): 공감은 높지만 불안이 증폭 — 과잉 의존 위험
 * avoidant × avoidant (0.45): 친밀감 회피끼리 — 안정적이나 깊이 제한
 * disorganized (0.30-0.40): 혼란형 — 일관된 전략 부재, 관계 예측 어려움
 *
 * 수치는 관계 만족도 연구(Feeney, 2008)의 상대적 패턴을 0-1로 정규화.
 * borderline 분류일 경우 매트릭스 값과 기본 유사도의 중간값 사용.
 */
const ATTACHMENT_MATRIX: Record<AttachmentStyle, Record<AttachmentStyle, number>> = {
  secure:       { secure: 0.90, anxious: 0.65, avoidant: 0.60, disorganized: 0.40 },
  anxious:      { secure: 0.65, anxious: 0.50, avoidant: 0.25, disorganized: 0.35 },
  avoidant:     { secure: 0.60, anxious: 0.25, avoidant: 0.45, disorganized: 0.35 },
  disorganized: { secure: 0.40, anxious: 0.35, avoidant: 0.35, disorganized: 0.30 },
};

export interface ChemistryMathResult {
  display: number;
  raw_score: number;
  raw_base: number;
  conflict_penalty: number;
  major_conflicts: Axis[];
  attachment_a: AttachmentStyle;
  attachment_b: AttachmentStyle;
  attachment_borderline: boolean;
  attachment_value: number;
  attachment_label: string;
  group_similarities: Record<Group, number>;
  group_measured: Record<Group, boolean>;
  axis_similarities: Record<Axis, number>;
  lens: Lens;
  effective_axes: number;
  effective_ratio: number;
  avg_pair_confidence: number;
  reliability_label: '낮음' | '중간' | '높음';
}

export function computeChemistry(
  a: IntegratedVector,
  b: IntegratedVector,
  lens: Lens
): ChemistryMathResult {
  // 1. 축별 유사도 + 양쪽 confidence
  const axisSim: Record<Axis, number> = {} as any;
  const pairConfs: number[] = [];
  let effectiveAxes = 0;

  for (const ax of AXES) {
    const va = a.axes[ax].value;
    const vb = b.axes[ax].value;
    const ca = a.axes[ax].confidence;
    const cb = b.axes[ax].confidence;

    // 정규화된 절대차 유사도: 0(정반대) ~ 1(동일)
    axisSim[ax] = 1 - Math.abs(va - vb) / 100;
    const pairConf = Math.min(ca, cb);
    pairConfs.push(pairConf);
    if (pairConf > 0) effectiveAxes++;
  }

  // 2. 그룹별 가중 평균 — 미측정 그룹은 제외
  const groupAxes: Record<Group, Axis[]> = {
    value: [], big5: [], attachment: [], moral: [], behavior: [],
  };
  for (const ax of AXES) groupAxes[AXIS_GROUPS[ax]].push(ax);

  const groupSim: Record<Group, number> = {} as any;
  const groupMeasured: Record<Group, boolean> = {} as any;

  for (const g of ['value', 'big5', 'attachment', 'moral', 'behavior'] as Group[]) {
    const items = groupAxes[g].map((ax) => ({
      sim: axisSim[ax],
      weight: Math.min(a.axes[ax].confidence, b.axes[ax].confidence),
    }));
    const totalWeight = items.reduce((s, i) => s + i.weight, 0);

    if (totalWeight > 0) {
      groupSim[g] = items.reduce((s, i) => s + i.sim * i.weight, 0) / totalWeight;
      groupMeasured[g] = true;
    } else {
      // 미측정 그룹 → 계산에서 제외 (가중치 재분배)
      groupSim[g] = 0;
      groupMeasured[g] = false;
    }
  }

  // 3. 애착 매트릭스 오버라이드 (양쪽 모두 측정된 경우만)
  const attClassA = classifyAttachment(a.axes.attach_anxiety.value, a.axes.attach_avoidance.value);
  const attClassB = classifyAttachment(b.axes.attach_anxiety.value, b.axes.attach_avoidance.value);
  const attConfA = Math.min(a.axes.attach_anxiety.confidence, a.axes.attach_avoidance.confidence);
  const attConfB = Math.min(b.axes.attach_anxiety.confidence, b.axes.attach_avoidance.confidence);
  const attMatrixVal = ATTACHMENT_MATRIX[attClassA.style][attClassB.style];
  const attBorderline = attClassA.borderline || attClassB.borderline;

  if (attConfA > 0.3 && attConfB > 0.3 && groupMeasured.attachment) {
    if (attBorderline) {
      // 경계 구간: 매트릭스 값과 기본 유사도의 중간
      groupSim.attachment = (attMatrixVal + groupSim.attachment) / 2;
    } else {
      groupSim.attachment = attMatrixVal;
    }
  }

  // 4. 렌즈 가중 합산 — 미측정 그룹 제외, 가중치 재분배
  const w = LENS_WEIGHTS[lens];
  let totalLensWeight = 0;
  let rawBase = 0;

  for (const g of ['value', 'big5', 'attachment', 'moral', 'behavior'] as Group[]) {
    if (groupMeasured[g]) {
      rawBase += w[g] * groupSim[g];
      totalLensWeight += w[g];
    }
  }

  // 측정된 그룹이 있으면 가중치 정규화, 없으면 0
  rawBase = totalLensWeight > 0 ? rawBase / totalLensWeight : 0;

  // 5. 주요 충돌 페널티 (양쪽 conf > 0.5인 경우만)
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

  /**
   * 6. Calibration: raw score → 0-100 display score
   *
   * 공식: display = (rawScore - baseline) / range * 100
   *
   * baseline (0.35): 두 랜덤 사람의 기대 유사도.
   *   15축이 독립 균등분포(0-100)일 때 E[1 - |a-b|/100] = 0.33.
   *   실제 분포는 중앙 편향이므로 약간 높은 0.35 사용.
   *
   * range (0.55): baseline(0.35)과 이론적 최대(0.90) 사이의 거리.
   *   완벽 일치라도 raw 1.0이 아닌 ~0.90 (그룹 가중 + 페널티 여유).
   *
   * 결과: 랜덤 두 사람 ≈ 0점, 높은 유사도 ≈ 100점.
   * 실 데이터 축적 시 baseline/range 재조정 필요.
   */
  const BASELINE = 0.35;
  const RANGE = 0.55;
  const display = Math.max(0, Math.min(100, Math.round(((rawScore - BASELINE) / RANGE) * 100)));

  // 7. 신뢰도 메타
  const effectiveRatio = effectiveAxes / 15;
  const avgPairConf = pairConfs.reduce((s, c) => s + c, 0) / pairConfs.length;
  let reliability: ChemistryMathResult['reliability_label'];
  if (effectiveRatio < 0.5 || avgPairConf < 0.25) reliability = '낮음';
  else if (effectiveRatio < 0.85 || avgPairConf < 0.50) reliability = '중간';
  else reliability = '높음';

  return {
    display,
    raw_score: rawScore,
    raw_base: rawBase,
    conflict_penalty: penalty,
    major_conflicts: majorConflicts,
    attachment_a: attClassA.style,
    attachment_b: attClassB.style,
    attachment_borderline: attBorderline,
    attachment_value: attMatrixVal,
    attachment_label: `${attClassA.style}${attBorderline ? '~' : ''} × ${attClassB.style}${attBorderline ? '~' : ''}`,
    group_similarities: groupSim,
    group_measured: groupMeasured,
    axis_similarities: axisSim,
    lens,
    effective_axes: effectiveAxes,
    effective_ratio: effectiveRatio,
    avg_pair_confidence: avgPairConf,
    reliability_label: reliability,
  };
}
