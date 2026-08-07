import {
  SHELF_SCROLL_BOTTOM_PADDING_PX,
  SHELF_SCROLL_TOP_PADDING_PX,
  SPINE_MAX_HEIGHT,
} from './shelfSpine';
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
// 페이지 컨텐츠(캐비닛 포함)의 좌우 정렬 기준. 330에서 상단 네비게이션 바가 없어지면서 정렬 기준이
// 하나로 정리됐다 — 이 컨테이너는 AppLayout의 <main>(sm은 전체 폭, md 이상은 사이드바 폭만큼 밀린
// 영역) 안에서 mx-auto로 중앙 정렬된다. 클래스 리터럴 자체(px-4/sm:px-6/lg:px-8, max-w-6xl)는
// 구간과 무관하게 같지만, md 이상에서 실제로 계산되는 폭이 사이드바 폭(appChrome.ts의
// getSidebarWidthPx)만큼 좁아진다 — getFeedGridAreaWidthPx가 이를 반영한다.
// 306(Home 히어로 재구성): HomePage도 이 상수를 쓴다 — 기존에는 자체 max-w-5xl을 따로 썼는데,
// 다른 페이지와 좌우 정렬 기준(사이드바 대비 x좌표)을 맞추기 위해 통일했다. HomePage는
// FeedList/ShelfCabinet처럼 이 폭을 JS에서 다시 계산해 쓰는 곳이 없어(지도·검색 결과 갤러리 모두
// 상대 폭 기반) getFeedGridAreaWidthPx 같은 별도 계산식은 필요 없다.
export const PAGE_CONTAINER_CLASS = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';

// 330: 사이드바 폭은 appChrome.ts의 getSidebarWidthPx로 옮겼다 — md부터 사이드바가 생기면서
// 폭이 tier에 따라 달라졌고(레일 72 / 넓은 240), 그건 캐비닛 규칙이 아니라 앱 셸 크롬의 개념이다.

// Feed("새로운 장소를 발견해 보세요" 제목 아래 gap-4=16px)를 기준값으로 삼는다 — Library가 이 값에
// 맞춘다(이전엔 Library가 gap-6=24px로 Feed와 8px 어긋나 있었다).
// 295 추가 수정(요구사항 2.2): xl은 16px, sm·mdlg는 8px로 줄였다 — 고정 UI가 차지하는 비중을 줄여
// 캐비닛에 세로 공간을 더 내주려는 의도였다.
// 330 주의: 여기서 xl:은 더 이상 "사이드바가 있는 구간"을 뜻하지 않는다(사이드바는 md부터 있다).
// 큰 화면의 타이포 위계를 뜻하는 값이라 경계를 md로 내리지 않았다 — 내리면 mdlg 세로 예산이
// 그만큼 줄어드는데, mdlg는 330에서 이미 사이드바에 가로를 내준 구간이다.
// 319 디자인 피드백: 그 축소가 과했다. 8px은 서브카피("저장한 장소를 책처럼…")와 책장이 거의 붙어
// 보이는 값이라 두 페이지 모두에서 답답하다는 피드백이 나왔다(Feed·Library 동일). 20/32px로 올린다
// — 여기서 내준 세로는 아래 동적 예산(getPageContentBudgetPx)이 그대로 차감하므로, 책장이 화면
// 아래로 넘치지 않고 행 수·책 크기 계산에 정확히 반영된다.
// 이 값은 아래 TITLE_GAP_PX_BY_TIER와 반드시 일치해야 한다(동적 예산 계산식이 이 리터럴을 그대로
// 상수로 들고 있다 — Tailwind 클래스 문자열엔 JS 상수를 주입할 수 없다).
export const PAGE_TITLE_GAP_CLASS = 'gap-5 xl:gap-8';

// 페이지(main) 자체의 상하 padding. 아래 xl: 역시 타이포·여백 위계이지 사이드바 유무가 아니다
// (위 PAGE_TITLE_GAP_CLASS 주석 참고).
// 295 추가 수정(요구사항 2.2): xl은 기존 py-6(24px)을 유지하고,
// sm·mdlg는 py-3(12px)로 줄인다. 이전엔 `py-4 md:py-6`(768px 경계)이라 mdlg(768~1279)가 오히려
// xl과 같은 py-6을 쓰고 있었다 — "md 이하가 핵심"이라는 이번 요구사항 기준으로는 mdlg도 sm과 함께
// 줄어야 한다. 아래 PAGE_PADDING_PX_BY_TIER와 반드시 일치해야 한다.
export const PAGE_VERTICAL_PADDING_CLASS = 'py-3 xl:py-6';

