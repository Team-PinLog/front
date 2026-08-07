import { FEED_CARD_RATIO } from '@/shared/lib/shelfCabinetLayout';

/**
 * 382: Feed 화면 레이아웃 스위치.
 *
 * ⏪ **395에서 `'classic'`으로 되돌렸다.** 382가 마련해 둔 롤백 지점이 그대로 동작한다 —
 * 314~331이 만든 기존 화면(균일 책장)이 이 한 줄로 복귀한다. 서점 레이아웃(히어로 + 하단 선반)
 * 코드는 components/bookstore/ 아래에 **그대로 남겨 둔다**: 다시 켜려면 이 값을 `'bookstore'`로
 * 바꾸면 되고, 기존 렌더 경로는 여전히 한 줄도 고치지 않았다 — FeedList가 이 상수로 둘 중 하나를
 * 고른다. 아래 서점 기하 함수들도 그 재전환을 위해 남는다(테스트도 함께 유지).
 * 표지 프리로드(381 흡수분, useFeedCoverPreload)는 레이아웃이 아니라 데이터 계층이라 롤백 대상이
 * 아니다 — 두 레이아웃 모두 같은 목록 응답의 표지를 미리 받는다.
 *
 * ⚠️ 데이터·이벤트 로직은 두 레이아웃이 **완전히 같은 것을 공유한다**(FeedList가 갖고 있다):
 * cursor 체인 페이지네이션, CLICK 이벤트 큐잉, position·requestId는 응답 값 그대로(재계산 금지),
 * 354의 페이지 위치 복원 계약. 레이아웃이 바꾸는 것은 "한 페이지에 몇 권이 들어가는가"(pageSize)와
 * 그 권들을 화면에 어떻게 놓는가뿐이다.
 */
export const FEED_LAYOUT: 'bookstore' | 'classic' = 'classic';

// --- 서점 레이아웃 기하 ---------------------------------------------------------------------------
//
// 기존 레이아웃(shelfCabinetLayout.ts)의 계약을 그대로 지킨다: 주어진 세로 예산 안에서 **페이지
// 스크롤이 생기지 않게** 카드 크기를 역산하고, 카드 비율은 3:4(FEED_CARD_RATIO) 고정이다.
// 그 파일을 고치지 않는 이유는 Library·팔로우 책장이 같은 파일을 쓰기 때문이다(공유 파일) — 이
// 레이아웃에만 필요한 계산은 여기서 새로 만든다.

/** 히어로 구역이 세로 예산에서 가져가는 몫. 나머지가 하단 선반이다. */
const HERO_SECTION_RATIO = 0.58;
/** 히어로 구역과 하단 선반 사이 간격. */
const SECTION_GAP_PX = 16;
/** 선반 판 두께(윗면). ShelfPlank에 그대로 넘긴다. */
const PLANK_HEIGHT_PX = 14;
/** 책과 책 사이. */
const BOOK_GAP_PX = 16;
/** 히어로 책과 보조 카드 단 사이. */
const HERO_ASIDE_GAP_PX = 20;
/** 보조 카드 단이 성립하는 최소 폭. 이보다 좁으면 카드를 접고 히어로가 그 폭을 가져간다. */
const ASIDE_MIN_WIDTH_PX = 240;
/** 보조 카드 단이 가져갈 수 있는 최대 폭 — 히어로가 주인공이라 단이 화면을 지배하면 안 된다. */
const ASIDE_MAX_WIDTH_PX = 360;
/** 하단 선반에 놓을 수 있는 책 수의 하한·상한. 상한이 없으면 넓은 화면에서 책이 잘게 깔린다. */
const SHELF_MIN_CAPACITY = 2;
const SHELF_MAX_CAPACITY = 6;
/** 하단 선반 카드가 이보다 좁아지면 표지 조판이 성립하지 않는다(COVER_COMPACT_WIDTH_PX와 같은 성격). */
const SHELF_MIN_CARD_WIDTH_PX = 96;

export interface BookstoreLayoutInput {
  /** 카드가 실제로 쓸 수 있는 세로(getFeedRowsContentBudgetPx의 결과). */
  budgetPx: number;
  /** 그리드 가용 폭(getFeedGridAreaWidthPx의 결과). */
  availableGridWidthPx: number;
}

export interface BookstoreLayout {
  heroCardWidth: number;
  heroCardHeight: number;
  /** 보조 카드 단 폭. 0이면 좁은 화면이라 단을 접었다는 뜻이다. */
  asideWidth: number;
  showAside: boolean;
  shelfCardWidth: number;
  shelfCardHeight: number;
  /** 하단 선반에 놓는 책 수. pageSize = 1(히어로) + 이 값이다. */
  shelfCapacity: number;
  heroSectionHeight: number;
  shelfSectionHeight: number;
  sectionGap: number;
  bookGap: number;
  heroAsideGap: number;
  plankHeight: number;
}

/**
 * 세로 예산과 가용 폭에서 서점 레이아웃의 모든 치수를 역산한다.
 *
 * 순서가 중요하다 — **세로를 먼저 나누고, 그 안에서 가로를 맞춘다.** 세로 예산은 넘치면 곧바로
 * 페이지 스크롤이 되지만(계약 위반), 가로는 남아도 가운데 정렬로 흡수되기 때문이다.
 *
 * 1. 예산을 히어로 구역과 하단 선반으로 나눈다(사이 간격 포함).
 * 2. 각 구역에서 선반 판 두께를 빼면 그 구역의 책 높이다.
 * 3. 책 폭은 언제나 `높이 × 3/4`(FEED_CARD_RATIO)다.
 * 4. 히어로 + 보조 카드 단이 가로에 안 들어가면 **히어로를 줄인다**(보조 단을 먼저 접고, 그래도
 *    모자라면 히어로 폭에 맞춰 높이까지 되돌려 비율을 지킨다).
 */
