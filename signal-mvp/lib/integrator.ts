// Signal Layer 0.5 — Integrator
// 5개 시나리오 payload → 단일 15축 통합 벡터
// 순수 수학. LLM 호출 0.

import { AXES, type Axis, type ScenarioPayload, type IntegratedVector, type AxisMeasurement } from './types';

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
