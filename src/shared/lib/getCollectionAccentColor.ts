import { hashPaletteIndex } from './hashPaletteIndex';

// 287-12: 파스텔톤 카드 표지 보조 색상 팔레트(디자인 결정으로 직접 지정한 5색 — pastelizeHex
// 자동 변환을 거치지 않는다. Library 책등 팔레트(shelfSpine.ts SPINE_COLORS)는 원래 채도 높은
// 색이라 pastelizeHex로 파스텔화하지만, 이 팔레트는 이미 파스텔톤이라 그 변환을 한 번 더 거치면
// 명도가 92% 상한 쪽으로 더 끌려가 배경(paper-white)과 구분이 안 될 만큼 옅어진다 — 검증해보니
// 예를 들어 #FFEBD3가 #f5ece0으로 바뀌어 사실상 흰색과 구별되지 않았다).
// Feed API에는 Collection 이미지 필드가 없어, collectionId를 해시해 이 팔레트 중 하나를
// 결정론적으로 골라 카드 배경(일러스트 대체)으로 쓴다. 저장하지 않고 매번 계산한다.
// 근거: Jira S15P11A705-170. 171(Collection 상세)에서도 재사용 가능하도록 공용 위치에 둔다.
const ACCENT_BASE_COLORS = ['#FFB6A6', '#FFEBD3', '#9BCEC1', '#67A2C5', '#99C2FF'];

// 287-10: 기본색 5개뿐이면 인접한 컬렉션(대개 collectionId가 연속인 생성 순서)끼리 같은 색이 나올
// 확률이 20%(1/5)로 육안에 띌 만큼 잦다. 새 hex를 임의로 고르는 대신, 이미 있는 5개를 25% 어둡게
// 변형(shadeHex)해 10개로 늘려 그 확률을 10%(1/10)로 낮췄다 — 팔레트는 여전히 위 5개 색상에서만
// 파생된다.
function shadeHex(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const toHex = (channel: number) =>
    Math.round(channel * factor)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const ACCENT_COLORS = [
  ...ACCENT_BASE_COLORS,
  ...ACCENT_BASE_COLORS.map((hex) => shadeHex(hex, 0.75)),
];

export function getCollectionAccentColor(collectionId: number): string {
  return ACCENT_COLORS[hashPaletteIndex(collectionId, ACCENT_COLORS.length)];
}
