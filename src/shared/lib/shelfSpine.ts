// 목업(mockup/PinLog.responsive.dc.html)의 책등 팔레트·치수 계산. Shelf.tsx 컴포넌트들이 사용한다.
// react-refresh/only-export-components 때문에 컴포넌트 파일과 분리했다.
import { hashPaletteIndex } from './hashPaletteIndex';
import { pastelizeHex } from './pastelizeHex';

// 287-12: 원래는 채도 높은 무채색 계열 책등 색이었다 — 각 색을 pastelizeHex(채도↓, 명도↑)로 한 번
// 거쳐 파스텔톤으로 낮췄다. hue(색 구분)는 그대로 유지되므로 어떤 색이 어떤 책인지 상대적 구분은
// 남지만, 톤 전체가 옅고 부드러워진다.
// 295 반응형 재설계(요구사항 C): 위 원래 10색 중 6개(#556B50/#71806D/#77754F/#52634B/#314744/
// #7D8973)가 전부 올리브~카키 계열(H 56~104°)이었다 — pastelizeHex를 거쳐도 hue는 안 바뀌므로
// 책장 전체가 "연두 계열"로 편중돼 보였다(육안 구분 저하). 새 팔레트는 브랜드 4색의 hue만 쓰고
// (Pin Navy H212°, Log Mint H170°, Ink Gray/Paper White H14~18°— 임의의 브랜드 무관 색상 추가
// 없음) 명도·채도만 조절해 각 hue를 2단계(짙게/옅게)로 늘렸다 — 3개 hue 계열(청, 민트, 웜뉴트럴)×
// 2단계 = 6색. pastelizeHex는 그대로 거쳐 기존 책등의 부드러운 톤을 유지한다.
//   Navy 계열:  #2E6EB8(H212 S60 L45) / #82A3C9(H212 S40 L65)
//   Mint 계열:  #257E70(H170 S55 L32) / #6BC7B8(H170 S45 L60)
//   웜뉴트럴 계열(Ink Gray/Paper White 공유 hue): #846C62(H18 S15 L45) / #C6AB9F(H18 S25 L70)
const SPINE_COLORS = ['#2E6EB8', '#82A3C9', '#257E70', '#6BC7B8', '#846C62', '#C6AB9F'].map(
  pastelizeHex,
);

// 251: 250에서 "2행이 스크롤 없이 들어가도록" 112~168 → 72~104로 줄였더니 캐비닛이 목업 대비
// 밋밋하고 작아 보인다는 진단이 나와, 169 원본 값(112~168)으로 되돌렸다. 2행 고정 표시는 더 이상
// 요구사항이 아니다 — MyShelfColumn의 세로 스크롤 영역(SHELF_SCROLL_MIN_H_PX/MAX_H_PX,
// shelfCabinetLayout.ts)이 flex-1로 남는 공간을 채운다.
const SPINE_MIN_HEIGHT = 112;
// 287-4: 행(ShelfRow)마다 실제 책 높이와 무관하게 이 값을 고정 height로 준다(Shelf.tsx ShelfRow) —
// getSpineHeight가 이 값을 상한으로 clamp하므로, 행 높이를 이보다 작게 고정하면 큰 책이 행 경계를
// 넘어 위로 삐져나온다. export해서 Shelf.tsx가 그대로 재사용한다.
export const SPINE_MAX_HEIGHT = 168;
const SPINE_BASE_WIDTH = 40;

