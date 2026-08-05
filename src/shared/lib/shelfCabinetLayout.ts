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
// 내준다. 이 값은 아래 TITLE_GAP_PX_BY_TIER와 반드시 일치해야 한다(동적 예산 계산식이 이 리터럴을
// 그대로 상수로 들고 있다 — Tailwind 클래스 문자열엔 JS 상수를 주입할 수 없다).
export const PAGE_TITLE_GAP_CLASS = 'gap-2 xl:gap-4';

// 295 추가 수정(요구사항 2.2): 페이지(main) 자체의 상하 padding. xl은 기존 py-6(24px)을 유지하고,
// sm·mdlg는 py-3(12px)로 줄인다. 이전엔 `py-4 md:py-6`(768px 경계)이라 mdlg(768~1279)가 오히려
// xl과 같은 py-6을 쓰고 있었다 — "md 이하가 핵심"이라는 이번 요구사항 기준으로는 mdlg도 sm과 함께
// 줄어야 한다. 아래 PAGE_PADDING_PX_BY_TIER와 반드시 일치해야 한다.
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
// 않고 (b) 세로 예산(동적, getFeedDynamicBudgetPx)을 넘지 않는 한도 안에서 화면을 최대한 채우도록
// scale을 실시간으로 역산한다(solveFeedScale).
// 314: xl 예외(고정 표 scale=1)와 "구간별 고정 행 수"가 모두 사라졌다 — 전 구간이 같은 규칙을 쓴다.
// 행 수는 decideFeedRows가 세로·가로를 둘 다 반영해 화면을 가장 많이 덮는 배치로 고르고, scale은
// 그 행 수에서 두 제약 중 빡빡한 쪽에 맞춰 정해진다(상한 FEED_SCALE_CAP). "비율 고정이 1순위,
// 행 수는 종속 변수"라는 295 요구사항 1.2의 우선순위는 그대로다.
export type FeedColumnsKey = 'xl' | 'mdlgLandscape' | 'mdlgPortrait' | 'sm';

// 315: sm 3 → 2. 정보가 표지 안으로 들어가면서 카드 폭이 곧 조판 폭이 됐다 — 375px 뷰포트에서
// 3열이면 카드 폭이 90px이라 표지 루트 폰트가 7px 수준이고, 제목 한 줄에 대여섯 자밖에 못 들어가
// 표지 안 조판이 성립하지 않는다. 2열로 낮추면 같은 폭에서 카드가 132px이 되고, 세로가 남는 만큼
// decideFeedRows가 행을 3행으로 올려 권수(6권)는 그대로 유지된다.
export const FEED_COLUMNS_BY_KEY: Record<FeedColumnsKey, number> = {
  xl: 5,
  mdlgLandscape: 4,
  mdlgPortrait: 3,
  sm: 2,
};

