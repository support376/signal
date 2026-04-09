// Signal — Slug 유틸리티
// 영구 개인 URL 식별자 (signal.app/u/[slug])

const SLUG_PATTERN = /^[a-z0-9_-]{3,20}$/;

/** Slug 유효성 검사 */
export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

/** 임의의 문자열을 slug 형태로 정규화 */
export function normalizeToSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')   // 영문/숫자/_- 외 → _
    .replace(/_{2,}/g, '_')          // 연속된 _ 압축
    .replace(/^[_-]+|[_-]+$/g, '')   // 앞뒤 _- 제거
    .slice(0, 20);                    // 최대 20자
}

/** Slug 변경 시 사용자에게 안내할 검증 메시지 */
export function slugError(slug: string): string | null {
  if (!slug || slug.length === 0) return '비어 있음';
  if (slug.length < 3) return '3자 이상';
  if (slug.length > 20) return '20자 이내';
  if (!/^[a-z0-9_-]+$/.test(slug))
    return '영문 소문자, 숫자, _, - 만 가능';
  return null;
}
