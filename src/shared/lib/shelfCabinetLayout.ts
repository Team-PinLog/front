import type { ShelfWidthTier } from './useShelfBreakpoint';

// 287-8(→295 반응형 재설계에서 Feed 부분 대체): Feed·Library 캐비닛의 반응형 규칙(좌우 컨테이너,
// 타이틀-캐비닛 gap, 책 크기 스케일, 세로 스크롤 영역 min/max, breakpoint별 배치)의 단일 소스.
// Tailwind는 리터럴 클래스만 읽을 수 있어 JS 상수를 클래스 문자열에 동적으로 주입할 수 없으므로,
// className 리터럴(px-4/sm:px-6/lg:px-8 등)이 바뀌면 이 파일의 값도 같이 바꿔야 한다.
// 295 반응형 재설계: Feed는 더 이상 연속 scale(clamp)로 카드를 줄이지 않는다 — breakpoint(및
// mdlg 구간의 orientation)별로 그리드 자체(열×행 수)를 이산적으로 바꾸고, 각 구간의 카드 치수도
// 고정값으로 미리 계산해둔다(FEED_GRID_BY_KEY). Library는 이번 티켓에서도 여전히 아래 연속
// scale(SHELF_SCALE_CSS/scalePx)로 책등을 줄인다 — 바뀐 건 "동시에 몇 개의 책장 열을 보여줄지"
// (LIBRARY_COLUMNS_BY_TIER)뿐이고, 책장 한 칸 내부의 책 크기 스케일 방식은 그대로다.

// --- 페이지 레벨 공통 컨테이너 -------------------------------------------------------------
// sm·mdlg(<1280): AppLayout 상단 네비게이션 바 컨테이너(로고~설정 아이콘, 좌우 끝 정렬 지점)가 쓰는
// max-width·좌우 padding과 정확히 같은 값이다 — 페이지 컨텐츠(캐비닛 포함)의 좌우 끝을 네비게이션
// 바와 같은 x좌표에 맞추기 위해 AppLayout과 FeedPage/LibraryPage가 이 클래스를 그대로 공유한다.
// xl(≥1280, 304 좌측 사이드바 재구성): 상단 네비게이션 바 자체가 없어지고, 이 컨테이너는
// AppLayout의 <main xl:pl-60>(사이드바 폭만큼 밀린 컨텐츠 영역) 안에서 mx-auto로 중앙 정렬된다 —
// "네비게이션 바와 정렬"이 아니라 "사이드바를 제외한 나머지 폭 안에서 중앙 정렬"로 정렬 기준이
// 바뀌었다. 클래스 리터럴 자체(px-4/sm:px-6/lg:px-8, max-w-6xl)는 그대로지만, 실제로 계산되는 폭이
// 사이드바 폭(SIDEBAR_WIDTH_PX)만큼 좁아진다 — getFeedGridAreaWidthPx가 이를 반영한다.
// 306(Home 히어로 재구성): HomePage도 이 상수를 쓴다 — 기존에는 자체 max-w-5xl을 따로 썼는데,
// 다른 페이지와 좌우 정렬 기준(사이드바 대비 x좌표)을 맞추기 위해 통일했다. HomePage는
// FeedList/ShelfCabinet처럼 이 폭을 JS에서 다시 계산해 쓰는 곳이 없어(지도·검색 결과 갤러리 모두
// 상대 폭 기반) getFeedGridAreaWidthPx 같은 별도 계산식은 필요 없다.
export const PAGE_CONTAINER_CLASS = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';

// 304(공통 AppShell 좌측 사이드바 재구성): xl에서만 존재하는 좌측 고정 사이드바의 폭.
// AppLayout.tsx의 <aside className="... xl:w-60 ...">와 반드시 같은 값을 유지한다(w-60 = 15rem =
// 240px, Tailwind 리터럴이라 JS가 직접 읽을 수 없음). sm·mdlg는 사이드바가 없으므로(기존 상단
// 헤더 유지) 이 값을 쓰지 않는다.
export const SIDEBAR_WIDTH_PX = 240;