// 287-13: 한 행당 책 권수를 캐비닛 컬럼의 실제 폭에서 역산했다. Library 3열 캐비닛(ShelfColumnGrid)
// 중 가장 좁은 2·3열(팔로우한 책장, ShelfColumn의 border-l+pl-5만큼 1열보다 좁다) 기준, 데스크톱
// 레퍼런스 뷰포트(scale=1, ≥1280px, PAGE_CONTAINER_CLASS lg:px-8)에서:
//   페이지 컨텐츠 폭 1152(max-w-6xl) - 좌우 padding 64(px-8×2) = 1088
//   캐비닛 테두리(border-[8px]×2) 16 → 1072
//   캐비닛 본문 padding(px-5×2) 40 → 1032(ShelfColumnGrid 폭)
//   그리드 gap-x-5(20px)×2개 40 → 992, 3칸 등분 992/3 ≈ 330.7(칸 트랙 폭)
//   2·3열 자체 padding(border-l 1 + pl-5 20) 21 → 309.7
//   스크롤 박스 padding(SHELF_SCROLL_SIDE_PADDING_PX×2) 24 → 약 285.7px(실제 책이 놓일 수 있는 폭)
// 287-15: 기울어진 책의 겹침 방지 여백(getSpineNeighborClearancePx)은 회전이 항상 좌우 대칭으로
// 커지는 성질상 양쪽 이웃 모두에 반영해야 한다(한쪽만 주면 반대쪽 이웃과 겹친다 — 처음엔 이 점을
// 놓쳤다). 여백이 두 배로 드니 기준값도 낮춰야 한다: 289.7px OK(287-14 최초 검증)이던 5권 기준값을
// 4권으로 낮췄다(계산은 아래 getRowCapacity 주석 참고). getSpineWidth가 index%3 주기로 40/46/52px
// (평균 46px)를 반복하므로, 4권 기준으로도 목업 대비 촘촘한 밀도를 유지한다.
export const SHELF_ROW_SIZE = 4;

// 287-14: "행마다 최대 수용 권수 자체가 다르게" — 모든 행이 SHELF_ROW_SIZE로 고정되면 오히려 너무
// 규칙적으로 보인다. seedId(책장 하나를 식별하는 안정적인 값 — 내 책장은 첫 컬렉션 id 기반, 팔로우한
// 책장은 followId와 열 위치 기반 — MyShelfList.tsx/FollowedShelfCard.tsx 참고)와 rowIndex를 함께
// 해시해 ±1 편차를 고른다. 같은 책장은 새로고침해도 항상 같은 행 구성을 유지하고(seedId가
// 안정적이므로), 책장마다·열마다(seedId가 다르므로) 편차 패턴이 달라 여러 사용자의 책장이, 그리고
// 한 사용자 안에서도 1·2·3열이 획일적으로 보이지 않는다.
// 여유 검증(3~5권, 데스크톱 레퍼런스 기준 폭 예산 ≈285.7px, 40/46/52 3주기 반복):
//   287-15: 겹침 방지 여백을 양쪽 이웃 모두에 반영하므로(marginLeft+marginRight 동시 적용), 기울어진
//   책 1권당 최악 소비량은 2×5.81 ≈ 11.6px(height=168·width=40·tilt=4deg일 때 최댓값)이다.
//   5권(기준+1) 최악치: widthSum(최악 시작 offset) 236 + gap-px 4 + 5권 전부 기울었을 때 5×11.6=58.1
//   = 298.1px — 285.7px보다 12.4px 크다. 다만 "5권 모두 절댓값 최대(4deg) 기울기"이면서 동시에 폭
//   순환이 최악 offset으로 시작할 확률은 극히 낮다(기울기 분포상 개별 확률 40%, 5권 전부일 확률
//   0.4^5≈0.03%). 기댓값(권당 평균 클리어런스 2×3.63≈7.3px)으로는 230+4+5×0.4×7.3≈248.5px로 충분한
//   여유가 있다. 게다가 overflow-y-auto인 스크롤 박스는 overflow-x도 자동으로 'auto' 취급되므로
//   (CSS Overflow 스펙, SHELF_SCROLL_SIDE_PADDING_PX 주석 참고), 이 희귀한 경우에도 책이 겹치는 게
//   아니라 그 행만 가로 스크롤이 살짝 생기는 정도다. 4권(기준) 이하는 최악치도 여유 있게 들어온다
//   (4권 최악: 190+3+46.5=239.5px).
const ROW_CAPACITY_DELTAS = [-1, 0, 1];

