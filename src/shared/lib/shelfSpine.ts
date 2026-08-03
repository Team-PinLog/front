// 목업(mockup/PinLog.responsive.dc.html)의 책등 팔레트·치수 계산. Shelf.tsx 컴포넌트들이 사용한다.
// react-refresh/only-export-components 때문에 컴포넌트 파일과 분리했다.
import { SHELF_CABINET_TOTAL_HEIGHT_PX } from './shelfCabinetLayout';

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
// 287-4: 행(ShelfRow)마다 실제 책 높이와 무관하게 이 값을 고정 height로 준다(Shelf.tsx ShelfRow) —
// getSpineHeight가 이 값을 상한으로 clamp하므로, 행 높이를 이보다 작게 고정하면 큰 책이 행 경계를
// 넘어 위로 삐져나온다. export해서 Shelf.tsx가 그대로 재사용한다.
export const SPINE_MAX_HEIGHT = 168;
const SPINE_BASE_WIDTH = 40;

// 250: 한 행에 몇 권씩 채울지. getSpineWidth가 index % 3 주기로 40/46/52px를 반복하므로, 3의 배수로
// 자르면 시작 위치와 무관하게 한 행의 스파인 폭 합이 항상 138px(40+46+52)로 일정해 레이아웃이 예측 가능하다.
export const SHELF_ROW_SIZE = 3;

// 287-5: Feed·Library가 캐비닛 높이를 각자 따로 추정해오면서(직전엔 페이지 전체를 1440×900에 맞춰
// 독립적으로 역산 → 12px 오차) 매번 어긋났다. 이제는 "따로 계산해서 비슷하게 맞추기"를 그만두고,
// Feed가 실제로 렌더링하는 SHELF_CABINET_TOTAL_HEIGHT_PX(shelfCabinetLayout.ts, Feed 코드에서 직접
// 읽은 값) 하나만 목표로 두고, Library 쪽 나머지 항목(캐비닛 프레임·컬럼 헤더·행 구성)을 여기서
// 거꾸로 뺀다 — Feed 값이 바뀌면 이 계산도 자동으로 같이 바뀐다.
//
// SHELF_CABINET_TOTAL_HEIGHT_PX(Feed, 카드형 5×2)와 Library(책등형 3행)는 내부 구성 요소가 서로
// 대응되지 않는다(카드+배지 vs 책등+선반) — 그래서 "요소별로 맞추기"가 아니라 "바깥 테두리 전체
// 합계"만 공유하고, 그 안의 배분은 Library가 결정한다.
//
// 위에서 아래로(Feed엔 없고 Library에만 있는 구조 차이는 그 이유를 주석에 남긴다):
//   캐비닛 테두리(Shelf.tsx ShelfCabinet border-[8px] 상하)                16
//   캐비닛 헤더바(h-8 32 + border-b 1, 기존 h-9+border-b-4=40에서 축소)     33
//     ※ Feed엔 이 헤더바가 없다 — Library는 3열(내 책장/팔로우한 책장)을
//       한 캐비닛에 나란히 두는 구조라 캐비닛 자체에 제목("나의 책장")이
//       필요하다(LibraryPage.tsx는 별도 h1도 갖고 있어 이중 표기이긴 하지만
//       캐비닛만 따로 봐도 제목이 있어야 자연스럽다). 이 차이만큼을 Library
//       쪽 다른 항목(본문 padding·행 gap)에서 뺐다.
//   캐비닛 본문 상하 padding(py-1.5, 기존 py-2에서 축소)                   12
//   컬럼 헤더(ShelfLabel/별칭 행, 실측 아닌 추정치 — 유일한 남은 추정값)   31
//   컬럼 헤더→스크롤박스 gap(ShelfColumn gap-3, 고정)                      12
//   ---------------------------------------------------------------------------
//   소계                                                                 104
//
// 나머지(SHELF_CABINET_TOTAL_HEIGHT_PX - 104)를 스크롤 박스 높이로 배정한다:
//   스크롤 박스 = 3행 × (SPINE_MAX_HEIGHT 168 + 행-선반 gap 0 + 선반 보드 10)
//                + 타이어 사이 gap(gap-1.5=6) × 2
//                + 상단 여유(SHELF_SCROLL_TOP_PADDING_PX) 12
//              = 3×178 + 12 + 12 = 558
//
// 검산: 16 + 33 + 12 + 31 + 12 + 558 = 662 = SHELF_CABINET_TOTAL_HEIGHT_PX. 정확히 일치한다.
// 컬럼 헤더(31)만 실측이 아닌 추정치다 — 실제로 다르면 이 값만 바로잡으면 등식이 다시 맞는다.
// 아래 5개 상수는 Library 쪽 캐비닛 프레임·컬럼 헤더 실제 값이다(위 주석의 "위에서 아래로" 목록과
// 순서·값이 대응된다) — Shelf.tsx ShelfCabinet의 className(h-8/border-b/py-1.5), ShelfColumn의
// className(gap-3)과 반드시 일치해야 위 등식이 성립한다. 타이어 사이 gap(gap-1.5=6px, 스크롤 박스
// 높이 계산엔 포함되지만 여기 별도 상수로 두진 않았다 — MyShelfList.tsx/FollowedShelfCard.tsx의
// className과 Shelf.tsx ShelfTier의 className(gap-0)이 그 값을 직접 갖고 있다)로 검산된 값이다.
const CABINET_BORDER_PX = 16;
const CABINET_HEADER_BAR_PX = 33;
const CABINET_BODY_PADDING_PX = 12;
const COLUMN_HEADER_PX = 31;
const COLUMN_HEADER_GAP_PX = 12;

