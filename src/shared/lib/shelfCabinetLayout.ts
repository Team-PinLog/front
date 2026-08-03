import type { ShelfBreakpoint } from './useShelfBreakpoint';

// 287-8: Feed·Library 캐비닛의 반응형 규칙(좌우 컨테이너, 타이틀-캐비닛 gap, 카드/책 크기 스케일,
// 세로 스크롤 영역 min/max, 행당 칸 수)의 단일 소스. FeedList.tsx가 실제로 그리는 값을 그대로
// export하고(추정치가 아니다), Library(shelfSpine.ts 경유) 쪽도 같은 상수·공식을 재사용해 두 페이지가
// 같은 반응형 규칙을 공유하게 한다. Tailwind는 리터럴 클래스만 읽을 수 있어 JS 상수를 클래스 문자열에
// 동적으로 주입할 수 없으므로, className 리터럴(px-4/sm:px-6/lg:px-8 등)이 바뀌면 이 파일의 값도
// 같이 바꿔야 한다.

// --- 페이지 레벨 공통 컨테이너 -------------------------------------------------------------
// AppLayout 상단 네비게이션 바 컨테이너(로고~설정 아이콘, 좌우 끝 정렬 지점)가 쓰는 max-width·좌우
// padding과 정확히 같은 값이다 — 페이지 컨텐츠(캐비닛 포함)의 좌우 끝을 네비게이션 바와 같은 x좌표에
// 맞추기 위해 AppLayout과 FeedPage/LibraryPage가 이 클래스를 그대로 공유한다.
export const PAGE_CONTAINER_CLASS = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';

// Feed("새로운 장소를 발견해 보세요" 제목 아래 gap-4=16px)를 기준값으로 삼는다 — Library가 이 값에
// 맞춘다(이전엔 Library가 gap-6=24px로 Feed와 8px 어긋나 있었다).
export const PAGE_TITLE_GAP_CLASS = 'gap-4';

// --- 카드/스파인 크기 스케일(뷰포트 폭 기준 연속 스케일링) ---------------------------------------
// 1024px(lg) 이상에서는 스케일 1(기존 고정 px 값 그대로 — 시각적 회귀 없음). 640px(sm) 이하에서는
// 0.75까지 줄어들고, 그 사이는 뷰포트 폭에 선형 비례한다. 각 캐비닛 루트(ShelfCabinet 최상위 div,
// FeedList 최상위 div)에서 style={{ '--shelf-scale': SHELF_SCALE_CSS }}로 한 번만 선언하면 CSS 상속으로
// 자손 전부가 같은 값을 읽는다. "한 행에 몇 칸"은 정수만 가능해 CSS clamp()만으로 판단할 수 없으므로
// (아래 FEED_COLUMNS_BY_BREAKPOINT), 그 부분만 useShelfBreakpoint 훅이 담당하고 크기 스케일은 여기
// clamp()로 순수 CSS 처리한다.
const SHELF_SCALE_MIN = 0.75;
const SHELF_SCALE_MAX = 1;
const SHELF_SCALE_MIN_VW_PX = 640; // sm
const SHELF_SCALE_MAX_VW_PX = 1280; // xl
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
// Library(MyShelfList/FollowedShelfCard)의 책 스크롤 박스, Feed(FeedList)의 행 스크롤 영역이 공유하는
// flex-1 높이 제약. 부모가 flex flex-col + min-h(뷰포트 높이 기준)로 잡혀 있을 때, 이 영역이 flex-1로
// 남는 세로 공간을 채우되 아래 min/max를 벗어나지 않는다(정확한 산출값이 아니라, 스케일 1 기준 자연
// 컨텐츠 높이에 맞춘 여유 있는 상/하한이다 — 짧은 뷰포트에서도 최소 2행 이상은 보이고, 큰 뷰포트에서도
// 캐비닛 안쪽에 불필요한 빈 공간이 과하게 생기지 않는 선).
export const SHELF_SCROLL_MIN_H_PX = 360;
export const SHELF_SCROLL_MAX_H_PX = 590;

// --- Feed: breakpoint별 한 행당 카드 수 ---------------------------------------------------------
// PAGE_SIZE(useFeedCollectionsQuery, 10 — 백엔드 페이지 크기 고정값)를 이 수로 나눈 나머지만큼
// 마지막 행이 채워진다(FeedList.tsx toShelfRows가 PAGE_SIZE를 이 칸 수로 잘라 행을 만든다).
export const FEED_COLUMNS_BY_BREAKPOINT: Record<ShelfBreakpoint, number> = {
  base: 3,
  md: 4,
  lg: 5,
};

// --- Feed 카드 치수(스케일 1 기준 — 실제 렌더링 시 scalePx로 감싸 쓴다) ---------------------------
export const CARD_WIDTH_PX = 175;
// 목업 근사 비율(150/210)에서 유도: 175*(210/150)=245.
export const CARD_HEIGHT_PX = 245;
export const BADGE_HEIGHT_PX = 16;
// FeedList.tsx 카드-배지 wrapper의 className="... gap-2"(Tailwind gap-2=8px)와 반드시 일치해야 한다.
export const ITEM_COLUMN_GAP_PX = 8;

// 그리드 한 행의 실제 높이(카드+간격+배지). 카드 높이만 스케일되고 gap·배지는 폰트/여백 기준 고정값을
// 유지한다(텍스트 관련 높이는 화면이 좁아져도 읽기 어려울 만큼 줄어들면 안 된다). FeedList.tsx가
// gridAutoRows에 그대로 쓴다.
export const ITEM_COLUMN_HEIGHT_CSS = `calc(${scalePx(CARD_HEIGHT_PX)} + ${ITEM_COLUMN_GAP_PX}px + ${BADGE_HEIGHT_PX}px)`;