// 페이지 <main>의 최소 높이. 셸 <main>의 content box 높이가 정확히 100dvh이므로(AppLayout —
// 네비게이션 바를 지우면서 셸은 여백을 전혀 두지 않는다), 여기서는 **페이지 자신의 상하 여백**
// (PAGE_INSET_PX_BY_TIER.y)만 뷰포트에서 덜어낸다.
// FeedPage·LibraryPage·HomePage에 같은 리터럴이 세 벌 복제돼 있던 것을 하나로 모았다.
// Tailwind arbitrary value 안에는 공백이 들어갈 수 없어 calc() 내부를 붙여 쓴다.
// ⚠️ 이 값이 실제 여백과 정확히 같아야 한다 — 크면 모든 페이지에 상시 스크롤바가 생기고
// (359가 없앤 바로 그 현상), 작으면 페이지 아래가 비어 보인다. sm은 여백이 0이라 100dvh 그대로다
// (예전에는 여기서 떠 있는 탭바 자리 5rem을 뺐는데, 탭바가 사라져 뺄 것이 없다).
export const PAGE_MIN_HEIGHT_CLASS =
  'min-h-[100dvh] md:min-h-[calc(100dvh-2rem)] xl:min-h-[calc(100dvh-3rem)]';

/**
 * 364: 페이지가 컨텐츠 사방에 두는 여백. "요소가 화면 끝까지 퍼져 있다"는 피드백에서 나왔다.
 *
 * ⚠️ 네비게이션 바를 지우면서 이 여백의 **소유자가 셸에서 페이지로 바뀌었다.** 예전에는
 * `src/index.css`의 `.shell-main`이 갖고 있었는데, 그 규칙은 몰입도(--immersion)에 따라 여백을
 * 0까지 줄이려고 만든 것이라 몰입 장치와 함께 사라졌다. 이제 여백이 필요한 페이지만
 * PAGE_CONTAINER_CLASS와 이 값을 쓰고, 지면이 가장자리까지 차야 하는 종이 화면(홈·탐색)은
 * 아무것도 쓰지 않는다 — 물러나는 전환 없이 처음부터 각자 자기 여백을 갖는다.
 *
 * 아래 세 소비처가 이 값을 반영하며, 한쪽만 고치면 선반이 가로로 넘치거나 상시 스크롤바가 생긴다:
 *   - 가로: getPageContainerWidthPx
 *   - 세로: getPageContentBudgetPx의 overheadPx, 그리고 PAGE_MIN_HEIGHT_CLASS
 *
 * sm이 0인 이유 — 모바일은 가로가 이미 좁아 여백을 더 주면 카드가 읽히는 크기 아래로 떨어진다.
 * 피드백도 데스크탑·태블릿 한정이었다.
 */
export const PAGE_INSET_PX_BY_TIER: Record<ShelfWidthTier, { x: number; y: number }> = {
  sm: { x: 0, y: 0 },
  mdlg: { x: 16, y: 16 }, // 페이지 루트의 md:p-4
  xl: { x: 24, y: 24 }, // 같은 자리의 xl:p-6
};

/** 페이지 루트가 이 여백을 실제로 그리는 클래스. 위 표와 반드시 같은 값이다. */
export const PAGE_INSET_CLASS = 'md:p-4 xl:p-6';

/**
 * 뷰포트 폭 → 페이지 여백. 경계값 768/1280은 useShelfBreakpoint의 tier 경계이자 Tailwind
 * `md:`/`xl:`과 같은 값이다. getPageContainerWidthPx는 tier를 받지 않고 폭만 받으므로 여기서 다시
 * 판정한다(getPageHorizontalPaddingPx가 같은 이유로 같은 형태를 쓴다).
 */
function getPageInsetPx(viewportWidthPx: number): { x: number; y: number } {
  if (viewportWidthPx >= 1280) {
    return PAGE_INSET_PX_BY_TIER.xl;
  }
  if (viewportWidthPx >= 768) {
    return PAGE_INSET_PX_BY_TIER.mdlg;
  }
  return PAGE_INSET_PX_BY_TIER.sm;
}

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

// 319: SHELF_SCALE_CSS의 JS 쌍둥이. 같은 clamp를 JS에서도 계산해야 하는 이유는 아래
// getLibraryVisibleRowCount가 "한 행이 실제로 몇 px인지"를 알아야 하는데, 그 높이가
// --shelf-scale에 비례하기 때문이다. CSS 변수는 JS가 레이아웃 전에 읽을 수 없으므로 같은 식을
// 여기서 다시 편다 — 위 상수 4개를 공유하므로 값이 어긋날 여지는 없다(식만 두 번 쓴다).
export function getShelfScale(viewportWidthPx: number): number {
  const ratio =
    (viewportWidthPx - SHELF_SCALE_MIN_VW_PX) / (SHELF_SCALE_MAX_VW_PX - SHELF_SCALE_MIN_VW_PX);
  const raw = SHELF_SCALE_MIN + ratio * (SHELF_SCALE_MAX - SHELF_SCALE_MIN);
  return Math.min(SHELF_SCALE_MAX, Math.max(SHELF_SCALE_MIN, raw));
}

