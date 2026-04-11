// Signal — 로딩 메시지 시퀀스
// 각 작업별로 사용자에게 보일 메시지 (시간 진행에 따라 변화)
// 실제 LLM 진행 상태가 아니라 UX용 phasing — 사용자가 *멈춘 게 아니다* 를 느끼게.

export interface LoadingPhase {
  /** 이 phase가 시작되는 누적 초 */
  startAt: number;
  message: string;
}

export const FINALIZE_PHASES: LoadingPhase[] = [
  { startAt: 0, message: '5턴 대화 정리 중...' },
  { startAt: 3, message: '성격 패턴 추출 중...' },
  { startAt: 7, message: '15축 신호 측정 중...' },
  { startAt: 12, message: '벡터 통합 + 신뢰도 계산 중...' },
  { startAt: 18, message: '거의 다 됐어요...' },
  { startAt: 25, message: '조금만 더 기다려줘...' },
];

export const SELF_REPORT_PHASES: LoadingPhase[] = [
  { startAt: 0, message: '너의 벡터 읽는 중...' },
  { startAt: 3, message: '핵심 패턴 찾는 중...' },
  { startAt: 7, message: '일상의 모습 그려보는 중...' },
  { startAt: 13, message: '그림자와 강점 정리 중...' },
  { startAt: 19, message: '한 문장으로 너를 묘사 중...' },
  { startAt: 25, message: '거의 다 됐어요...' },
  { startAt: 35, message: '조금만 더...' },
];

export const CHEMISTRY_PHASES: LoadingPhase[] = [
  { startAt: 0, message: '두 사람의 벡터 비교 중...' },
  { startAt: 3, message: '15축 유사도 계산 중...' },
  { startAt: 6, message: '애착 매트릭스 + 충돌 검출 중...' },
  { startAt: 9, message: '관계의 핵심 역학 찾는 중...' },
  { startAt: 14, message: '만나는 자리 / 부딪히는 자리 그리는 중...' },
  { startAt: 22, message: '그림자 + 예언 작성 중...' },
  { startAt: 30, message: '거의 다 됐어요...' },
  { startAt: 40, message: '조금만 더...' },
];

export const LOGIN_PHASES: LoadingPhase[] = [
  { startAt: 0, message: '시작 중...' },
  { startAt: 1.5, message: '서버 깨우는 중...' },
  { startAt: 4, message: '데이터베이스 연결 중...' },
  { startAt: 7, message: '거의 다 됐어요...' },
];

/** 경과 시간 (초) 에 해당하는 메시지 */
export function getMessageForElapsed(phases: LoadingPhase[], elapsedSec: number): string {
  let current = phases[0]?.message || '...';
  for (const p of phases) {
    if (elapsedSec >= p.startAt) current = p.message;
    else break;
  }
  return current;
}

/** 초 → "0:05" 포맷 */
export function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