// Feed("새로운 장소를 발견해 보세요" 제목 아래 gap-4=16px)를 기준값으로 삼는다 — Library가 이 값에
// 맞춘다(이전엔 Library가 gap-6=24px로 Feed와 8px 어긋나 있었다).
// 295 추가 수정(요구사항 2.2): xl(≥1280, PC)은 기존 16px을 유지하고, sm·mdlg(<1280, 모바일/태블릿)는
// 8px로 줄인다 — 고정 UI(제목-캐비닛 gap)가 차지하는 비중을 줄여 캐비닛에 더 많은 세로 공간을
// 내준다. 이 값은 shelfCabinetLayout.ts의 MOBILE_TITLE_GAP_PX와 반드시 일치해야 한다(동적 예산
// 계산식이 이 리터럴을 그대로 상수로 들고 있다 — Tailwind 클래스 문자열엔 JS 상수를 주입할 수 없다).
export const PAGE_TITLE_GAP_CLASS = 'gap-2 xl:gap-4';

// 295 추가 수정(요구사항 2.2): 페이지(main) 자체의 상하 padding. xl은 기존 py-6(24px)을 유지하고,
// sm·mdlg는 py-3(12px)로 줄인다. 이전엔 `py-4 md:py-6`(768px 경계)이라 mdlg(768~1279)가 오히려
// xl과 같은 py-6을 쓰고 있었다 — "md 이하가 핵심"이라는 이번 요구사항 기준으로는 mdlg도 sm과 함께
// 줄어야 한다. MOBILE_PAGE_PADDING_PX와 반드시 일치해야 한다.
export const PAGE_VERTICAL_PADDING_CLASS = 'py-3 xl:py-6';

// --- Library 책등 크기 스케일(뷰포트 폭 기준 연속 스케일링) ---------------------------------------
// 1024px(lg) 이상에서는 스케일 1(기존 고정 px 값 그대로 — 시각적 회귀 없음). 640px(sm) 이하에서는
// 0.75까지 줄어들고, 그 사이는 뷰포트 폭에 선형 비례한다. Library(ShelfCabinet 최상위 div, shared/ui/
// Shelf.tsx)는 style={{ '--shelf-scale': SHELF_SCALE_CSS }}로 한 번만 선언해 CSS 상속으로 자손 전부가
// 같은 값을 읽게 한다. 295 반응형 재설계 이후로도 Library 책등 크기 자체는 이 연속 clamp() 방식을
// 그대로 쓴다 — 바뀐 건 "동시에 몇 열을 보여줄지"(LIBRARY_COLUMNS_BY_TIER)뿐이다.
// Feed(FeedList.tsx)는 더 이상 이 경로를 쓰지 않는다 — breakpoint/orientation별로 그리드 자체(열×행
// 수)가 이산적으로 바뀌는데, 연속 clamp() 하나로는 그 배치 전환을 표현할 수 없기 때문이다(아래
// FEED_GRID_BY_KEY 참고).
export const SHELF_SCALE_MIN = 0.75;
export const SHELF_SCALE_MAX = 1;
export const SHELF_SCALE_MIN_VW_PX = 640; // sm
export const SHELF_SCALE_MAX_VW_PX = 1280; // xl
export const SHELF_SCALE_CSS = `clamp(${SHELF_SCALE_MIN}, calc(${SHELF_SCALE_MIN} + (100vw - ${SHELF_SCALE_MIN_VW_PX}px) / (${
  SHELF_SCALE_MAX_VW_PX - SHELF_SCALE_MIN_VW_PX
}px) * ${SHELF_SCALE_MAX - SHELF_SCALE_MIN}), ${SHELF_SCALE_MAX})`;

// 스케일 1 기준 px 값에 --shelf-scale을 곱하는 CSS 문자열을 만든다. 회전 각도(deg)에는 쓰지 않는다 —
// 각도 자체는 스케일과 무관하고, 회전에 따른 침범 보정(getSpineTiltLiftPx)만 스케일에 비례해 같이
// 줄어들어야 하므로 그 값을 이 함수로 감싼다(shared/ui/Shelf.tsx).
export function scalePx(px: number): string {
  return `calc(var(--shelf-scale) * ${px}px)`;
}

// --- 세로 스크롤 영역(뷰포트 높이 기준) ---------------------------------------------------------
// Library(MyShelfList/FollowedShelfCard)의 책 스크롤 박스가 쓰는 flex-1 높이 제약. 부모가 flex
// flex-col + min-h(뷰포트 높이 기준)로 잡혀 있을 때, 이 영역이 flex-1로 남는 세로 공간을 채우되
// 아래 min/max를 벗어나지 않는다(정확한 산출값이 아니라, 스케일 1 기준 자연 컨텐츠 높이에 맞춘
// 여유 있는 상/하한이다 — 짧은 뷰포트에서도 최소 2행 이상은 보이고, 큰 뷰포트에서도 캐비닛 안쪽에
// 불필요한 빈 공간이 과하게 생기지 않는 선).
// Feed(FeedList.tsx)는 이제 행 수·카드 치수가 breakpoint별 고정값(FEED_GRID_BY_KEY)이라 이 중
// MAX_H_PX만 "혹시 계산이 어긋나는 극단적 경우"에 대비한 안전판(maxHeight)으로만 재사용한다.
export const SHELF_SCROLL_MIN_H_PX = 360;
export const SHELF_SCROLL_MAX_H_PX = 590;

