// Signal — Narrative에서 TAGS 라인 파싱
// 첫 줄 "TAGS: #키워드1 #키워드2 ..." → tags 배열 + 나머지 narrative

export function parseTags(narrative: string): { tags: string[]; body: string } {
  const lines = narrative.split('\n');
  const firstLine = lines[0]?.trim() || '';

  if (firstLine.startsWith('TAGS:')) {
    const tagStr = firstLine.replace(/^TAGS:\s*/, '');
    const tags = tagStr
      .split(/\s+/)
      .filter((t) => t.startsWith('#') && t.length > 1)
      .map((t) => t);
    const body = lines.slice(1).join('\n').trim();
    return { tags, body };
  }

  // TAGS 라인 없으면 전체가 body
  return { tags: [], body: narrative.trim() };
}
