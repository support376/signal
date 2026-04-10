// Signal — Input Metadata Capture + AI/진정성 탐지
// 사용자의 타이핑 행동을 캡처해서 분석에 활용 + AI 생성 응답 필터링

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

export interface InputMetadata {
  // 디바이스
  device_type: 'mobile' | 'tablet' | 'desktop';
  user_agent: string;
  screen_width: number;
  touch_device: boolean;

  // 타이밍 (ms)
  agent_msg_shown_at: number;          // agent 메시지가 화면에 표시된 시각
  first_keystroke_at: number | null;   // 첫 키 입력 시각
  submit_at: number;                   // 전송 시각
  first_keystroke_delay: number | null;// agent 표시 → 첫 키 (ms)
  total_typing_time: number | null;    // 첫 키 → 전송 (ms)
  total_response_time: number;         // agent 표시 → 전송 (ms)

  // 편집 행동
  backspace_count: number;
  paste_count: number;                 // Ctrl+V / 붙여넣기 횟수
  peak_length: number;                 // 입력 중 최대 길이 (삭제 전)
  final_length: number;                // 최종 전송 길이
  deleted_chars: number;               // peak - final (대략)
  pause_count: number;                 // 3초 이상 입력 멈춤 횟수
  keystroke_count: number;             // 총 키 입력 횟수

  // 속도 패턴
  chars_per_second: number;            // final_length / (total_typing_time / 1000)
  burst_pattern: boolean;              // 한 번에 쭉 쓰고 끝 vs 멈춤-쓰기 반복
}

export interface AuthenticityCheck {
  score: number;                       // 0-100 (높을수록 진정성 높음)
  flags: AuthenticityFlag[];
  verdict: 'pass' | 'warning' | 'suspect';
}

export interface AuthenticityFlag {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  detail: string;
}

// ──────────────────────────────────────────
// Client-side: 디바이스 감지
// ──────────────────────────────────────────

export function detectDevice(): Pick<InputMetadata, 'device_type' | 'user_agent' | 'screen_width' | 'touch_device'> {
  if (typeof window === 'undefined') {
    return { device_type: 'desktop', user_agent: '', screen_width: 0, touch_device: false };
  }
  const ua = navigator.userAgent;
  const w = window.innerWidth;
  const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  let device_type: InputMetadata['device_type'] = 'desktop';
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
    device_type = w > 768 ? 'tablet' : 'mobile';
  }

  return { device_type, user_agent: ua.slice(0, 200), screen_width: w, touch_device: touch };
}

// ──────────────────────────────────────────
// Server-side: AI / 진정성 탐지
// ──────────────────────────────────────────

