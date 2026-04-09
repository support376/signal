// Signal — Output Sanitizer
// Decoder가 생성한 narrative에서 hard rule 위반 패턴 감지.
// 현재 모드: 관찰 (위반 발견 시 console.warn). 자동 재생성/redact 미적용.

import { AXES, SCENARIOS } from './types';

const AXIS_PATTERNS = AXES.map((a) => new RegExp(`\\b${a}\\b`, 'gi'));
const SCENARIO_PATTERNS = SCENARIOS.map((s) => new RegExp(`\\b${s}\\b`, 'gi'));

// 축 이름 옆에 숫자가 붙는 패턴 ("security 82", "neuroticism 12" 등)
const AXIS_NUMBER_PATTERN = /\b(value_\w+|big5_\w+|attach_\w+|moral_\w+|conflict_style|repair_capacity|security|benevolence|self_direction|achievement|universalism|tradition|neuroticism|agreeableness|conscientiousness|anxiety|avoidance|loyalty|care)\s*[:=]?\s*\d+/gi;

// 영문 심리학 용어 자체
const PSY_TERMS = [
  /\battachment\s+style\b/gi,
  /\bbig\s*five\b/gi,
  /\bschwartz\b/gi,
  /\bgottman\b/gi,
  /\bbowlby\b/gi,
];

export interface SanitizerReport {
  clean: boolean;
  violations: {
    type: 'axis_name' | 'scenario_id' | 'axis_number' | 'psy_term';
    matches: string[];
  }[];
  total_violations: number;
}

export function sanitizeNarrative(text: string): SanitizerReport {
  const violations: SanitizerReport['violations'] = [];

  // 1. 축 이름
  const axisMatches: string[] = [];
  for (const p of AXIS_PATTERNS) {
    const m = text.match(p);
    if (m) axisMatches.push(...m);
  }
  if (axisMatches.length > 0) {
    violations.push({ type: 'axis_name', matches: [...new Set(axisMatches)] });
  }

  // 2. 시나리오 ID
  const scenarioMatches: string[] = [];
  for (const p of SCENARIO_PATTERNS) {
    const m = text.match(p);
    if (m) scenarioMatches.push(...m);
  }
  if (scenarioMatches.length > 0) {
    violations.push({ type: 'scenario_id', matches: [...new Set(scenarioMatches)] });
  }

  // 3. 축 이름 + 숫자
  const numberMatches = text.match(AXIS_NUMBER_PATTERN);
  if (numberMatches) {
    violations.push({ type: 'axis_number', matches: [...new Set(numberMatches)] });
  }

  // 4. 외부 심리학 용어
  const psyMatches: string[] = [];
  for (const p of PSY_TERMS) {
    const m = text.match(p);
    if (m) psyMatches.push(...m);
  }
  if (psyMatches.length > 0) {
    violations.push({ type: 'psy_term', matches: [...new Set(psyMatches)] });
  }

  const total = violations.reduce((s, v) => s + v.matches.length, 0);
  return {
    clean: total === 0,
    violations,
    total_violations: total,
  };
}

/**
 * 위반이 있으면 console.warn으로 로그.
 * 옵션 1 (관찰 모드). 추후 옵션 2 (자동 재생성) 또는 3 (redact) 로 업그레이드 가능.
 */
export function logSanitizerReport(label: string, report: SanitizerReport) {
  if (report.clean) return;
  console.warn(
    `[sanitizer] ${label} — ${report.total_violations} violations`,
    report.violations
  );
}
