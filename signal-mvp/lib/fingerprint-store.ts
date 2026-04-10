// 프로토타입용 인메모리 챌린지 저장소
// 프로덕션에서는 Redis 또는 DB로 교체

export interface FingerprintChallenge {
  userId: string;
  question: string;
  keyAxes: string[];
  expectedDirection: string;
  vectorSummary: string;
  createdAt: number;
}

const store = new Map<string, FingerprintChallenge>();

export function setChallenge(id: string, challenge: FingerprintChallenge) {
  store.set(id, challenge);
  // 5분 후 자동 삭제
  setTimeout(() => store.delete(id), 5 * 60 * 1000);
}

export function getChallenge(id: string): FingerprintChallenge | undefined {
  return store.get(id);
}

export function deleteChallenge(id: string) {
  store.delete(id);
}