// --- 세로 스크롤 영역(뷰포트 높이 기준) ---------------------------------------------------------
// Library의 책 스크롤 박스가 쓰던 flex-1 높이 제약(min 360 / max 590)이었다.
// 319 디자인 피드백("하단 여백이 너무 많다 / 책장이 화면을 거의 채우도록"): MAX_H_PX를 없앴다.
// 이 상한이 정확히 그 증상의 원인이었다 — 뷰포트가 아무리 높아도 책 영역이 590px에서 멈춰,
// 캐비닛 아래로 남는 공간이 전부 빈 여백이 됐다(게다가 좌우 페이지 버튼은 캐비닛이 아니라 그
// "남는 공간까지 포함한" 래퍼의 세로 중앙에 놓여 캐비닛 중앙보다 아래로 내려가 있었다 —
// 피드백의 "버튼 위치가 별로다"가 같은 원인이다). 이제 Library도 Feed(314)와 같은 동적 예산
// (getPageContentBudgetPx)을 쓰고, 그 예산에서 행 수를 역산한다(getLibraryVisibleRowCount).
// MIN_H_PX는 동적 예산의 하한(극단적으로 낮은 뷰포트에서 0이나 음수가 나오지 않게)으로 남는다.
export const SHELF_SCROLL_MIN_H_PX = 360;

// --- Library: 캐비닛 세로 예산 → 행 수 역산 --------------------------------------------------------
// ⚠️ 아래 세 상수는 Tailwind 클래스 리터럴을 JS로 옮겨 적은 값이다(파일 상단 공통 주석과 같은 이유).
// 짝이 되는 클래스가 바뀌면 여기도 함께 바꿔야 한다.
//   CABINET: shared/ui/Shelf.tsx ShelfCabinet — border-[10px]×2(20) + 본문 p-2.5×2(20)
//   COLUMN:  shared/ui/Shelf.tsx ShelfColumn — p-2.5×2(20) + ShelfLabel h-7(28) + 세로 gap-3(12)
//   TIER_GAP: MyShelfList/FollowedShelfCard 스크롤 박스의 gap-1.5(6)
// 스크롤 박스의 위/아래 여백(SHELF_SCROLL_TOP/BOTTOM_PADDING_PX)은 shelfSpine.ts가 단일 소스라
// 리터럴이 아니라 그 상수를 그대로 읽어 뺀다.
export const LIBRARY_CABINET_CHROME_PX = 40;
const LIBRARY_COLUMN_CHROME_PX = 60;
export const SHELF_TIER_GAP_PX = 6;

// 329: 캐비닛 chrome은 사방이 대칭이다(border-[10px]과 p-2.5가 상하좌우 같은 값) — 위 상수는
// "양쪽 합"이라 한 변당 값은 그 절반이다. 좌우 버튼 오버레이(LibraryPage)가 캐비닛 본문 영역을
// 그대로 재현할 때 쓴다. 리터럴을 새로 복제하는 대신 이 상수에서 파생시키는 이유: 상자 모델이
// 바뀌면 행 수 역산(getLibraryVisibleRowCount)이 먼저 깨지므로, 이 상수는 반드시 함께 갱신된다.
export const LIBRARY_CABINET_SIDE_CHROME_PX = LIBRARY_CABINET_CHROME_PX / 2;

// 329: ShelfColumnGrid의 열 사이 간격. 원래 Tailwind 리터럴(gap-x-5)이었는데, 좌우 버튼 오버레이가
// 같은 그리드를 재현해야 해서 JS 단일 소스로 올렸다(Shelf.tsx가 이 값을 인라인 style로 읽어 쓴다).
// shelfSpine.ts 287-13 주석의 칸 폭 계산도 이 20px을 전제로 한다.
export const SHELF_COLUMN_GAP_PX = 20;

// Shelf.tsx ShelfBoard의 두께. 행 높이 계산에 들어가는 값이라 여기를 단일 소스로 둔다.
export const SHELF_BOARD_HEIGHT_PX = 10;

// 행 하나(책 + 그 아래 선반 판)의 실제 높이. 책 높이는 --shelf-scale에 비례하고(ShelfRow가
// SPINE_MAX_HEIGHT를 고정 height로 준다) 선반 판은 스케일 대상이 아니다.
export function getLibraryTierHeightPx(shelfScale: number): number {
  return Math.round(SPINE_MAX_HEIGHT * shelfScale) + SHELF_BOARD_HEIGHT_PX;
}

// 319: 하한 2행 — 한 행짜리 책장은 "책장"으로 보이지 않는다. 상한 4행 — 그 이상은 아주 높은
// 뷰포트에서 책이 잘게 깔려 시안의 "큼직한 책" 인상과 어긋난다(Feed의 FEED_MAX_ROWS_BY_KEY와 같은
// 성격의 임의 상한이다).
export const LIBRARY_MIN_ROW_COUNT = 2;
export const LIBRARY_MAX_ROW_COUNT = 4;

/**
 * 319: 캐비닛에 주어진 세로(getPageContentBudgetPx) 안에 몇 행이 들어가는지 역산한다.
 *
 * 이전에는 행 수가 고정 3이고 스크롤 박스에 min/max-h가 걸려 있어서, 화면이 높으면 캐비닛 아래가
 * 남고 낮으면 마지막 행이 잘렸다. 책 높이를 키우면서(SPINE_MAX_HEIGHT 168→190) 그 고정값을 유지할
 * 수 없게 된 것이 직접적인 계기지만, 사용자가 "화면 비율에 따라 행 수가 달라져도 된다"고 확인해 준
 * 것이 근거다.
 *
 * n행이 차지하는 높이는 n*tier + (n-1)*gap이므로, 여유 h에 들어가는 최대 n은
 * floor((h + gap) / (tier + gap))이다.
 */
