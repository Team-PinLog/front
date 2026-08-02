// 목업(mockup/PinLog.responsive.dc.html)의 책등 팔레트·치수 계산. Shelf.tsx 컴포넌트들이 사용한다.
// react-refresh/only-export-components 때문에 컴포넌트 파일과 분리했다.

const SPINE_COLORS = [
  '#738F91',
  '#556B50',
  '#A85F3A',
  '#C79742',
  '#71806D',
  '#77754F',
  '#52634B',
  '#314744',
  '#7D8973',
  '#2F465E',
];

// 251: 250에서 "2행이 스크롤 없이 들어가도록" 112~168 → 72~104로 줄였더니 캐비닛이 목업 대비
// 밋밋하고 작아 보인다는 진단이 나와, 169 원본 값(112~168)으로 되돌렸다. 2행 고정 표시는 더 이상
// 요구사항이 아니다 — MyShelfColumn의 세로 스크롤 영역(MY_SHELF_VISIBLE_HEIGHT_PX)이 이 최대 높이를
// 기준으로 다시 계산된다.
const SPINE_MIN_HEIGHT = 112;
const SPINE_MAX_HEIGHT = 168;
const SPINE_BASE_WIDTH = 40;

// 250: 한 행에 몇 권씩 채울지. getSpineWidth가 index % 3 주기로 40/46/52px를 반복하므로, 3의 배수로
// 자르면 시작 위치와 무관하게 한 행의 스파인 폭 합이 항상 138px(40+46+52)로 일정해 레이아웃이 예측 가능하다.
export const SHELF_ROW_SIZE = 3;

export function getSpineColor(index: number): string {
  return SPINE_COLORS[index % SPINE_COLORS.length];
}

// recordCount가 클수록 책등이 두꺼워 보이도록 높이에 반영한다(목업의 임의 높이 대신 실제 데이터를 사용).
// 251: 범위를 112~168로 되돌리면서 기울기도 169 원본 공식(96 + recordCount*6)으로 함께 되돌렸다 —
// 60+recordCount*4를 그대로 새 범위에 늘려 쓰면 바닥(72→112)을 벗어나는 데 recordCount 10이 필요해
// 여전히 저record 컬렉션이 바닥에 몰리는 문제가 남는다.
export function getSpineHeight(recordCount: number): number {
  return Math.min(SPINE_MAX_HEIGHT, Math.max(SPINE_MIN_HEIGHT, 96 + recordCount * 6));
}

export function getSpineWidth(index: number): number {
  return SPINE_BASE_WIDTH + (index % 3) * 6;
}

// 250: 스파인 배열을 SHELF_ROW_SIZE개씩 끊어 "행 + 선반" 타이어(ShelfTier) 단위로 렌더링할 수 있게 한다.
export function chunkIntoShelfRows<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += SHELF_ROW_SIZE) {
    rows.push(items.slice(i, i + SHELF_ROW_SIZE));
  }
  return rows;
}
