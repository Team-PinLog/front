// 서버는 날짜 필드를 ISO 8601 datetime 문자열로 내려준다(예: "2026-07-23T10:00:00Z", 08_API_명세.md 11.3 등).
// 화면 표시는 YYYY-MM-DD로 통일한다 — 로컬 타임존 변환 없이 문자열 앞 10자만 잘라 쓴다.
export function formatDate(isoDateTime: string): string {
  return isoDateTime.slice(0, 10);
}