export function getLibraryVisibleRowCount(cabinetHeightPx: number, shelfScale: number): number {
  return getShelfRowsFit(
    cabinetHeightPx -
      LIBRARY_CABINET_CHROME_PX -
      LIBRARY_COLUMN_CHROME_PX -
      SHELF_SCROLL_TOP_PADDING_PX -
      SHELF_SCROLL_BOTTOM_PADDING_PX,
    shelfScale,
  );
}

/**
 * 종이 개편: **행이 실제로 놓이는 상자 높이**에서 곧장 행 수를 구한다.
 *
 * 위 getLibraryVisibleRowCount는 인자가 "캐비닛 바깥 높이"라 캐비닛 테두리·칸 padding·스크롤
 * 박스 여백을 스스로 빼야 했다. 종이 지면에는 그 가구가 전부 없고(시안: 캐비닛도 오목한 칸도
 * 걷어내고 판 위에 책만 세운다) 상자를 직접 실측하므로, 뺄 것이 남아 있지 않다 — 빼는 항을 계속
 * 들고 다니면 없는 가구의 두께만큼 행이 하나 덜 들어간다.
 *
 * 두 함수가 같은 식을 공유하는 것이 요점이다. 하한·상한(2~4행)의 근거도 그대로다.
 */
export function getShelfRowsFit(rowsAreaPx: number, shelfScale: number): number {
  const tierPx = getLibraryTierHeightPx(shelfScale);
  const fitted = Math.floor((rowsAreaPx + SHELF_TIER_GAP_PX) / (tierPx + SHELF_TIER_GAP_PX));
  return Math.min(LIBRARY_MAX_ROW_COUNT, Math.max(LIBRARY_MIN_ROW_COUNT, fitted));
}

// --- Library: breakpoint별 동시 노출 책장 수 -----------------------------------------------------
// 295 반응형 재설계 요구사항 B. LibraryPage가 "내 책장 + 팔로우한 책장"을 합친 가상 시퀀스를 이
// 수만큼씩 잘라 좌우 버튼으로 넘긴다(xl은 예외 — 내 책장 1열은 항상 고정이고 팔로우한 책장만
// columns-1개씩 넘어간다, 기존(250) 동작 그대로). 자세한 근거는 LibraryPage.tsx 주석 참고.
export const LIBRARY_COLUMNS_BY_TIER: Record<ShelfWidthTier, number> = {
  sm: 1,
  mdlg: 2,
  xl: 3,
};

/**
 * 내 책장을 첫 칸에 고정하고 팔로우한 책장만 넘길지 여부.
 *
 * 330 이전에는 호출부가 `tier === 'xl'`로 판단했는데, 실제 기준은 처음부터 열 수였다 —
 * LibraryPage 주석이 규칙을 "1·2열일 때는 내 책장도 함께 넘어간다"로 서술한다. tier는 그 대리
 * 변수였을 뿐이라, 사이드바 경계가 md로 내려간 지금은 tier로 묻는 것이 틀린 질문이 된다.
 * 열 수만 보면 LIBRARY_COLUMNS_BY_TIER가 바뀌어도 규칙이 저절로 따라온다.
 */
export const LIBRARY_PINNED_MY_SHELF_MIN_COLUMNS = 3;

export function libraryPinsMyShelf(columns: number): boolean {
  return columns >= LIBRARY_PINNED_MY_SHELF_MIN_COLUMNS;
}

/**
 * 329(디자인 피드백): 좌우 버튼과 페이지 인디케이터가 감싸야 할 "넘어가는 구간"이 시작하는 열 번호
 * (CSS grid line 기준이라 1부터 센다). 구간의 끝은 언제나 마지막 열이다.
 *
 * 내 책장이 고정인 구간(3열 이상)에서는 1열이 넘어가지 않으므로 2열부터가 대상이고, 내 책장도 함께
 * 넘어가는 1·2열 구간에서는 첫 열부터 전부가 대상이다. 버튼 위치·인디케이터 정렬이 이 값 하나를
 * 공유해야 서로 어긋나지 않는다 — 버튼은 이 구간의 양 끝 경계에 걸치고, 인디케이터는 같은 구간의
 * 가운데에 놓인다(캐비닛 전체 가운데가 아니다 — 넘어가지 않는 내 책장까지 포함해 가운데를 잡으면
 * 인디케이터가 왼쪽으로 치우쳐 보인다).
 */
export function getLibraryPagingFirstColumn(columns: number): number {
  return libraryPinsMyShelf(columns) ? 2 : 1;
}

export interface LibraryPageSlots<T> {
  showMyShelf: boolean;
  follows: T[];
  // allFollows 안에서 이 페이지의 follows가 시작하는 인덱스 — "다음 페이지에 필요한 만큼 데이터가
  // 이미 로드됐는지"(needsMoreData) 판단에 쓴다.
  followStartIndex: number;
}