// 314: 한 페이지에 몇 줄까지 놓을지의 상한. decideFeedRows는 이 상한 안에서 "화면을 가장 많이 덮는"
// 행 수를 고른다 — 상한이 없으면 세로가 넉넉한 PC에서 3행(15권)까지 올라가 한 화면에 책이 너무 많이
// 깔린다(시안은 5열 × 2행 = 10권이다). 짧은 뷰포트에서 2행으로 내려가는 동작은 그대로다.
export const FEED_MAX_ROWS_BY_KEY: Record<FeedColumnsKey, number> = {
  xl: 2,
  mdlgLandscape: 2,
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

// 카드(=표지 한 장) 가로:세로 비율 — "책 표지처럼 보이게" 하는 재설계의 최우선 제약(요구사항 1.1).
// 정확히 0.75(3:4)로 고정하고, 카드 폭은 항상 `카드 높이 * 이 비율`로 역산한다.
// 315: 이제 이 비율이 모든 scale에서 정확히 성립한다 — 카드 높이에 섞여 있던 고정항(정보 패널
// 높이 + 테두리 2px)이 전부 사라져 카드 높이가 scale의 순수 1차식이 됐기 때문이다. 이전에는
// floor 오차 외에도 구간마다 다른 고정항이 비율을 미세하게 흔들었다.
export const FEED_CARD_RATIO = 3 / 4;

/**
 * 315: scale=1 기준 카드(=표지) 높이. 이 티켓의 핵심 변경이다.
 *
 * 314까지 카드 높이는 `테두리 2px + 정보 패널(구간별 78~82px 고정) + 표지(scale × 140)`이었다.
 * 정보가 표지 안으로 들어가면서 앞의 두 항이 사라지는데, **coverHeight(140)를 그대로 두고
 * infoHeightPx만 0으로 넘기면 안 된다** — scale=1 기준 카드 높이가 220에서 140으로 뚝 떨어져
 * 카드가 지금보다 훨씬 작아진다. 그래서 "scale=1일 때의 카드 높이" 자체를 이 상수 하나로
 * 다시 정의한다.
 *
 * 240은 314의 실측(xl 1710×948에서 카드 183×245)을 기준으로 고른 값이다 — 이 값을 쓰면 같은
 * 뷰포트에서 186×248이 나와, 정보 패널만 표지 안으로 흡수되고 책 크기는 거의 그대로 유지된다.
 */
export const FEED_CARD_REF_HEIGHT = 240;

// scale=1 기준 스케일 대상 요소들 — sm/mdlg는 이 비율 관계를 유지한 채 전체를 하나의 scale로
// 줄인다(요구사항 2.3: "요소가 서로 다른 비율로 찌그러지지 않게").
// 314: badgeHeight(14)·itemColumnGap(8)·rowInternalGap(10)이 빠졌다 — 카드 아래 순번 배지를 없애고
// 카드와 선반 판 사이 간격도 0으로 만들면서(책이 선반에 얹힌 것처럼 딱 닿아야 한다), 그 32px이
// 카드 크기로 돌아갔다. 이제 한 행의 세로 구성은 "카드 + 선반 판" 둘뿐이다.
// 315: coverHeight가 빠져 FEED_CARD_REF_HEIGHT로 승격됐다(위 주석) — 이제 카드는 표지 그 자체라
// "표지 높이"가 따로 있을 이유가 없다.
export const FEED_SCALE_REF = {
  // 314: 8 → 22. 시안의 선반은 얇은 줄이 아니라 두께가 드러나는 판이다(윗면 + 나뭇결 + 앞면 모서리).
  // 8px로는 그라디언트가 한 픽셀씩밖에 안 잡혀 단색 선으로 보이고, 나뭇결도 그릴 자리가 없다.
  boardHeight: 22,
  gridGap: 24,
  rowsGap: 32,
};

const FEED_SCALE_SUM_REF = FEED_CARD_REF_HEIGHT + FEED_SCALE_REF.boardHeight;

const FEED_SCALE_FLOOR = 0.02; // 수학적 안전판(0·음수 방지) — 가독성 하한이 아니다.

// 314: 상한이 1이면 "FEED_SCALE_REF보다 커지지 않는다"는 뜻이라, 캐비닛을 걷어내 넓어진 공간을
// 카드가 흡수하지 못한다. 남는 폭은 전부 1fr 컬럼의 여백(=책 사이 gap)으로 흘러가 책이 띄엄띄엄
// 놓인 것처럼 보였다. 이제 예산이 허락하는 만큼 카드가 커지도록 상한을 올린다 — 다만 무한정
// 커지면 한 화면에 책이 두어 권만 남으므로 1.5(카드 폭 약 250px)에서 멈춘다.
const FEED_SCALE_CAP = 1.5;

export interface SolveFeedScaleInput {
  columns: number;
  rows: number;
  budgetPx: number; // 카드가 실제로 쓸 수 있는 세로(getFeedRowsContentBudgetPx로 padding을 뺀 값)
  availableGridWidthPx: number; // getFeedGridAreaWidthPx(실제 뷰포트 폭)
}

// 이 구간(columns×rows)에서 세로 예산·가로 폭 둘 다 넘기지 않는 최대 scale을 구한다.
// 세로: scale*(rows*스케일합 + rowsGap*(rows-1)) ≤ budgetPx
// 가로: columns*cardWidth(scale) + (columns-1)*gridGap(scale) ≤ availableGridWidthPx
//       (cardWidth(scale) = FEED_CARD_RATIO * cardHeight(scale)이므로 가로 제약도 scale의 1차식이 된다)
// 315: infoHeightPx가 사라지면서 두 식의 상수항(고정 테두리+정보 패널)도 함께 사라졌다 — 이제
// 세로·가로 모두 scale에 정비례하는 순수 비례식이라, 예산을 두 배로 주면 카드도 정확히 두 배가 된다.
export function solveFeedScale({
  columns,
  rows,
  budgetPx,
  availableGridWidthPx,
}: SolveFeedScaleInput): number {
  const heightScalableBase = rows * FEED_SCALE_SUM_REF + FEED_SCALE_REF.rowsGap * (rows - 1);
  const heightScale = heightScalableBase > 0 ? budgetPx / heightScalableBase : 1;

  const widthScalableBase =
    columns * FEED_CARD_RATIO * FEED_CARD_REF_HEIGHT + (columns - 1) * FEED_SCALE_REF.gridGap;
  const widthScale = widthScalableBase > 0 ? availableGridWidthPx / widthScalableBase : 1;

  return Math.max(FEED_SCALE_FLOOR, Math.min(FEED_SCALE_CAP, heightScale, widthScale));
}

export interface FeedCardDimensions {
  cardWidth: number;
  cardHeight: number;
  boardHeight: number;
  gridGap: number;
  rowsGap: number;
}

// scale로 실제 렌더링 px을 계산한다. Math.floor로 항상 내림해 budgetPx·availableGridWidthPx 경계를
// 넘지 않는다(반올림으로 위로 튀는 것을 막는다).
// 315: coverHeight를 더 이상 돌려주지 않는다 — 카드가 곧 표지라 카드 높이와 같은 값이다.
export function getFeedCardDimensions(scale: number): FeedCardDimensions {
  const cardHeight = Math.max(1, Math.floor(FEED_CARD_REF_HEIGHT * scale));
  const cardWidth = Math.floor(cardHeight * FEED_CARD_RATIO);
  const boardHeight = Math.max(1, Math.floor(FEED_SCALE_REF.boardHeight * scale));
  const gridGap = Math.max(1, Math.floor(FEED_SCALE_REF.gridGap * scale));
  const rowsGap = Math.max(1, Math.floor(FEED_SCALE_REF.rowsGap * scale));

  return {
    cardWidth,
    cardHeight,
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
// 314: 0.4 → 0.5. 캐비닛 chrome 60px이 예산으로 돌아오면서, 임계값을 그대로 두면 그 여유를 전부
// "행 수"가 먹는다 — decideFeedRows가 4행부터 탐색하므로 sm 844px 기준 3행(scale 0.70) 대신 4행
// (scale 0.41)이 선택된다. scale 0.41이면 카드 높이 141px 중 82px이 고정 정보 패널이라 표지가
// 57px밖에 안 남아 책으로 보이지 않는다. 회수한 공간은 "더 많은 책"이 아니라 "더 큰 책"에 쓰는 게
// 시안(큼직한 책이 선반에 놓인 그림)에 맞다.
//
// 315: 이 하한을 scale이 아니라 **카드 폭(px)** 으로 바꾼다(FEED_ROWS_FALLBACK_MIN_SCALE 폐기).
// scale은 기준값(FEED_CARD_REF_HEIGHT)에 대한 상대값이라, 이번처럼 기준 카드 높이가 220→240으로
// 바뀌면 같은 "0.5"가 가리키는 실제 카드 크기가 조용히 달라진다. 반면 이 임계값이 실제로 판단하려는
// 것은 언제나 "이 카드에 조판이 성립하는가"이고, 정보가 표지 안으로 들어온 지금은 그 판단 기준이
// 곧 카드 폭이다 — 표지 안 글자 크기가 카드 폭에 비례하기 때문이다(CollectionBookCard).
// 112px은 314의 0.5가 만들던 카드 폭(약 112px)과 같은 값이라, 이 교체만으로는 행 수 결정이 바뀌지
// 않는다(회귀 없음).
export const FEED_ROWS_MIN_CARD_WIDTH_PX = 112;
const FEED_ROWS_CANDIDATES = [2, 3, 4];

/**
 * 314: 행 수를 세로 예산만 보고 정하면 안 된다.
 *
 * 이전 구현은 "세로 scale이 임계값을 넘는 가장 큰 행 수"를 골랐다 — 가로 제약(solveFeedScale의
 * widthScale)을 전혀 보지 않아서, 행을 늘려 카드가 작아지면 그만큼 남는 가로 폭이 전부 1fr 컬럼의
 * 여백으로 흘러가 책 사이가 휑하게 벌어졌다(mdlgPortrait 3×4에서 카드 폭 147px에 gap 108px).
 * 반대로 xl은 2행 고정이라 세로가 크게 남았다.
 *
 * 이제 후보 행 수마다 세로·가로를 **둘 다** 반영한 실제 scale(solveFeedScale)을 구하고, 그 결과로
 * 만들어지는 카드가 화면을 가장 많이 덮는 배치를 고른다(카드 넓이 × 높이 × 칸 수). 세로가 남으면
 * 행이 늘고, 가로가 남으면 카드가 커지는 쪽으로 자연스럽게 수렴한다.
 * FEED_ROWS_MIN_CARD_WIDTH_PX는 여전히 가독성 하한이다 — 이 밑으로 떨어지는 배치는 후보에서
 * 제외하고, 전부 탈락하면 가장 적은 행 수(2행)로 떨어진다.
 */
export interface DecideFeedRowsInput {
  columns: number;
  maxRows: number;
  budgetPx: number;
  availableGridWidthPx: number;
}

export function decideFeedRows({
  columns,
  maxRows,
  budgetPx,
  availableGridWidthPx,
}: DecideFeedRowsInput): number {
  let bestRows = FEED_ROWS_CANDIDATES[0];
  let bestArea = -1;

  for (const rows of FEED_ROWS_CANDIDATES.filter((candidate) => candidate <= maxRows)) {
    const scale = solveFeedScale({
      columns,
      rows,
      budgetPx,
      availableGridWidthPx,
    });
    const { cardWidth, cardHeight } = getFeedCardDimensions(scale);
    if (cardWidth < FEED_ROWS_MIN_CARD_WIDTH_PX) {
      continue;
    }
    const area = rows * columns * cardWidth * cardHeight;
    if (area > bestArea) {
      bestArea = area;
      bestRows = rows;
    }
  }

  return bestRows;
}

// --- Feed: 페이지 좌우 컨테이너 폭 기준 그리드 가용 폭 -----------------------------------------------
// PAGE_CONTAINER_CLASS(px-4/sm:px-6/lg:px-8, max-w-6xl)를 그대로 재현한다 — Tailwind 리터럴을 JS가
// 읽을 수 없어 이 값이 바뀌면 여기도 같이 바꿔야 한다(파일 상단 공통 주석과 동일한 이유).
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
// 314: 캐비닛이 사라지면서 여기서 빼던 chrome(border-[8px]×2=16 + body px-5×2=40, 좌우 각 28px)도
// 함께 사라졌다. 대신 같은 자리를 좌우 페이지 이동 버튼의 여유 폭으로 쓴다 — 오픈 책장에는 버튼이
// 들어앉을 캐비닛 안쪽 여백이 없어서, 이 gutter를 확보하지 않으면 버튼이 양 끝 카드 위를 덮어
// 카드 클릭을 가로챈다. 결과적으로 빼는 총량(56px)이 이전과 같아 카드 크기는 그대로다.
export const FEED_SIDE_GUTTER_PX = 28; // 원형 버튼 h-7(28px)이 딱 들어가는 폭

/**
 * 314: 선반 한 덩어리(책 줄 + 좌우 gutter)의 실제 폭.
 *
 * 카드 폭이 세로 예산에 걸려 작아지면 가로에 남는 폭이 생기는데, 선반 판을 컨테이너 전체로 늘리면
 * 그 남는 폭만큼 판이 책 없는 허공까지 뻗어 "우측이 비었다"로 보인다. 대신 선반 전체를 이 폭으로
 * 잡고 가운데 정렬하면, 판은 책보다 좌우 gutter만큼만 넉넉하게 깔리고(시안의 오버행) 남는 폭은
 * 양쪽으로 균등하게 빠진다. 그 gutter가 좌우 페이지 버튼의 자리이기도 하다.
 */
export function getFeedShelfWidthPx(
  columns: number,
  cardWidthPx: number,
  gridGapPx: number,
): number {
  return columns * cardWidthPx + (columns - 1) * gridGapPx + 2 * FEED_SIDE_GUTTER_PX;
}

export function getFeedGridAreaWidthPx(viewportWidthPx: number, reservedLeftPx = 0): number {
  const effectiveWidthPx = viewportWidthPx - reservedLeftPx;
  const containerWidth =
    Math.min(effectiveWidthPx, 1152) - 2 * getPageHorizontalPaddingPx(viewportWidthPx);
  return containerWidth - 2 * FEED_SIDE_GUTTER_PX;
}

// --- Feed: 책장 세로 예산(동적, 전 구간) -------------------------------------------------------------
// "실제 뷰포트 높이 - nav바 높이 - 페이지 타이틀 영역 높이 - 상하 최소 여백"으로 동적 계산한다.
// 314: xl도 여기에 합류했다. 원래 xl은 고정 SHELF_SCROLL_MAX_H_PX(590)를 썼는데 그 값은 "캐비닛
// 안쪽" 높이라는 뜻이었고, 캐비닛을 걷어내면서 근거를 잃었다. 590을 그대로 두면 900px대 뷰포트에서
// 실제 가용 세로(약 820px) 중 230px이 그냥 비어, 책장 아래가 휑하게 남는다. 동적으로 바꾸면 그
// 공간이 행 수·카드 크기 결정(decideFeedRows)에 반영된다.
// 295 추가 수정(이슈 1.1): nav바 높이·타이틀 높이는 더 이상 하드코딩 추정치가 아니다 —
// LayoutMetricsContext(AppLayout·PageTitle이 ref+ResizeObserver로 실측해 보고)에서 받은 값을 호출부
// (FeedList)가 넘겨준다. 아직 측정 전(최초 렌더, 아주 짧은 순간)이면 null이 들어오는데, 그때만
// 아래 MOBILE_NAV_HEIGHT_PX_FALLBACK/MOBILE_TITLE_HEIGHT_PX_FALLBACK(기존에 쓰던 추정치)로
// 폴백한다 — 페이지 padding(py-3)·타이틀-캐비닛 gap(gap-2)·캐비닛 자체 chrome은 전부 우리가 직접
// 소유한 Tailwind 리터럴이라 드리프트 위험이 없어 그대로 상수로 둔다.
// 314: 이제 xl도 이 동적 예산을 쓴다(아래 getFeedDynamicBudgetPx 주석) — 페이지 padding·타이틀 gap이
// 구간마다 다르므로(PAGE_VERTICAL_PADDING_CLASS 'py-3 xl:py-6', PAGE_TITLE_GAP_CLASS 'gap-2 xl:gap-4')
// 단일 상수 대신 구간별 표로 바꾼다. 두 표는 그 Tailwind 리터럴과 반드시 함께 움직여야 한다.
const PAGE_PADDING_PX_BY_TIER: Record<ShelfWidthTier, number> = { sm: 12, mdlg: 12, xl: 24 };
const TITLE_GAP_PX_BY_TIER: Record<ShelfWidthTier, number> = { sm: 8, mdlg: 8, xl: 16 };

const MOBILE_NAV_HEIGHT_PX_FALLBACK = 56; // AppLayout <main> pt-14 근사치 — 실측 전에만 쓴다
// 313: PageTitle이 제목 아래 서브카피까지 포함하는 블록이 되면서 이 폴백도 블록 전체 높이가 됐다 —
// h1(h-8, 32) + gap-1(4) + 서브카피 1줄(text-sm, 20). 32로 두면 실측이 들어오기 전 첫 프레임에만
// 예산이 24px 과대 계상돼 마지막 행이 잠깐 넘쳤다가 제자리를 찾는다. FeedPage는 항상 서브카피를
// 넘기므로(이 상수는 getFeedDynamicBudgetPx 전용 = Feed 전용) 서브카피 있는 쪽에 맞춘다.
const MOBILE_TITLE_HEIGHT_PX_FALLBACK = 56; // PageTitle 블록(제목+서브카피) 근사치 — 실측 전에만 쓴다
// 314: 페이지 padding·타이틀 gap은 위 PAGE_PADDING_PX_BY_TIER/TITLE_GAP_PX_BY_TIER 구간별 표로 옮겼다
// (xl이 동적 예산에 합류하면서 sm·mdlg 값만으로는 부족해졌다).
// 314: 캐비닛(border 16 + 헤더바 32 + body padding 12 = 60px)이 사라져 이 항이 없어졌다 — 오픈
// 책장은 선반 판과 카드만 있고 셸이 없다. sm·mdlg의 세로 예산이 그만큼 늘어난다.
const MOBILE_SAFETY_MARGIN_PX = 8; // 브라우저별 폰트 지표 오차 등에 대비한 여유(요구사항의 "상하 최소 여백")

export interface FeedDynamicBudgetMeasured {
  navHeightPx: number | null;
  titleHeightPx: number | null;
}

export function getFeedDynamicBudgetPx(
  viewportHeightPx: number,
  measured: FeedDynamicBudgetMeasured,
  tier: ShelfWidthTier,
): number {
  // xl은 상단 헤더가 좌측 사이드바로 바뀌어(AppLayout의 xl:hidden) 세로로 뺄 nav 높이가 없다 —
  // 실측값도 0으로 들어오지만, 측정 전 첫 프레임의 폴백도 0이어야 예산이 56px 작게 잡히지 않는다.
  const navFallbackPx = tier === 'xl' ? 0 : MOBILE_NAV_HEIGHT_PX_FALLBACK;
  const navHeightPx = measured.navHeightPx ?? navFallbackPx;
  const titleHeightPx = measured.titleHeightPx ?? MOBILE_TITLE_HEIGHT_PX_FALLBACK;
  const overheadPx =
    navHeightPx +
    PAGE_PADDING_PX_BY_TIER[tier] * 2 +
    titleHeightPx +
    TITLE_GAP_PX_BY_TIER[tier] +
    MOBILE_SAFETY_MARGIN_PX;
  return Math.max(SHELF_SCROLL_MIN_H_PX, viewportHeightPx - overheadPx);
}

// --- Feed: 행 스크롤 박스의 상/하 여백 -------------------------------------------------------------
// 314가 넣은 위쪽 여백(pt-2)의 이유: overflow-y-auto(계산이 어긋나는 극단적 경우의 안전판)는 맨 윗줄
// 카드가 hover(-translate-y-1.5 = 6px)로 떠오를 때 그 카드를 위쪽 경계에서 잘라낸다. 이동량보다 조금
// 큰 여백을 두면 떠오른 카드가 여백 안에 머문다.
// 315: 아래쪽 여백이 빠져 있어 맨 아래 선반 판의 그림자가 잘리는 314 회귀를 함께 고친다. 선반 판의
// shadow(0 10px 16px)는 판 아래로 offset 10 + blur의 절반 8 = 약 18px 뻗는데, overflow가 그걸 자른다.
// 여유를 조금 더 둬 24px로 잡는다.
//
// ⚠️ 이 여백은 반드시 카드 예산에서 차감해야 한다(getFeedRowsContentBudgetPx). 스크롤 박스는
// maxHeight = 세로 예산 + box-sizing: border-box라, 여백을 늘리면 카드가 실제로 쓸 수 있는 세로가
// 그만큼 줄어드는데 solveFeedScale이 그걸 모르면 계산상으로만 딱 맞고 실제로는 스크롤바가 뜬다.
// 값은 FeedList.tsx가 인라인 style로 직접 읽어 쓴다 — Tailwind 클래스 리터럴(pt-2 등)로 두면 JS
// 상수와 두 곳에서 따로 관리돼 어긋날 수 있어서, 이 파일을 단일 소스로 삼는다.
export const FEED_ROWS_PADDING_TOP_PX = 8; // hover 리프트(6px) 수용
export const FEED_ROWS_PADDING_BOTTOM_PX = 24; // 맨 아래 선반 판 그림자
const FEED_ROWS_PADDING_PX = FEED_ROWS_PADDING_TOP_PX + FEED_ROWS_PADDING_BOTTOM_PX;

/**
 * 315: 세로 예산(getFeedDynamicBudgetPx) 중 카드·선반이 실제로 쓸 수 있는 몫.
 *
 * getFeedDynamicBudgetPx가 주는 값은 "스크롤 박스 바깥 치수"(= maxHeight로 그대로 쓰는 값)이고,
 * solveFeedScale/decideFeedRows가 필요로 하는 값은 "그 안쪽 컨텐츠 높이"다. 둘을 구분하지 않으면
 * 위아래 여백만큼 매번 예산이 초과된다.
 */
export function getFeedRowsContentBudgetPx(budgetPx: number): number {
  return Math.max(0, budgetPx - FEED_ROWS_PADDING_PX);
}