// 287-17: 해시가 "충분히 흩어져 보인다"고 해서 연속된 두 행이 절대 같은 값을 안 뽑는다는 보장은
// 아니다 — 후보는 3개뿐이라 순수 해시만으로는 인접한 두 행이 우연히 같은 권수를 뽑을 확률이
// 이론상 1/3이나 된다(실측: seedId 900003 기준 rowIndex 0~3이 전부 3권으로 나온 사례를 실제로
// 확인했다 — SHELF_VISIBLE_ROW_COUNT=3이라 화면에 보이는 3행 전부가 우연히 같아 보일 확률이
// 약 11%(=(1/3)^2)로 낮지 않다). previousCapacity와 같은 후보가 나오면 다음 후보로 결정론적으로
// 한 칸 넘겨(순환) "바로 이전 행과는 반드시 다르다"를 보장한다 — 여전히 seedId·rowIndex만으로
// 정해지는 순수 함수라 새로고침해도 같은 결과를 낸다.
function getRowCapacity(seedId: number, rowIndex: number, previousCapacity: number | null): number {
  const candidateIndex = hashPaletteIndex(seedId + rowIndex * 97, ROW_CAPACITY_DELTAS.length);
  const candidate = SHELF_ROW_SIZE + ROW_CAPACITY_DELTAS[candidateIndex];
  if (candidate !== previousCapacity) {
    return candidate;
  }
  const nextIndex = (candidateIndex + 1) % ROW_CAPACITY_DELTAS.length;
  return SHELF_ROW_SIZE + ROW_CAPACITY_DELTAS[nextIndex];
}

// 287-5: 항상 노출할 행(선반) 수 — 컬렉션이 몇 개든 이 수만큼 ShelfTier(빈 행 포함)를 렌더링한다.
// 개수라서 scale 대상이 아니다.
export const SHELF_VISIBLE_ROW_COUNT = 3;

// 295 추가 수정(이슈 3): MyShelfColumn(내 책장)과 FollowedShelfCollections(팔로우한 책장)가 각자
// 따로 `Math.max(0, SHELF_VISIBLE_ROW_COUNT - N)`을 계산하고 있었다 — 계산 자체는 같은 공식이었지만
// "N에 무엇을 넣는지"(실제 콘텐츠 행 수)가 서로 다른 기준이었던 게 진짜 원인이었다: 내 책장은 "새
// 컬렉션 추가" 슬롯이 마지막 행에 안 들어가면 무조건 행을 하나 더 만들어(SHELF_VISIBLE_ROW_COUNT를
// 넘겨서라도) 추가 버튼을 항상 노출시켰고, 팔로우한 책장은 그런 예외가 없어 항상 정확히 3행으로
// 패딩됐다 — 그 결과 "내 책장 컬렉션이 정확히 3행을 꽉 채운 상태"에서만 내 책장이 4개 tier를
// 그리고 팔로우한 책장은 3개만 그려, 같은 높이로 stretch된 두 ShelfColumn 안에서 콘텐츠가 차지하는
// 비율이 달라져 최하단 선반~캐비닛 바닥 여백이 달라 보였다. 이 함수를 두 컴포넌트가 동일하게
// 호출하게 만들어 "행 수 계산 자체는 하나의 함수"라는 사실을 코드로 고정한다 — 호출부가 넘기는
// realRowCount(추가 슬롯이 필요로 하는 행까지 포함한 실제 콘텐츠 행 수)만 서로 다르다.
export function getEmptyTierPadding(realRowCount: number): number {
  return Math.max(0, SHELF_VISIBLE_ROW_COUNT - realRowCount);
}

// 287-2: 스크롤 박스(overflow-y-auto) 내부에 주는 상단 여유 — margin이 아니라 반드시 padding이어야
// 한다. overflow는 자기 자신의 padding-box 경계로 clip하므로, 박스 "바깥"의 gap을 늘려도 안쪽으로
// transform해 올라오는 요소는 그대로 잘린다. 호버 리프트 10px(Shelf.tsx ShelfBookSpine)보다 커야 한다.
export const SHELF_SCROLL_TOP_PADDING_PX = 12;

