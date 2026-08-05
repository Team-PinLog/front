/**
 * 317: 표지 생성 요청에 실을 keywords를 고른다.
 *
 * **왜 조달이 필요한가**: 표지 생성은 `{ title, keywords }`를 받는데, Collection 생성 요청
 * (`{ title, recordIds }`)에는 키워드가 없고 생성 응답에도 없다. Collection 키워드는 담긴
 * Record들의 AI Keyword에서 나오므로, 생성 직후 상세를 한 번 조회해 거기서 모은다.
 *
 * 순서는 서버 응답 순서를 그대로 따른다(재정렬 금지 — conventions.md 6장). 앞쪽 Record의 키워드가
 * 먼저 들어가고, 중복은 처음 나온 자리를 유지한다.
 */

/**
 * 상한을 두는 이유: 장소가 많은 Collection은 키워드가 수십 개가 되는데, 그대로 보내면 표지 한 장에
 * 담을 수 없는 장면을 요구하게 되어 그림이 산만해진다. 5개는 front#99 예제(`["호수", "새벽 안개",
 * "사색"]` 3개)와 같은 자릿수다.
 */
export const COVER_KEYWORD_LIMIT = 5;

export function collectCoverKeywords(records: { keywords: string[] }[]): string[] {
  const unique: string[] = [];

  for (const record of records) {
    for (const keyword of record.keywords) {
      const trimmed = keyword.trim();
      if (!trimmed || unique.includes(trimmed)) {
        continue;
      }
      unique.push(trimmed);
      if (unique.length >= COVER_KEYWORD_LIMIT) {
        return unique;
      }
    }
  }

  // 빈 배열도 정상이다 — AI Keyword가 아직 생성되지 않은 Record만 담겼을 수 있다
  // (architecture.md 5장: keywords: []는 오류가 아니다). 이미지 서비스는 title만으로도 그린다.
  return unique;
}