// 287-5: 항상 노출할 행(선반) 수 — 컬렉션이 몇 개든 이 수만큼 ShelfTier(빈 행 포함)를 렌더링한다.
export const SHELF_VISIBLE_ROW_COUNT = 3;

export const SHELF_VISIBLE_HEIGHT_PX =
  SHELF_CABINET_TOTAL_HEIGHT_PX -
  CABINET_BORDER_PX -
  CABINET_HEADER_BAR_PX -
  CABINET_BODY_PADDING_PX -
  COLUMN_HEADER_PX -
  COLUMN_HEADER_GAP_PX;

// 287-2: 스크롤 박스(overflow-y-auto) 내부에 주는 상단 여유 — margin이 아니라 반드시 padding이어야
// 한다. overflow는 자기 자신의 padding-box 경계로 clip하므로, 박스 "바깥"의 gap을 늘려도 안쪽으로
// transform해 올라오는 요소는 그대로 잘린다. 호버 리프트 10px(Shelf.tsx ShelfBookSpine)보다 커야 한다.
export const SHELF_SCROLL_TOP_PADDING_PX = 12;

// 287-3: overflow-y와 overflow-x 중 하나만 'visible'이 아니면 브라우저가 나머지 축도 'auto'로
// 취급한다(CSS Overflow 스펙) — overflow-y-auto만 준 스크롤 박스가 가로 방향도 clip 대상이 된다는
// 뜻이다. 회전한 책등이 이 박스의 좌우 padding-box 경계를 넘으면 그대로 잘린다. 최대 protrusion은
// 중심 기준 회전이라 (SPINE_MAX_HEIGHT/2)*sin(TILT_MAGNITUDE_DEG) ≈ 84*sin(5°) ≈ 7.3px — 여유를 두고
// 12px로 잡는다. TILT_MAGNITUDE_DEG/SPINE_MAX_HEIGHT가 바뀌면 이 값도 다시 계산해야 한다.
// 287-4: getSpineTilt가 "각 행의 마지막 자리만 항상 좌회전"으로 바뀌면서, 실제로 이 여유가 필요한
// 쪽은 오른쪽(마지막 자리 책의 아래쪽 모서리가 오른쪽으로 삐져나옴)뿐이고 왼쪽은 더 이상 필요 없다
// (첫 자리는 항상 0deg). 다만 로직이 또 바뀔 수 있어 대칭으로 남겨 둔다 — 왼쪽 이웃과의 겹침은
// 이 padding이 아니라 TILT_NEIGHBOR_CLEARANCE_PX(아래, ShelfBookSpine의 marginLeft)로 막는다.
export const SHELF_SCROLL_SIDE_PADDING_PX = 12;

// 287-6: ShelfRow의 책 사이 gap을 거의 0(gap-px)으로 줄이면서, 회전한 마지막 자리 책만 왼쪽 이웃과
// 겹칠 여지가 생겼다 — 매 책마다 gap을 넓히는 대신, 기울어진 책(getSpineTilt(index) !== 0)에만
// marginLeft로 이 여유를 준다. 계산은 SHELF_SCROLL_SIDE_PADDING_PX와 같다: 중심 기준 회전이라
// protrusion ≈ (SPINE_MAX_HEIGHT/2)*sin(TILT_MAGNITUDE_DEG) ≈ 84*sin(5°) ≈ 7.3px — 8px로 반올림한다.
export const TILT_NEIGHBOR_CLEARANCE_PX = 8;

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

// 287-4: 확률 기반 랜덤 기울기(이전 287-2/287-3, 1/7 확률 + 줄 양 끝 제외)를 단순 규칙으로 대체한다 —
// 매 행(SHELF_ROW_SIZE개 단위)의 마지막 자리 책만 항상 TILT_MAGNITUDE_DEG만큼 좌측(음수)으로
// 기운다. `(index + 1) % SHELF_ROW_SIZE === 0`이 "이 책이 속한 행에서 마지막 자리"라는 뜻이다(예:
// SHELF_ROW_SIZE=3이면 index 2, 5, 8...). 왼쪽 이웃과의 겹침 방지는 여기가 아니라
// TILT_NEIGHBOR_CLEARANCE_PX(위, ShelfBookSpine의 marginLeft)가 맡는다 — 여기서는 각도만 책임진다.
const TILT_MAGNITUDE_DEG = 5;

export function getSpineTilt(index: number): number {
  const isLastInRow = (index + 1) % SHELF_ROW_SIZE === 0;
  return isLastInRow ? -TILT_MAGNITUDE_DEG : 0;
}

// 250: 스파인 배열을 SHELF_ROW_SIZE개씩 끊어 "행 + 선반" 타이어(ShelfTier) 단위로 렌더링할 수 있게 한다.
export function chunkIntoShelfRows<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += SHELF_ROW_SIZE) {
    rows.push(items.slice(i, i + SHELF_ROW_SIZE));
  }
  return rows;
}