/**
 * 295 반응형 재설계(요구사항 B) 핵심 로직: "내 책장 + 팔로우한 책장"을 열 수에 따라 다르게 자른다.
 * 3열 이상(pinsMyShelf): 내 책장은 시퀀스 밖에서 항상 고정(showMyShelf=true 불변) — 팔로우만
 * (columns-1)개씩 넘어간다 (기존 250 동작 그대로).
 * 1·2열: 사용자 확인("화면 크기에 따라 책장이 1,2열일 때는 나의 책장도 팔로우한 책장들과 한 줄로
 * 묶여 좌우 버튼으로 넘어가야 한다. 그치만 시작은 항상 나의 책장이 시작이다")에 따라, [내 책장,
 * 팔로우1, 팔로우2, ...] 하나의 가상 시퀀스를 columns개씩 자른다 — virtualPageIndex 0은 항상 내
 * 책장으로 시작하고(팔로우 (columns-1)개와 함께), 그 이후 페이지는 팔로우한 책장만으로 채워진다.
 *
 * 329: LibraryPage.tsx의 로컬 함수였던 것을 여기로 옮기고 제네릭으로 바꿨다. 페이지 인디케이터가
 * 생기면서 "전체 페이지 수"(getLibraryPageCount)가 필요해졌는데, 그 둘은 같은 페이징 규칙의 두
 * 얼굴이라 한쪽만 고치면 인디케이터가 실제 페이지와 어긋난다. 한곳에 두고 테스트로 묶는다 —
 * 이 프로젝트는 렌더 테스트를 못 하므로(@testing-library 미설치) 순수 함수로 내려야 검증된다.
 */
export function getLibraryPageSlots<T>(
  virtualPageIndex: number,
  columns: number,
  allFollows: T[],
): LibraryPageSlots<T> {
  if (libraryPinsMyShelf(columns)) {
    const followsPerPage = columns - 1;
    const start = virtualPageIndex * followsPerPage;
    return {
      showMyShelf: true,
      follows: allFollows.slice(start, start + followsPerPage),
      followStartIndex: start,
    };
  }
  if (virtualPageIndex === 0) {
    const followsNeeded = columns - 1;
    return { showMyShelf: true, follows: allFollows.slice(0, followsNeeded), followStartIndex: 0 };
  }
  const firstPageFollowCount = columns - 1;
  const start = firstPageFollowCount + (virtualPageIndex - 1) * columns;
  return {
    showMyShelf: false,
    follows: allFollows.slice(start, start + columns),
    followStartIndex: start,
  };
}

/**
 * 329: 지금까지 로드된 팔로우 수로 만들어지는 가상 페이지 수. 캐비닛 아래 페이지 인디케이터가 쓴다.
 *
 * ⚠️ 이 값은 "현재까지 아는 페이지 수"이지 확정된 전체가 아니다 — 팔로우 목록은 무한 쿼리로 필요할
 * 때만 더 받아오므로(useFollowsQuery), 서버에 더 있으면(hasNext) 사용자가 넘길수록 늘어난다.
 * 그래서 호출부는 hasNext일 때 "더 있을 수 있음"을 함께 표시한다.
 *
 * 위 getLibraryPageSlots와 반드시 같은 규칙이어야 한다(테스트가 두 함수를 교차 검증한다).
 */
export function getLibraryPageCount(followCount: number, columns: number): number {
  if (libraryPinsMyShelf(columns)) {
    // 내 책장은 시퀀스 밖이라 팔로우만 (columns-1)개씩 나눠 담는다. 팔로우가 0개여도 내 책장만
    // 있는 1페이지는 존재한다.
    return Math.max(1, Math.ceil(followCount / (columns - 1)));
  }
  // 0페이지가 내 책장 + 팔로우 (columns-1)개를 함께 담고, 그 뒤로는 팔로우만 columns개씩.
  const remaining = Math.max(0, followCount - (columns - 1));
  return 1 + Math.ceil(remaining / columns);
}

// 329: 캐비닛 아래 페이지 인디케이터가 세로에서 차지하는 높이. 캐비닛 높이는 페이지 세로 예산을
// 그대로 쓰므로(getPageContentBudgetPx), 이만큼 덜어내지 않으면 인디케이터가 화면 밖으로 밀리거나
// 스크롤바가 생긴다. LibraryPage의 Tailwind 리터럴(mt-3=12px + 점 h-2=8px + 여유 4px)과 쌍이다.
export const LIBRARY_PAGE_INDICATOR_BLOCK_PX = 24;

export function getLibraryCabinetHeightPx(pageBudgetPx: number): number {
  return Math.max(SHELF_SCROLL_MIN_H_PX, pageBudgetPx - LIBRARY_PAGE_INDICATOR_BLOCK_PX);
}

// 329: 점을 이 개수까지만 찍고 그 이상은 "n / m" 텍스트로 바꾼다. 팔로우가 많은 계정에서 점이
// 수십 개로 늘어나면 캐비닛 폭을 넘고 현재 위치도 오히려 안 읽힌다.
export const LIBRARY_PAGE_DOTS_MAX = 7;

