// Signal Layer 0.5 — Integrator
// N개 시나리오 payload → 단일 15축 통합 벡터 (1개부터 5개까지 모두 지원)
// 순수 수학. LLM 호출 0.

import { AXES, AXIS_LABELS_KO, type Axis, type ScenarioPayload, type IntegratedVector, type AxisMeasurement } from './types';

interface AxisMeasurementInternal {
  value: number;
  confidence: number;
  scenario_id: string;
  evidence: string;
}

export function integrate(payloads: ScenarioPayload[], personaId: string): IntegratedVector {
  // 1. 측정치 수집
  const collected: Record<Axis, AxisMeasurementInternal[]> = {} as any;
  for (const a of AXES) collected[a] = [];

  for (const p of payloads) {
    for (const [axisName, m] of Object.entries(p.axes_measured)) {
      const axis = axisName as Axis;
      if (!m) continue;
      collected[axis].push({
        value: m.value,
        confidence: m.confidence,
        scenario_id: p.scenario_id,
        evidence: m.evidence,
      });
    }
  }

  // 2. 축별 통합
  const result: Record<Axis, AxisMeasurement & { measurement_count: number; spread: number }> = {} as any;

  for (const axis of AXES) {
    const measurements = collected[axis];

    if (measurements.length === 0) {
      // Uninformative prior
      result[axis] = {
        value: 50,
        confidence: 0,
        evidence: '측정 없음',
        measurement_count: 0,
        spread: 0,
      };
      continue;
    }

    // Weighted average (가중치 = confidence)
    const totalWeight = measurements.reduce((s, m) => s + m.confidence, 0);
    const weightedValue =
      totalWeight > 0
        ? measurements.reduce((s, m) => s + m.value * m.confidence, 0) / totalWeight
        : 50;

    // Bayesian combined confidence
    let combinedUncertainty = 1;
    for (const m of measurements) combinedUncertainty *= 1 - m.confidence;
    let combinedConf = 1 - combinedUncertainty;
    combinedConf = Math.min(0.95, combinedConf);

    // Conflict penalty
    let spread = 0;
    if (measurements.length >= 2) {
      const values = measurements.map((m) => m.value);
      spread = Math.max(...values) - Math.min(...values);
      if (spread > 30) {
        const penalty = Math.min(0.4, (spread - 30) * 0.01);
        combinedConf *= 1 - penalty;
      }
    }

    result[axis] = {
      value: Math.round(weightedValue),
      confidence: Math.round(combinedConf * 100) / 100,
      evidence: measurements.map((m) => `${m.scenario_id}: ${m.evidence}`).join(' | '),
      measurement_count: measurements.length,
      spread,
    };
  }

  // 3. Summary
  const measuredAxes = Object.values(result).filter((r) => r.confidence > 0).length;
  const highConfAxes = Object.values(result).filter((r) => r.confidence >= 0.65).length;
  const totalConf = Object.values(result).reduce((s, r) => s + r.confidence, 0);
  const avgConf = Math.round((totalConf / 15) * 100) / 100;
  const flaggedConflicts = AXES.filter((a) => result[a].spread > 30);

  return {
    persona_id: personaId,
    scenarios_completed: payloads.map((p) => p.scenario_id),
    axes: result,
    summary: {
      measured_axes: measuredAxes,
      high_confidence_axes: highConfAxes,
      average_confidence: avgConf,
      flagged_conflicts: flaggedConflicts,
    },
  };
}

// ─────────────────────────────────────────────────────
// Completeness — 사용자가 자기 추정이 얼마나 진행됐는지 보기 위한 단일 점수
// 0%: 측정 0
// 100%: 5개 시나리오 모두 완료 + 모든 축 고신뢰
// ─────────────────────────────────────────────────────
export interface CompletenessReport {
  percent: number;             // 0..100
  scenarios_completed: number; // 0..5
  scenarios_total: number;     // 5
  measured_axes: number;       // 0..15
  axes_total: number;          // 15
  high_confidence_axes: number;
  average_confidence: number;
  level: '없음' | '매우 낮음' | '낮음' | '보통' | '높음' | '거의 완료' | '완료';
  warning: string | null;
}

export function computeCompleteness(vector: IntegratedVector | null): CompletenessReport {
  if (!vector) {
    return {
      percent: 0,
      scenarios_completed: 0,
      scenarios_total: 5,
      measured_axes: 0,
      axes_total: 15,
      high_confidence_axes: 0,
      average_confidence: 0,
      level: '없음',
      warning: '아직 측정 시작 전. 시나리오 1개부터 시작하면 추정이 시작돼.',
    };
  }

  const scenarios = vector.scenarios_completed.length;
  const measured = vector.summary.measured_axes;
  const high = vector.summary.high_confidence_axes;
  const avgConf = vector.summary.average_confidence;

  // 가중 합산: 진행도 50%, coverage 25%, depth(평균 confidence) 25%
  const progress = scenarios / 5;
  const coverage = measured / 15;
  const depth = avgConf;
  const percent = Math.round((progress * 0.5 + coverage * 0.25 + depth * 0.25) * 100);

  let level: CompletenessReport['level'];
  if (scenarios === 0) level = '없음';
  else if (scenarios === 1) level = '매우 낮음';
  else if (scenarios === 2) level = '낮음';
  else if (scenarios === 3) level = '보통';
  else if (scenarios === 4) level = '높음';
  else if (scenarios === 5 && high < 12) level = '거의 완료';
  else level = '완료';

  let warning: string | null = null;
  if (scenarios < 5) {
    warning = `${5 - scenarios}개 시나리오가 더 남았어. 지금 시점의 추정은 일부 영역만 본 결과라서, 완료 후에 다시 보면 narrative가 깊어져.`;
  } else if (high < 12) {
    warning = '5/5 완료했지만 일부 축의 확실도가 낮음. 추정이 흔들릴 수 있는 영역이 있어.';
  }

  return {
    percent,
    scenarios_completed: scenarios,
    scenarios_total: 5,
    measured_axes: measured,
    axes_total: 15,
    high_confidence_axes: high,
    average_confidence: avgConf,
    level,
    warning,
  };
}

// ─────────────────────────────────────────────────────
// Decoder 입력 정제
// vector.axes 에서 evidence/measurement_count/spread 제거,
// 영문 axis ID → 한국어 label로 변환.
// 이게 narrative LLM에게 전달될 유일한 형태.
// 결과: { "안정·예측가능성": { 수준: 82, 확실도: "높음" }, ... }
// ─────────────────────────────────────────────────────
export interface PresentationAxis {
  수준: number;          // 0..100
  확실도: '없음' | '낮음' | '중간' | '높음';
}

export type PresentationVector = Record<string, PresentationAxis>;

function confidenceLabel(c: number): PresentationAxis['확실도'] {
  if (c <= 0) return '없음';
  if (c < 0.4) return '낮음';
  if (c < 0.7) return '중간';
  return '높음';
}

export function toPresentationVector(vector: IntegratedVector): PresentationVector {
  const result: PresentationVector = {};
  for (const axis of AXES) {
    const a = vector.axes[axis];
    const label = AXIS_LABELS_KO[axis];
    result[label] = {
      수준: a.value,
      확실도: confidenceLabel(a.confidence),
    };
  }
  return result;
}