// --- Library: breakpoint별 동시 노출 책장 수 -----------------------------------------------------
// 295 반응형 재설계 요구사항 B. LibraryPage가 "내 책장 + 팔로우한 책장"을 합친 가상 시퀀스를 이
// 수만큼씩 잘라 좌우 버튼으로 넘긴다(xl은 예외 — 내 책장 1열은 항상 고정이고 팔로우한 책장만
// columns-1개씩 넘어간다, 기존(250) 동작 그대로). 자세한 근거는 LibraryPage.tsx 주석 참고.
export const LIBRARY_COLUMNS_BY_TIER: Record<ShelfWidthTier, number> = {
  sm: 1,
  mdlg: 2,
  xl: 3,
};

// --- Feed: breakpoint/orientation별 그리드(열×행) + 카드 치수 --------------------------------------
// 295 반응형 재설계(요구사항 A). 열 수는 여전히 breakpoint(및 mdlg 구간의 orientation)별 이산 표
// (FEED_COLUMNS_BY_KEY)다 — "한 행에 몇 칸"은 정수라 CSS clamp()만으로 판단할 수 없다는 이전 결론은
// 그대로 유지한다.
// 295 추가 수정(요구사항 1/2): 다만 "카드 치수"는 더 이상 구간별 고정 표가 아니다 — 카드 가로:세로
// 비율(FEED_CARD_RATIO≈3:4)을 최우선 제약으로 두고, 그 비율을 지키면서 (a) 그리드 가로폭이 넘치지
// 않고 (b) 캐비닛 세로 예산(동적, getFeedDynamicBudgetPx)을 넘지 않는 한도 안에서 화면을 최대한
// 채우도록 scale을 실시간으로 역산한다(solveFeedScale) — xl은 예외로, 기존 고정 표(scale=1,
// FEED_XL_CARD_SPEC)를 그대로 쓴다(요구사항 2.4: "xl은 기존 여백 수준을 유지해도 무방").
// mdlgPortrait·sm(둘 다 원래 3행)은 3행을 유지한 채로는 도저히 비율을 지킬 수 없을 만큼 예산이
// 작아지면(decideFeedRows) 2행(6개)으로 낮춘다 — "비율 고정이 1순위, 행 수는 종속 변수"라는
// 요구사항 1.2 우선순위를 그대로 코드로 옮긴 것이다. 이 판단은 실제 뷰포트 높이에 따라 매 렌더
// 다시 계산된다(고정 표가 아니다) — 대부분의 실기기에서는 3행이 유지되고, 유난히 짧은 뷰포트에서만
// 2행으로 떨어진다(자세한 수치는 PR 설명/보고 참고).
export type FeedColumnsKey = 'xl' | 'mdlgLandscape' | 'mdlgPortrait' | 'sm';

export const FEED_COLUMNS_BY_KEY: Record<FeedColumnsKey, number> = {
  xl: 5,
  mdlgLandscape: 4,
  mdlgPortrait: 3,
  sm: 3,
};

export function getFeedColumnsKey(tier: ShelfWidthTier, isLandscape: boolean): FeedColumnsKey {
  if (tier === 'xl') {
    return 'xl';
  }
  if (tier === 'sm') {
    return 'sm';
  }
  return isLandscape ? 'mdlgLandscape' : 'mdlgPortrait';
}

// 카드 전체(표지+정보 패널, 테두리 포함) 가로:세로 비율 — "책 표지처럼 보이게" 하는 이번 재설계의
// 최우선 제약(요구사항 1.1). 정확히 0.75(3:4)로 고정하고, 카드 폭은 항상 `카드 높이 * 이 비율`로
// 역산한다 — 그래야 INFO_HEIGHT(제목/키워드/메타, 텍스트라 scale과 무관하게 고정)가 구간마다 달라도
// (sm은 키워드 2줄이라 다른 구간보다 크다) 최종 카드는 어느 구간에서든 항상 정확히 이 비율을 유지한다.
export const FEED_CARD_RATIO = 3 / 4;