// --- Feed: breakpoint/orientation별 그리드(열×행) + 카드 치수 --------------------------------------
// 295 반응형 재설계(요구사항 A). 열 수는 여전히 breakpoint(및 mdlg 구간의 orientation)별 이산 표
// (FEED_COLUMNS_BY_KEY)다 — "한 행에 몇 칸"은 정수라 CSS clamp()만으로 판단할 수 없다는 이전 결론은
// 그대로 유지한다.
// 295 추가 수정(요구사항 1/2): 다만 "카드 치수"는 더 이상 구간별 고정 표가 아니다 — 카드 가로:세로
// 비율(FEED_CARD_RATIO≈3:4)을 최우선 제약으로 두고, 그 비율을 지키면서 (a) 그리드 가로폭이 넘치지
// 않고 (b) 세로 예산(동적, getPageContentBudgetPx)을 넘지 않는 한도 안에서 화면을 최대한 채우도록
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

// padding 구간 판단(getPageHorizontalPaddingPx)은 반드시 실제 브라우저 viewport 폭으로 한다 —
// px-4/sm:px-6/lg:px-8는 뷰포트 media query에 반응하는 값이지 "가용 폭"에 반응하는 게 아니다.
// 네비게이션 바 삭제: 좌측 사이드바가 없어지면서 여기서 빼던 reservedLeftPx(72/240)도 함께
// 사라졌다. 이제 페이지가 쓸 수 있는 폭은 뷰포트에서 **페이지 자신의 여백**만 뺀 값이다.
// 314: 캐비닛이 사라지면서 여기서 빼던 chrome(border-[8px]x2=16 + body px-5x2=40, 좌우 각 28px)도
// 함께 사라졌다. 대신 같은 자리를 좌우 페이지 이동 버튼의 여유 폭으로 쓴다 — 오픈 책장에는 버튼이
// 들어앉을 캐비닛 안쪽 여백이 없어서, 이 gutter를 확보하지 않으면 버튼이 양 끝 카드 위를 덮어
// 카드 클릭을 가로챈다.
export const FEED_SIDE_GUTTER_PX = 28; // 원형 버튼 h-7(28px)이 딱 들어가는 폭

/**
 * 328: 선반 판(ShelfPlank) 그림자가 판 좌우로 번지는 폭.
 *
 * 그림자는 `0 10px 16px`이라 x offset이 0이고 blur가 16px이다 — CSS 명세상 blur는 도형 경계를
 * 기준으로 안팎으로 절반씩 퍼지므로, 판의 좌·우 끝에서 정확히 8px씩 바깥으로 나간다. 세로(아래
 * 10 + 8 = 18px)는 FEED_ROWS_PADDING_BOTTOM_PX가 이미 받아주고 있었는데 가로만 빠져 있었다:
 * 행 스크롤 박스의 `overflow-y-auto`는 세로만 스크롤할 뿐 **가로도 함께 클리핑**하기 때문에
 * (overflow-x가 자동으로 auto가 된다) 판 좌우 그림자가 정확히 이 폭만큼 잘려 나갔다.
 *
 * 그래서 스크롤 박스 좌우에 이 폭만큼 padding을 주고(FeedList의 getRowsScrollStyle), 그만큼을
 * 아래 두 함수에서 카드 가로 예산에서 빼고 선반 덩어리 폭에는 더한다 — 빼지 않으면 확보한 여백이
 * 그대로 카드 폭을 침범해 컨테이너를 넘고(가로 스크롤바), 더하지 않으면 판이 그만큼 좁아진다.
 * 세로 여백과 달리 여유분을 얹지 않는다 — 폰트 지표 같은 브라우저 편차가 없는 결정적 값이다.
 *
 * 328 2차: 잘리지 않게 만들고 나니 이번엔 그림자가 판 끝에서 세로선처럼 뚝 끊겨 보였다(box-shadow는
 * 요소의 사각형을 그대로 복제해 흐린다). 그래서 그림자를 좌우로 페이드아웃하는 별도 레이어로
 * 바꿨다(Shelf.tsx ShelfPlank). 이 상수의 값과 계약은 그대로다 — 그 레이어를 판보다 좌우로 정확히
 * 이만큼 넓게 잡아, 그림자가 판 끝을 조금 넘어가며 사라지게 했기 때문이다.
 */
export const FEED_PLANK_SHADOW_BLEED_PX = 8;

/**
 * 314: 선반 한 덩어리(책 줄 + 좌우 gutter)의 실제 폭.
 *
 * 카드 폭이 세로 예산에 걸려 작아지면 가로에 남는 폭이 생기는데, 선반 판을 컨테이너 전체로 늘리면
 * 그 남는 폭만큼 판이 책 없는 허공까지 뻗어 "우측이 비었다"로 보인다. 대신 선반 전체를 이 폭으로
 * 잡고 가운데 정렬하면, 판은 책보다 좌우 gutter만큼만 넉넉하게 깔리고(시안의 오버행) 남는 폭은
 * 양쪽으로 균등하게 빠진다. 그 gutter가 좌우 페이지 버튼의 자리이기도 하다.
 * 328: 여기에 그림자 번짐 폭이 더해진다 — 이 값은 스크롤 박스의 좌우 padding으로 들어가므로
 * 선반 판 자체는 여전히 "책 줄 + gutter"만큼만 넓다(판이 더 넓어지는 게 아니라, 판 바깥에 그림자가
 * 살 자리가 생긴다). 좌우 페이지 버튼은 이 바깥 박스의 left-0/right-0이라 판 끝에 반쯤 걸친다.
 */
