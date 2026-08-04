import { hashPaletteIndex } from './hashPaletteIndex';

// 홈 지도 마커 색상 팔레트(브랜드 토큰 5색, tailwind.config.js 기준: log-mint/pin-navy/shelf-wood/
// shelf-wood-dark/ink-gray). getCollectionAccentColor.ts(Feed 카드 표지)와 달리 파스텔 변형을 거치지
// 않는다 — 지도 배경(line-subtle)과 채도 차이가 커야 마커가 또렷이 구분되기 때문이다.
const MARKER_BASE_COLORS = ['#3BB7A2', '#042142', '#e0b77d', '#b9854f', '#6D6663'];

// collectionId가 null(어떤 Collection에도 속하지 않은 Record)인 마커 전용 고정색. 위 팔레트 해시에
// 섞으면 우연히 특정 Collection과 같은 색을 배정받아 "미분류"가 시각적으로 구분되지 않을 수 있어
// 별도로 분리한다. ink-gray-light(#A39C99, tailwind.config.js) — 팔레트 5색과 채도가 달라 중립톤으로
// 읽힌다.
const UNASSIGNED_MARKER_COLOR = '#A39C99';

/**
 * collectionId를 해시해 마커 색을 고정 배정한다 — 같은 Collection에 속한 기록끼리 같은 색을 쓴다
 * (hashPaletteIndex — getCollectionAccentColor.ts와 같은 해시 함수를 공유해 같은 id는 항상 같은
 * 색을 낸다). collectionId가 null이면 팔레트 해시 대신 고정 UNASSIGNED_MARKER_COLOR를 쓴다.
 * 근거: Jira S15P11A705-307, docs/api-contract.md "[확정] 지도 마커 조회 응답에 collectionId 추가".
 */
export function getRecordMarkerColor(collectionId: number | null): string {
  if (collectionId === null) {
    return UNASSIGNED_MARKER_COLOR;
  }
  return MARKER_BASE_COLORS[hashPaletteIndex(collectionId, MARKER_BASE_COLORS.length)];
}