// scale=1 기준(=xl 고정 치수와 동일) 스케일 대상 요소들 — sm/mdlg는 이 비율 관계를 유지한 채
// 전체를 하나의 scale로 줄인다(요구사항 2.3: "요소가 서로 다른 비율로 찌그러지지 않게").
export const FEED_SCALE_REF = {
  coverHeight: 140,
  badgeHeight: 14,
  itemColumnGap: 8,
  rowInternalGap: 10,
  boardHeight: 8,
  gridGap: 24,
  rowsGap: 32,
};

// button border(1px×2) — 카드 높이 중 scale과 무관하게 항상 고정인 2px. FeedList.tsx CARD_BORDER_PX와
// 반드시 일치해야 한다.
const FEED_CARD_BORDER_PX = 2;

const FEED_SCALE_SUM_REF =
  FEED_SCALE_REF.coverHeight +
  FEED_SCALE_REF.badgeHeight +
  FEED_SCALE_REF.itemColumnGap +
  FEED_SCALE_REF.rowInternalGap +
  FEED_SCALE_REF.boardHeight;

const FEED_SCALE_FLOOR = 0.02; // 수학적 안전판(0·음수 방지) — 가독성 하한이 아니다.

export interface SolveFeedScaleInput {
  columns: number;
  rows: number;
  infoHeightPx: number; // 이 구간의 고정(비스케일) 정보 패널 높이 — FeedList.tsx INFO_HEIGHT_PX류
  budgetPx: number; // 캐비닛 세로 예산(xl은 정적 590, 나머지는 getFeedDynamicBudgetPx)
  availableGridWidthPx: number; // getFeedGridAreaWidthPx(실제 뷰포트 폭)
}

// 이 구간(columns×rows, infoHeightPx)에서 세로 예산·가로 폭 둘 다 넘기지 않는 최대 scale을 구한다.
// 세로: rows*(고정 테두리+정보패널) + scale*(rows*스케일합 + rowsGap*(rows-1)) ≤ budgetPx
// 가로: columns*cardWidth(scale) + (columns-1)*gridGap(scale) ≤ availableGridWidthPx
//       (cardWidth(scale) = FEED_CARD_RATIO * cardHeight(scale)이므로 가로 제약도 scale의 1차식이 된다)
export function solveFeedScale({
  columns,
  rows,
  infoHeightPx,
  budgetPx,
  availableGridWidthPx,
}: SolveFeedScaleInput): number {
  const fixedPerRow = FEED_CARD_BORDER_PX + infoHeightPx;

  const heightFixed = rows * fixedPerRow;
  const heightScalableBase = rows * FEED_SCALE_SUM_REF + FEED_SCALE_REF.rowsGap * (rows - 1);
  const heightScale = heightScalableBase > 0 ? (budgetPx - heightFixed) / heightScalableBase : 1;

  const widthFixed = columns * FEED_CARD_RATIO * fixedPerRow;
  const widthScalableBase =
    columns * FEED_CARD_RATIO * FEED_SCALE_REF.coverHeight + (columns - 1) * FEED_SCALE_REF.gridGap;
  const widthScale =
    widthScalableBase > 0 ? (availableGridWidthPx - widthFixed) / widthScalableBase : 1;

  return Math.max(FEED_SCALE_FLOOR, Math.min(1, heightScale, widthScale));
}

export interface FeedCardDimensions {
  cardWidth: number;
  cardHeight: number;
  coverHeight: number;
  badgeHeight: number;
  itemColumnGap: number;
  rowInternalGap: number;
  boardHeight: number;
  gridGap: number;
  rowsGap: number;
}

