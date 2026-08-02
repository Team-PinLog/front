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

// 250: 캐비닛 하단에 선반 하나만 두던 구조에서, 행(row)마다 선반을 반복하는 구조로 바뀌면서
// 한 페이지 안에 2행이 스크롤 없이 들어가도록 책 높이를 줄였다(기존 112~168 → 72~104).
const SPINE_MIN_HEIGHT = 72;
const SPINE_MAX_HEIGHT = 104;
const SPINE_BASE_WIDTH = 40;

// 250: 한 행에 몇 권씩 채울지. getSpineWidth가 index % 3 주기로 40/46/52px를 반복하므로, 3의 배수로
// 자르면 시작 위치와 무관하게 한 행의 스파인 폭 합이 항상 138px(40+46+52)로 일정해 레이아웃이 예측 가능하다.
export const SHELF_ROW_SIZE = 3;

export function getSpineColor(index: number): string {
  return SPINE_COLORS[index % SPINE_COLORS.length];
}

// recordCount가 클수록 책등이 두꺼워 보이도록 높이에 반영한다(목업의 임의 높이 대신 실제 데이터를 사용).
export function getSpineHeight(recordCount: number): number {
  return Math.min(SPINE_MAX_HEIGHT, Math.max(SPINE_MIN_HEIGHT, 60 + recordCount * 4));
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