// 287-3: overflow-y와 overflow-x 중 하나만 'visible'이 아니면 브라우저가 나머지 축도 'auto'로
// 취급한다(CSS Overflow 스펙) — overflow-y-auto만 준 스크롤 박스가 가로 방향도 clip 대상이 된다는
// 뜻이다. 회전한 책등이 이 박스의 좌우 padding-box 경계를 넘으면 그대로 잘린다.
// 287-14: 최대 기울기가 5deg→4deg로 줄고(TILT_OPTIONS_DEG), 책마다 개별 폭(getSpineWidth)이 달라
// "최대 protrusion"도 책마다 다르다 — 가장 보수적인 경우(높이 최대 168, 폭 최소 40)로 계산하면
// (168/2)*sin(4°) - (40/2)*(1-cos(4°)) ≈ 5.86 - 0.05 ≈ 5.8px. 기존 12px 여유가 이미 넉넉히 크다.
export const SHELF_SCROLL_SIDE_PADDING_PX = 12;

// 287-10: 이전엔 index(선반 위 위치)로 색을 골라 두 가지 문제가 있었다 — (1) 같은 컬렉션이라도
// 목록 순서가 바뀌면(새 컬렉션 추가 등) 위치가 밀려 색이 바뀔 수 있었다(리렌더링해도 색이 유지돼야
// 한다는 원칙에 어긋난다). (2) index % 10은 10권마다 정확히 같은 색 순서가 되풀이돼 육안으로 규칙이
// 보였다. collectionId(컬렉션 고유 식별자)를 hashPaletteIndex로 넓게 흩뿌려 고르도록 바꿔 두 문제를
// 모두 해결한다 — 위치와 무관하게 항상 같은 컬렉션이 같은 색을 유지하고, id가 연속이어도 순서상
// 인접한 책들의 색이 규칙적으로 반복되지 않는다.
export function getSpineColor(collectionId: number): string {
  return SPINE_COLORS[hashPaletteIndex(collectionId, SPINE_COLORS.length)];
}

// recordCount가 클수록 책등이 두꺼워 보이도록 높이에 반영한다(목업의 임의 높이 대신 실제 데이터를 사용).
// 251: 범위를 112~168로 되돌리면서 기울기도 169 원본 공식(96 + recordCount*6)으로 함께 되돌렸다 —
// 60+recordCount*4를 그대로 새 범위에 늘려 쓰면 바닥(72→112)을 벗어나는 데 recordCount 10이 필요해
// 여전히 저record 컬렉션이 바닥에 몰리는 문제가 남는다.
// 287-14: recordCount가 같은 컬렉션이 여럿이면(특히 0~2권짜리는 전부 바닥값 112로 뭉친다) 높이가
// 완전히 똑같아 보였다 — collectionId 기반 ±3px 지터(hashPaletteIndex)를 더해 같은 recordCount라도
// 미세하게 다른 높이를 갖게 한다. 지터는 recordCount 기반 값을 다시 min/max로 clamp해 범위(112~168)를
// 벗어나지 않는다.
const HEIGHT_JITTER_OPTIONS_PX = [-3, -2, -1, 0, 1, 2, 3];

export function getSpineHeight(recordCount: number, collectionId: number): number {
  const base = 96 + recordCount * 6;
  const jitter =
    HEIGHT_JITTER_OPTIONS_PX[hashPaletteIndex(collectionId, HEIGHT_JITTER_OPTIONS_PX.length)];
  return Math.min(SPINE_MAX_HEIGHT, Math.max(SPINE_MIN_HEIGHT, base + jitter));
}

export function getSpineWidth(index: number): number {
  return SPINE_BASE_WIDTH + (index % 3) * 6;
}

// 287-14: "각 행 마지막 자리만 -5deg, 나머지 전부 0deg"는 규칙 자체가 고정이라 오히려 규칙적으로
// 보였다(게다가 행마다 권수가 달라지는 287-13 이후로는 "마지막 자리"라는 개념 자체가 index만으로
// 판단 불가능해졌다 — 행 경계가 더 이상 고정 주기가 아니기 때문). collectionId 해시로 각 책마다
// 독립적으로 기울기를 고르되, 목록의 60%(가중치 6/10)는 0deg(거의 안 기움)로 남기고, 나머지
// 40%를 ±2deg(살짝)·±4deg(눈에 띄게)로 나눠 "대부분은 반듯하고 일부만 기운" 비율감을 유지한다.
const TILT_OPTIONS_DEG = [0, 0, 0, 0, 0, 0, -2, 2, -4, 4];