// scale과 이 구간의 infoHeightPx로 실제 렌더링 px을 계산한다. Math.floor로 항상 내림해 budgetPx·
// availableGridWidthPx 경계를 넘지 않는다(반올림으로 위로 튀는 것을 막는다).
export function getFeedCardDimensions(scale: number, infoHeightPx: number): FeedCardDimensions {
  const coverHeight = Math.max(0, Math.floor(FEED_SCALE_REF.coverHeight * scale));
  const cardHeight = FEED_CARD_BORDER_PX + infoHeightPx + coverHeight;
  const cardWidth = Math.floor(cardHeight * FEED_CARD_RATIO);
  const badgeHeight = Math.max(1, Math.floor(FEED_SCALE_REF.badgeHeight * scale));
  const itemColumnGap = Math.max(1, Math.floor(FEED_SCALE_REF.itemColumnGap * scale));
  const rowInternalGap = Math.max(1, Math.floor(FEED_SCALE_REF.rowInternalGap * scale));
  const boardHeight = Math.max(1, Math.floor(FEED_SCALE_REF.boardHeight * scale));
  const gridGap = Math.max(1, Math.floor(FEED_SCALE_REF.gridGap * scale));
  const rowsGap = Math.max(1, Math.floor(FEED_SCALE_REF.rowsGap * scale));

  return {
    cardWidth,
    cardHeight,
    coverHeight,
    badgeHeight,
    itemColumnGap,
    rowInternalGap,
    boardHeight,
    gridGap,
    rowsGap,
  };
}

// 295 추가 수정(이슈 1.2): 원래는 "3행(mdlgPortrait·sm 원래 배치)이 안 맞으면 2행으로 낮춘다"는
// 단방향 fallback만 있었다 — 남는 예산이 충분한데도 3행에 머물러 화면을 다 못 채우는 경우를
// 놓쳤다. 이제 2~4행 범위를 전부 탐색해서, "카드 비율(3:4)·키워드 자리를 지키면서 이 행 수에서
// 나오는 scale이 여전히 읽을 만한지(≥FEED_ROWS_FALLBACK_MIN_SCALE)"를 만족하는 가장 큰 행 수를
// 고른다 — 예산이 넉넉하면 4행(더 많은 카드)까지, 그마저도 안 맞으면 2행까지 내려간다. 임계값
// (0.4)은 "이 밑으로 내려가면 더 이상 책처럼 안 보인다"는 임의 기준이다(디자이너 확정 아님) — PR
// 설명/보고에 명시했다.
export const FEED_ROWS_FALLBACK_MIN_SCALE = 0.4;
const FEED_ROWS_SEARCH_ORDER = [4, 3, 2];

function getFeedHeightScaleAtRows(infoHeightPx: number, budgetPx: number, rows: number): number {
  const fixedPerRow = FEED_CARD_BORDER_PX + infoHeightPx;
  const heightFixed = rows * fixedPerRow;
  const heightScalableBase = rows * FEED_SCALE_SUM_REF + FEED_SCALE_REF.rowsGap * (rows - 1);
  return (budgetPx - heightFixed) / heightScalableBase;
}

export function decideFeedRows(infoHeightPx: number, budgetPx: number): number {
  for (const rows of FEED_ROWS_SEARCH_ORDER) {
    if (getFeedHeightScaleAtRows(infoHeightPx, budgetPx, rows) >= FEED_ROWS_FALLBACK_MIN_SCALE) {
      return rows;
    }
  }
  return 2;
}

// --- Feed: 페이지 좌우 컨테이너 폭 기준 캐비닛 내부 그리드 가용 폭 -----------------------------------
// PAGE_CONTAINER_CLASS(px-4/sm:px-6/lg:px-8, max-w-6xl)와 ShelfCabinet 자체 chrome(border-[8px]×2,
// body px-5×2)을 그대로 재현한다 — Tailwind 리터럴을 JS가 읽을 수 없어 이 두 값이 바뀌면 여기도
// 같이 바꿔야 한다(파일 상단 공통 주석과 동일한 이유).
function getPageHorizontalPaddingPx(viewportWidthPx: number): number {
  if (viewportWidthPx >= 1024) {
    return 32; // lg:px-8
  }
  if (viewportWidthPx >= 640) {
    return 24; // sm:px-6
  }
  return 16; // px-4
}

// reservedLeftPx: 304(사이드바) 도입 이후 xl에서만 넘기는 SIDEBAR_WIDTH_PX. sm·mdlg 호출부는 인자를
// 생략해 기존 동작(0)을 그대로 유지한다. padding 구간 판단(getPageHorizontalPaddingPx)은 반드시
// 원본 viewportWidthPx로 해야 한다 — px-4/sm:px-6/lg:px-8는 실제 브라우저 viewport 폭 media query에
// 반응하는 것이지, 사이드바를 뺀 "가용 폭"에 반응하는 게 아니기 때문이다(sm:640px/lg:1024px 같은
// CSS breakpoint는 사이드바 유무와 무관하게 항상 실제 window 폭 기준이다). 반면 max-w-6xl(1152) 캡은
// AppLayout의 <main xl:pl-60> 안에서 "사이드바를 뺀 나머지 폭"을 기준으로 걸리므로, reservedLeftPx는
// Math.min보다 먼저 viewportWidthPx에서 빼야 한다 — min() 이후에 빼면(예: 1300px 창에서 1152로 이미
// 캡된 뒤 240을 빼면 848) 실제 CSS가 만드는 값(240을 먼저 뺀 1060을 1152와 비교 → 1060)과 달라진다.
export function getFeedGridAreaWidthPx(viewportWidthPx: number, reservedLeftPx = 0): number {
  const effectiveWidthPx = viewportWidthPx - reservedLeftPx;
  const containerWidth =
    Math.min(effectiveWidthPx, 1152) - 2 * getPageHorizontalPaddingPx(viewportWidthPx);
  return containerWidth - 16 /* 캐비닛 border-[8px]×2 */ - 40; /* 캐비닛 body px-5×2 */
}