export function checkAuthenticity(meta: InputMetadata): AuthenticityCheck {
  const flags: AuthenticityFlag[] = [];
  let score = 100;

  // ── 1. 붙여넣기 탐지 (가장 강한 AI 신호) ──
  if (meta.paste_count > 0) {
    score -= 30;
    flags.push({
      type: 'paste_detected',
      severity: 'critical',
      detail: `붙여넣기 ${meta.paste_count}회 감지. AI 생성 텍스트 복사 가능성.`,
    });
  }

  // ── 2. 비정상적으로 빠른 응답 (읽기 시간 없이 즉시 입력) ──
  if (meta.first_keystroke_delay !== null && meta.first_keystroke_delay < 500) {
    score -= 10;
    flags.push({
      type: 'instant_response',
      severity: 'warning',
      detail: `첫 키 입력까지 ${meta.first_keystroke_delay}ms. 질문을 읽지 않았을 가능성.`,
    });
  }

  // ── 3. 비정상적으로 빠른 타이핑 속도 (인간 한국어 평균 ~3-5 chars/sec) ──
  if (meta.chars_per_second > 10) {
    score -= 25;
    flags.push({
      type: 'superhuman_speed',
      severity: 'critical',
      detail: `타이핑 속도 ${meta.chars_per_second.toFixed(1)} 자/초. 인간 한국어 평균 3-5자/초. 복사 또는 자동 입력 가능성.`,
    });
  } else if (meta.chars_per_second > 7) {
    score -= 10;
    flags.push({
      type: 'fast_typing',
      severity: 'warning',
      detail: `타이핑 속도 ${meta.chars_per_second.toFixed(1)} 자/초. 빠른 편.`,
    });
  }

  // ── 4. 편집 없는 완벽한 입력 (긴 텍스트인데 백스페이스 0) ──
  if (meta.final_length > 50 && meta.backspace_count === 0 && meta.paste_count === 0) {
    score -= 15;
    flags.push({
      type: 'no_edits',
      severity: 'warning',
      detail: `${meta.final_length}자 입력 중 편집 0회. 미리 작성된 답변 또는 AI 생성 가능성.`,
    });
  }

  // ── 5. 너무 긴 응답 (일반 카톡 대화 패턴과 다름) ──
  if (meta.final_length > 300) {
    score -= 10;
    flags.push({
      type: 'overly_long',
      severity: 'warning',
      detail: `${meta.final_length}자. 카톡 대화 패턴 기준 비정상적으로 긺.`,
    });
  }

  // ── 6. 너무 짧은 응답 (의미 없는 답) ──
  if (meta.final_length < 5 && meta.final_length > 0) {
    score -= 5;
    flags.push({
      type: 'too_short',
      severity: 'info',
      detail: `${meta.final_length}자. 충분한 신호 추출 어려움.`,
    });
  }

  // ── 7. 전체 응답 시간이 비정상적으로 빠름 ──
  if (meta.total_response_time < 2000 && meta.final_length > 20) {
    score -= 20;
    flags.push({
      type: 'too_fast_total',
      severity: 'critical',
      detail: `전체 응답 ${(meta.total_response_time / 1000).toFixed(1)}초에 ${meta.final_length}자. 미리 준비된 답변.`,
    });
  }

  // ── 8. 멈춤 없는 연속 입력 (긴 텍스트인데 pause 0) ──
  if (meta.final_length > 80 && meta.pause_count === 0 && meta.total_typing_time !== null && meta.total_typing_time > 5000) {
    score -= 5;
    flags.push({
      type: 'no_pause',
      severity: 'info',
      detail: `${meta.final_length}자를 멈춤 없이 연속 입력. 사고 과정 부재 가능.`,
    });
  }

  // ── 9. burst pattern (한 번에 쭉) vs thoughtful (멈추고 생각하고 입력) ──
  // burst는 의식적 검열이 적을 수 있어서 나쁜 게 아니지만 메타 정보로 저장
  // (no score deduction — 이건 진정성이 아니라 사고 패턴 신호)

  // ── Verdict ──
  score = Math.max(0, Math.min(100, score));
  let verdict: AuthenticityCheck['verdict'];
  if (score >= 70) verdict = 'pass';
  else if (score >= 40) verdict = 'warning';
  else verdict = 'suspect';

  return { score, flags, verdict };
}

// ──────────────────────────────────────────
// 턴별 메타 요약 (5턴 전체의 패턴)
// ──────────────────────────────────────────

export interface TurnMetaSummary {
  total_turns: number;
  avg_response_time: number;
  avg_chars_per_second: number;
  total_paste_count: number;
  total_backspace_count: number;
  min_authenticity_score: number;
  avg_authenticity_score: number;
  overall_verdict: 'pass' | 'warning' | 'suspect';
  device_type: InputMetadata['device_type'];
  flags_summary: string[];
}

export function summarizeTurnMetas(metas: (InputMetadata & { authenticity: AuthenticityCheck })[]): TurnMetaSummary {
  if (metas.length === 0) {
    return {
      total_turns: 0,
      avg_response_time: 0,
      avg_chars_per_second: 0,
      total_paste_count: 0,
      total_backspace_count: 0,
      min_authenticity_score: 0,
      avg_authenticity_score: 0,
      overall_verdict: 'suspect',
      device_type: 'desktop',
      flags_summary: [],
    };
  }

  const avgTime = metas.reduce((s, m) => s + m.total_response_time, 0) / metas.length;
  const avgCps = metas.reduce((s, m) => s + m.chars_per_second, 0) / metas.length;
  const totalPaste = metas.reduce((s, m) => s + m.paste_count, 0);
  const totalBs = metas.reduce((s, m) => s + m.backspace_count, 0);
  const scores = metas.map((m) => m.authenticity.score);
  const minScore = Math.min(...scores);
  const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length;

  let verdict: TurnMetaSummary['overall_verdict'];
  if (minScore >= 60 && avgScore >= 70) verdict = 'pass';
  else if (minScore >= 30 && avgScore >= 50) verdict = 'warning';
  else verdict = 'suspect';

  const allFlags = metas.flatMap((m) => m.authenticity.flags.map((f) => f.type));
  const uniqueFlags = [...new Set(allFlags)];

  return {
    total_turns: metas.length,
    avg_response_time: Math.round(avgTime),
    avg_chars_per_second: Math.round(avgCps * 10) / 10,
    total_paste_count: totalPaste,
    total_backspace_count: totalBs,
    min_authenticity_score: minScore,
    avg_authenticity_score: Math.round(avgScore),
    overall_verdict: verdict,
    device_type: metas[0]?.device_type || 'desktop',
    flags_summary: uniqueFlags,
  };
}