export function getSpineTilt(collectionId: number): number {
  return TILT_OPTIONS_DEG[hashPaletteIndex(collectionId, TILT_OPTIONS_DEG.length)];
}

// 287-7/287-14: 회전축이 기본값(중앙, 50% 50%)이라 rotate(tiltDeg)를 적용하면 스파인의 회전된
// 바운딩 박스가 원래 경계보다 커진다 — 한 축(예: 세로)의 증가분은 (그 축 길이/2)*sin(|tilt|) -
// (다른 축 길이/2)*(1-cos(|tilt|))다(회전 방향과 무관하게 항상 양수). 두 용도(바닥 침범 보정,
// 옆 책과의 겹침 방지)가 축만 바꾼 같은 공식이라 하나의 함수로 공유한다.
function rotatedExtraExtent(alongAxisPx: number, acrossAxisPx: number, tiltDeg: number): number {
  if (tiltDeg === 0) {
    return 0;
  }
  const rad = (Math.abs(tiltDeg) * Math.PI) / 180;
  return (alongAxisPx / 2) * Math.sin(rad) - (acrossAxisPx / 2) * (1 - Math.cos(rad));
}

// 287-7: 회전 후 스파인 하단이 원래 바닥선(선반 보드 상단)보다 아래로 내려가는 만큼 — 폭이 그
// 침범 방향(세로축)을 결정한다. ShelfBookSpine이 이 값만큼 translateY(-lift)로 미리 들어올려 회전
// 후에도 하단이 정확히 선반 보드 상단에 맞닿게 보정한다.
export function getSpineTiltLiftPx(width: number, height: number, tiltDeg: number): number {
  return rotatedExtraExtent(width, height, tiltDeg);
}

// 287-14: 기울기가 collectionId마다 달라지면서(TILT_OPTIONS_DEG) 이제 어느 책이든 기울 수 있고,
// 기운 방향(양수=시계방향→오른쪽 이웃 침범, 음수=반시계방향→왼쪽 이웃 침범)과 각도도 책마다 다르다
// — 고정 TILT_NEIGHBOR_CLEARANCE_PX 하나 대신, 각 책의 실제 높이·기울기로 필요한 여백만 정확히
// 계산한다(높이가 침범 방향인 가로축을 결정하므로 위 lift 공식과 축만 바꿔 재사용).
export function getSpineNeighborClearancePx(
  width: number,
  height: number,
  tiltDeg: number,
): number {
  return rotatedExtraExtent(height, width, tiltDeg);
}

export interface ShelfRowChunk<T> {
  items: T[];
  startIndex: number;
  capacity: number;
}

// 250(→287-13/287-14에서 일반화): 스파인 배열을 행 단위로 끊어 "행 + 선반" 타이어(ShelfTier)로
// 렌더링할 수 있게 한다. 이전엔 SHELF_ROW_SIZE 고정 폭으로만 잘랐지만, 이제 행마다 권수가 달라
// (getRowCapacity) 각 행이 실제로 몇 번째 아이템부터 시작하는지(startIndex)를 함께 반환해야 한다
// — 호출부(MyShelfList/FollowedShelfCard)가 "rowIndex * 고정값 + indexInRow"로 전역 index를
// 재계산할 수 없기 때문이다. seedId는 이 책장 하나를 식별하는 안정적인 값(getRowCapacity 참고).
export function chunkIntoShelfRows<T>(items: T[], seedId: number): ShelfRowChunk<T>[] {
  const rows: ShelfRowChunk<T>[] = [];
  let index = 0;
  let rowIndex = 0;
  let previousCapacity: number | null = null;
  while (index < items.length) {
    const capacity = getRowCapacity(seedId, rowIndex, previousCapacity);
    rows.push({ items: items.slice(index, index + capacity), startIndex: index, capacity });
    index += capacity;
    rowIndex += 1;
    previousCapacity = capacity;
  }
  return rows;
}