export function getBookstoreLayout({
  budgetPx,
  availableGridWidthPx,
}: BookstoreLayoutInput): BookstoreLayout {
  const usableHeight = Math.max(0, budgetPx - SECTION_GAP_PX);
  const heroSectionHeight = Math.floor(usableHeight * HERO_SECTION_RATIO);
  const shelfSectionHeight = usableHeight - heroSectionHeight;

  // 히어로 책: 구역 높이에서 판 두께를 뺀 만큼이 최대 높이다.
  let heroCardHeight = Math.max(1, heroSectionHeight - PLANK_HEIGHT_PX);
  let heroCardWidth = Math.floor(heroCardHeight * FEED_CARD_RATIO);

  // 보조 카드 단은 히어로가 자리를 잡고 남은 폭을 쓴다. 최소 폭에 못 미치면 접는다.
  const widthLeftForAside = availableGridWidthPx - heroCardWidth - HERO_ASIDE_GAP_PX;
  const showAside = widthLeftForAside >= ASIDE_MIN_WIDTH_PX;
  const asideWidth = showAside ? Math.min(ASIDE_MAX_WIDTH_PX, widthLeftForAside) : 0;

  // 보조 단을 접어도 히어로가 폭을 넘으면 히어로를 폭에 맞춰 줄이고 높이를 3:4로 되돌린다 —
  // 비율이 1순위 제약이라 폭만 깎아 납작한 책을 만들지 않는다.
  if (heroCardWidth > availableGridWidthPx) {
    heroCardWidth = Math.max(1, availableGridWidthPx);
    heroCardHeight = Math.floor(heroCardWidth / FEED_CARD_RATIO);
  }

  // 하단 선반: 구역 높이에서 판을 뺀 것이 책 높이고, 폭에서 몇 권이 들어가는지 센다.
  let shelfCardHeight = Math.max(1, shelfSectionHeight - PLANK_HEIGHT_PX);
  let shelfCardWidth = Math.max(1, Math.floor(shelfCardHeight * FEED_CARD_RATIO));
  const fitCount = Math.floor(
    (availableGridWidthPx + BOOK_GAP_PX) / (shelfCardWidth + BOOK_GAP_PX),
  );

  // ⚠️ 세로가 넉넉하고 가로가 좁은 화면(세로형 태블릿 768×1024 등)에서는 세로 예산만 보고 잡은
  // 책이 너무 커서 최소 권수(2권)조차 가로에 들어가지 않는다. 그때는 **세로를 남기더라도 폭에
  // 맞춰 책을 줄인다** — 선반은 한 줄이라 넘치면 그대로 가로 스크롤이 되고, 그건 좌우 버튼
  // 페이지네이션 화면에서 있어서는 안 되는 일이다(295/314가 세운 계약).
  // 이 경우에도 비율은 3:4 그대로다: 폭을 먼저 정하고 높이를 되돌린다.
  if (fitCount < SHELF_MIN_CAPACITY) {
    shelfCardWidth = Math.max(
      1,
      Math.floor(
        (availableGridWidthPx - (SHELF_MIN_CAPACITY - 1) * BOOK_GAP_PX) / SHELF_MIN_CAPACITY,
      ),
    );
    shelfCardHeight = Math.max(1, Math.floor(shelfCardWidth / FEED_CARD_RATIO));
  }

  const shelfCapacity =
    shelfCardWidth < SHELF_MIN_CARD_WIDTH_PX
      ? SHELF_MIN_CAPACITY
      : Math.min(SHELF_MAX_CAPACITY, Math.max(SHELF_MIN_CAPACITY, fitCount));

  return {
    heroCardWidth,
    heroCardHeight,
    asideWidth,
    showAside,
    shelfCardWidth,
    shelfCardHeight,
    shelfCapacity,
    heroSectionHeight,
    shelfSectionHeight,
    sectionGap: SECTION_GAP_PX,
    bookGap: BOOK_GAP_PX,
    heroAsideGap: HERO_ASIDE_GAP_PX,
    plankHeight: PLANK_HEIGHT_PX,
  };
}

/** 이 레이아웃이 한 페이지에 요청할 항목 수. 히어로 1권 + 하단 선반. */
export function getBookstorePageSize(layout: BookstoreLayout): number {
  return 1 + layout.shelfCapacity;
}

// --- 보조 카드 1: 이번 주의 키워드 ------------------------------------------------------------------

/**
 * 지금 페이지에 놓인 책들의 키워드를 세어 많이 나온 순으로 돌려준다.
 *
 * ⚠️ **익명 큐레이션만 만든다.** 레퍼런스(서점 앱)의 "이 주의 작가" 자리에 해당하는 카드지만,
 * Feed 응답에는 소유자 식별자가 아예 없고 공개 화면에 member를 드러내는 것도 금지다
 * (docs/privacy-rules.md, AGENTS.md 금지 1). 그래서 "누가"가 아니라 "무엇이 많이 모였나"를 보여준다.
 *
 * keywords는 응답의 표시 문자열 그대로다 — Keyword `code`가 아니다(AGENTS.md 금지 2). 서버가 준
 * 순서·값을 바꾸지 않고 **세기만** 한다.
 * 동점이면 먼저 나온 키워드가 앞이다(Array.prototype.sort는 안정 정렬이다) — 매 렌더 순서가 흔들리면
 * 같은 페이지인데 카드 내용이 달라 보인다.
 */
export function getWeeklyKeywords(
  items: { keywords: string[] }[],
  limit: number,
): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const keyword of item.keywords) {
      counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
    }
  }
  return Array.from(counts, ([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