// --- Feed: 캐비닛 세로 예산(동적, sm·mdlg 전용 — 요구사항 2) -----------------------------------------
// xl은 기존 고정 SHELF_SCROLL_MAX_H_PX(590)을 그대로 쓴다(요구사항 2.4). sm·mdlg는 "실제 뷰포트
// 높이 - nav바 높이 - 페이지 타이틀 영역 높이 - 상하 최소 여백"으로 동적 계산한다.
// 295 추가 수정(이슈 1.1): nav바 높이·타이틀 높이는 더 이상 하드코딩 추정치가 아니다 —
// LayoutMetricsContext(AppLayout·PageTitle이 ref+ResizeObserver로 실측해 보고)에서 받은 값을 호출부
// (FeedList)가 넘겨준다. 아직 측정 전(최초 렌더, 아주 짧은 순간)이면 null이 들어오는데, 그때만
// 아래 MOBILE_NAV_HEIGHT_PX_FALLBACK/MOBILE_TITLE_HEIGHT_PX_FALLBACK(기존에 쓰던 추정치)로
// 폴백한다 — 페이지 padding(py-3)·타이틀-캐비닛 gap(gap-2)·캐비닛 자체 chrome은 전부 우리가 직접
// 소유한 Tailwind 리터럴이라 드리프트 위험이 없어 그대로 상수로 둔다.
const MOBILE_NAV_HEIGHT_PX_FALLBACK = 56; // AppLayout <main> pt-14 근사치 — 실측 전에만 쓴다
const MOBILE_TITLE_HEIGHT_PX_FALLBACK = 32; // PageTitle h-8 근사치 — 실측 전에만 쓴다
const MOBILE_PAGE_PADDING_PX = 12; // FeedPage/LibraryPage <main> py-3, 상/하 각각 — 우리가 소유, 고정값
const MOBILE_TITLE_GAP_PX = 8; // PAGE_TITLE_GAP_CLASS gap-2 — 우리가 소유, 고정값
// 캐비닛 자체의 chrome(border+헤더바+본문 padding)은 breakpoint와 무관하게 항상 고정이다 — "캐비닛
// 세로 예산"은 그 chrome을 제외한, 실제 카드 행이 들어갈 안쪽 공간을 뜻한다(기존 SHELF_SCROLL_MAX_H_PX
// 도 항상 이 안쪽 공간 기준이었다).
const CABINET_CHROME_PX = 16 /* border-[8px]×2 */ + 32 /* 헤더바 h-8 */ + 12; /* body py-1.5×2 */
const MOBILE_SAFETY_MARGIN_PX = 8; // 브라우저별 폰트 지표 오차 등에 대비한 여유(요구사항의 "상하 최소 여백")

export interface FeedDynamicBudgetMeasured {
  navHeightPx: number | null;
  titleHeightPx: number | null;
}

export function getFeedDynamicBudgetPx(
  viewportHeightPx: number,
  measured: FeedDynamicBudgetMeasured,
): number {
  const navHeightPx = measured.navHeightPx ?? MOBILE_NAV_HEIGHT_PX_FALLBACK;
  const titleHeightPx = measured.titleHeightPx ?? MOBILE_TITLE_HEIGHT_PX_FALLBACK;
  const overheadPx =
    navHeightPx +
    MOBILE_PAGE_PADDING_PX * 2 +
    titleHeightPx +
    MOBILE_TITLE_GAP_PX +
    CABINET_CHROME_PX +
    MOBILE_SAFETY_MARGIN_PX;
  return Math.max(SHELF_SCROLL_MIN_H_PX, viewportHeightPx - overheadPx);
}
