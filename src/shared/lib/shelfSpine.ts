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

const SPINE_MIN_HEIGHT = 112;
const SPINE_MAX_HEIGHT = 168;
const SPINE_BASE_WIDTH = 40;

export function getSpineColor(index: number): string {
  return SPINE_COLORS[index % SPINE_COLORS.length];
}

// recordCount가 클수록 책등이 두꺼워 보이도록 높이에 반영한다(목업의 임의 높이 대신 실제 데이터를 사용).
export function getSpineHeight(recordCount: number): number {
  return Math.min(SPINE_MAX_HEIGHT, Math.max(SPINE_MIN_HEIGHT, 96 + recordCount * 6));
}

export function getSpineWidth(index: number): number {
  return SPINE_BASE_WIDTH + (index % 3) * 6;
}