export function getFeedShelfWidthPx(
  columns: number,
  cardWidthPx: number,
  gridGapPx: number,
): number {
  return (
    columns * cardWidthPx +
    (columns - 1) * gridGapPx +
    2 * (FEED_SIDE_GUTTER_PX + FEED_PLANK_SHADOW_BLEED_PX)
  );
}

/**
 * 328: PAGE_CONTAINER_CLASS가 실제로 만드는 컨테이너 폭. getFeedGridAreaWidthPx가 원래 안에서
 * 계산하던 첫 두 줄을 그대로 꺼낸 것이다 — 선반 덩어리(getFeedShelfWidthPx)가 이 폭 안에
 * 들어가는지가 "가로 스크롤바가 생기지 않는다"의 정의라, 테스트가 리터럴을 복제하지 않고 같은
 * 식을 부를 수 있어야 한다.
 */
export function getPageContainerWidthPx(viewportWidthPx: number): number {
  // 364: 페이지 좌우 여백은 **Math.min보다 먼저** 뺀다. 뒤에서 빼면 1152 캡이 이미 걸린 넓은
  // 창에서 CSS가 만드는 값과 어긋난다(캡은 여백 안쪽 폭에 걸리기 때문이다).
  const effectiveWidthPx = viewportWidthPx - 2 * getPageInsetPx(viewportWidthPx).x;
  return Math.min(effectiveWidthPx, 1152) - 2 * getPageHorizontalPaddingPx(viewportWidthPx);
}

export function getFeedGridAreaWidthPx(viewportWidthPx: number): number {
  return (
    getPageContainerWidthPx(viewportWidthPx) -
    2 * (FEED_SIDE_GUTTER_PX + FEED_PLANK_SHADOW_BLEED_PX)
  );
}

/**
 * 종이 개편: 그리드 가용 폭(px) → tier.
 *
 * 탐색은 책장이 뷰포트가 아니라 **지면 안의 한 상자**에 놓인다(FeedList의 area). 그 상자는
 * 조판·곁열에 자리를 내주느라 뷰포트보다 한참 좁으므로, 배치를 뷰포트 폭으로 정하면 넓은
 * 화면에서 좁은 상자에 xl 배치를 밀어 넣게 된다 — "몇 칸을 놓을지"가 묻는 것은 언제나 "그 자리가
 * 얼마나 넓은가"다.
 *
 * ⚠️ 경계값을 768/1280(뷰포트 기준, useShelfBreakpoint)으로 그대로 쓰면 안 된다. 그 숫자는
 * **뷰포트** 폭이고, 같은 화면에서 그리드가 실제로 쓰는 폭은 사이드바·셸 여백·페이지 padding·
 * 선반 gutter를 뺀 값이라 훨씬 작다 — 그대로 비교하면 모든 구간이 한 칸씩 아래로 밀린다.
 * 그래서 그 두 경계 뷰포트에서 **기존 계산이 실제로 만들던 그리드 폭**을 경계값으로 삼는다.
 * getFeedGridAreaWidthPx를 다시 부르므로, 셸 여백이나 gutter가 바뀌면 이 경계도 함께 움직인다.
 */
const TIER_MIN_GRID_WIDTH_PX = {
  mdlg: getFeedGridAreaWidthPx(768),
  xl: getFeedGridAreaWidthPx(1280),
};

