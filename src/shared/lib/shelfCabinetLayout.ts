// 287-5: Feed(FeedList.tsx)와 Library(shelfSpine.ts 경유)가 캐비닛 높이를 각자 따로 계산해오면서
// 매번 몇 px씩 어긋났다 — 이 파일이 그 문제를 없애는 단일 소스다. 아래 값들은 FeedList.tsx가 실제로
// import해서 카드/캐비닛을 그리는 데 쓰는 "진짜" 상수다(추정치가 아니다). Tailwind 클래스는 리터럴
// 문자열만 읽을 수 있어 JS 상수를 클래스에 동적으로 주입할 수는 없으므로, FeedList.tsx의
// className(p-6/gap-3/gap-8/h-2.5)은 그대로 두되 그 값과 반드시 일치하도록 주석에 명시한다 — 저
// className이 바뀌면 아래 CABINET_PADDING_PX 등도 같이 바꿔야 한다.

// FeedList.tsx 카드 표지+정보 영역 높이. CARD_BOX_STYLE/COVER_HEIGHT_PX 계산의 기준값이다.
export const CARD_HEIGHT_PX = 245;
// FeedList.tsx 배지(순번) 높이.
export const BADGE_HEIGHT_PX = 16;
// FeedList.tsx 카드-배지 wrapper의 className="... gap-2"(Tailwind gap-2=8px)와 반드시 일치해야 한다.
export const ITEM_COLUMN_GAP_PX = 8;
// 그리드 한 행의 실제 높이(카드+간격+배지). FeedList.tsx가 gridAutoRows에 그대로 쓴다.
export const ITEM_COLUMN_HEIGHT_PX = CARD_HEIGHT_PX + ITEM_COLUMN_GAP_PX + BADGE_HEIGHT_PX;

// FeedList.tsx 캐비닛 div의 className="... p-6 ..."(Tailwind p-6=24px, 상하좌우 동일).
export const CABINET_PADDING_PX = 24;
// FeedList.tsx 행-div의 className="flex flex-col gap-3"(그리드↔선반 보드 사이, Tailwind gap-3=12px).
export const ROW_INTERNAL_GAP_PX = 12;
// FeedList.tsx 바깥 wrapper의 className="flex flex-col gap-8"(행↔행 사이, Tailwind gap-8=32px).
export const ROWS_GAP_PX = 32;
// FeedList.tsx 선반 보드 div의 className="h-2.5 ..."(Tailwind h-2.5=10px). Library ShelfBoard도 h-2.5로 동일.
export const BOARD_HEIGHT_PX = 10;
// PAGE_SIZE(useFeedCollectionsQuery.ts)/SHELF_COLUMNS(FeedList.tsx) = 10/5 = 2행 고정.
export const FEED_PAGE_ROWS = 2;

// Feed 캐비닛의 실제 최종 렌더링 높이(바깥 테두리 기준, border 없음) — Library(shelfSpine.ts)가
// 이 값 하나만 목표로 두고 자기 내부 배분(헤더바·본문 padding·행 gap)을 역산한다. Feed·Library가
// 카드형/책등형으로 내부 구성 요소가 서로 대응되지 않아 "요소별로 맞추기"가 불가능하므로, 대신
// "바깥 테두리 전체의 최종 합계"만 하나의 진실로 공유한다.
export const SHELF_CABINET_TOTAL_HEIGHT_PX =
  CABINET_PADDING_PX * 2 +
  FEED_PAGE_ROWS * (ITEM_COLUMN_HEIGHT_PX + ROW_INTERNAL_GAP_PX + BOARD_HEIGHT_PX) +
  (FEED_PAGE_ROWS - 1) * ROWS_GAP_PX;