export function getShelfTierForGridWidth(gridAreaWidthPx: number): ShelfWidthTier {
  if (gridAreaWidthPx >= TIER_MIN_GRID_WIDTH_PX.xl) {
    return 'xl';
  }
  if (gridAreaWidthPx >= TIER_MIN_GRID_WIDTH_PX.mdlg) {
    return 'mdlg';
  }
  return 'sm';
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
// 314: 이제 xl도 이 동적 예산을 쓴다(아래 getPageContentBudgetPx 주석) — 페이지 padding·타이틀 gap이
// 구간마다 다르므로(PAGE_VERTICAL_PADDING_CLASS 'py-3 xl:py-6', PAGE_TITLE_GAP_CLASS 'gap-5 xl:gap-8')
// 단일 상수 대신 구간별 표로 바꾼다. 두 표는 그 Tailwind 리터럴과 반드시 함께 움직여야 한다.
const PAGE_PADDING_PX_BY_TIER: Record<ShelfWidthTier, number> = { sm: 12, mdlg: 12, xl: 24 };
const TITLE_GAP_PX_BY_TIER: Record<ShelfWidthTier, number> = { sm: 20, mdlg: 20, xl: 32 };

// 313: PageTitle이 제목 아래 서브카피까지 포함하는 블록이 되면서 이 폴백도 블록 전체 높이가 됐다 —
// h1(h-8, 32) + gap-1(4) + 서브카피 1줄(text-sm, 20). 32로 두면 실측이 들어오기 전 첫 프레임에만
// 예산이 24px 과대 계상돼 마지막 행이 잠깐 넘쳤다가 제자리를 찾는다. FeedPage는 항상 서브카피를
// 넘기므로 서브카피 있는 쪽에 맞춘다. 319: Library도 같은 예산 함수를 쓰게 되면서 이 폴백을
// 공유한다 — 두 페이지의 PageTitle 구조가 같아(h1 + 서브카피 한 줄) 같은 근사치가 그대로 맞는다.
const MOBILE_TITLE_HEIGHT_PX_FALLBACK = 56; // PageTitle 블록(제목+서브카피) 근사치 — 실측 전에만 쓴다
// 314: 페이지 padding·타이틀 gap은 위 PAGE_PADDING_PX_BY_TIER/TITLE_GAP_PX_BY_TIER 구간별 표로 옮겼다
// (xl이 동적 예산에 합류하면서 sm·mdlg 값만으로는 부족해졌다).
// 314: 캐비닛(border 16 + 헤더바 32 + body padding 12 = 60px)이 사라져 이 항이 없어졌다 — 오픈
// 책장은 선반 판과 카드만 있고 셸이 없다. sm·mdlg의 세로 예산이 그만큼 늘어난다.
const MOBILE_SAFETY_MARGIN_PX = 8; // 브라우저별 폰트 지표 오차 등에 대비한 여유(요구사항의 "상하 최소 여백")

// 네비게이션 바 삭제: navChromeHeightPx가 사라졌다. 그 값은 sm 하단 탭바가 세로에서 먹는 높이를
// 실측해 담던 것인데, 탭바가 없어져 언제나 0이다 — 항이 0으로 고정되면 계산에 남겨 둘 이유가 없고,
// 남겨 두면 "네비게이션이 아직 세로를 먹는다"는 틀린 전제가 코드에 계속 남는다.
export interface PageBudgetMeasured {
  titleHeightPx: number | null;
}

// 319: getPageContentBudgetPx에서 이름을 바꿨다. 계산식은 그대로지만("뷰포트 높이에서 nav·페이지
// padding·타이틀 블록·타이틀 gap·안전 여백을 뺀 나머지") 이제 Feed 전용이 아니다 — Library 캐비닛도
// 같은 예산을 쓴다(getLibraryVisibleRowCount의 입력). 두 페이지의 <main> 구조와 PageTitle이 애초에
// 동일하므로 식을 나눠 가질 이유가 없고, 오히려 한쪽만 고쳐 어긋나는 쪽이 위험하다.
export function getPageContentBudgetPx(
  viewportHeightPx: number,
  measured: PageBudgetMeasured,
  tier: ShelfWidthTier,
): number {
  const titleHeightPx = measured.titleHeightPx ?? MOBILE_TITLE_HEIGHT_PX_FALLBACK;
  const overheadPx =
    // 364: 페이지 루트가 위아래로 두는 여백(PAGE_INSET_CLASS). 그 안쪽 padding
    // (PAGE_PADDING_PX_BY_TIER)과 별개로 먼저 먹는 몫이라 따로 더한다 — 빠뜨리면 예산이 그만큼
    // 커져 책장이 넘친다.
    PAGE_INSET_PX_BY_TIER[tier].y * 2 +
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
// 328: 좌우도 같은 이유의 여백이 필요했는데 빠져 있어 모든 선반 판의 좌우 그림자가 잘렸다
// (FEED_PLANK_SHADOW_BLEED_PX 주석). 세로 여백과 달리 이 값은 카드 "세로" 예산이 아니라 "가로"
// 예산에서 차감된다 — getFeedGridAreaWidthPx가 이미 빼고 있으므로 여기서는 값만 정의한다.
export const FEED_ROWS_PADDING_TOP_PX = 8; // hover 리프트(6px) 수용
export const FEED_ROWS_PADDING_BOTTOM_PX = 24; // 맨 아래 선반 판 그림자
export const FEED_ROWS_PADDING_X_PX = FEED_PLANK_SHADOW_BLEED_PX; // 선반 판 좌우 그림자
const FEED_ROWS_PADDING_PX = FEED_ROWS_PADDING_TOP_PX + FEED_ROWS_PADDING_BOTTOM_PX;

/**
 * 315: 세로 예산(getPageContentBudgetPx) 중 카드·선반이 실제로 쓸 수 있는 몫.
 *
 * getPageContentBudgetPx가 주는 값은 "스크롤 박스 바깥 치수"(= maxHeight로 그대로 쓰는 값)이고,
 * solveFeedScale/decideFeedRows가 필요로 하는 값은 "그 안쪽 컨텐츠 높이"다. 둘을 구분하지 않으면
 * 위아래 여백만큼 매번 예산이 초과된다.
 */
export function getFeedRowsContentBudgetPx(budgetPx: number): number {
  return Math.max(0, budgetPx - FEED_ROWS_PADDING_PX);
}
