import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ErrorState } from '@/shared/ui/ErrorState';
// 319: 선반 판은 Library 캐비닛(ShelfBoard)과 완전히 같은 판이라 shared/ui/Shelf.tsx로 옮겨 공유한다.
import { ShelfPlank } from '@/shared/ui/Shelf';
import {
  decideFeedRows,
  FEED_COLUMNS_BY_KEY,
  FEED_MAX_ROWS_BY_KEY,
  FEED_ROWS_PADDING_BOTTOM_PX,
  FEED_ROWS_PADDING_TOP_PX,
  FEED_ROWS_PADDING_X_PX,
  getFeedColumnsKey,
  getFeedCardDimensions,
  getPageContentBudgetPx,
  getFeedGridAreaWidthPx,
  getFeedRowsContentBudgetPx,
  getFeedShelfWidthPx,
  solveFeedScale,
} from '@/shared/lib/shelfCabinetLayout';
import { getSidebarWidthPx } from '@/shared/lib/appChrome';
import {
  useIsLandscapeOrientation,
  useShelfWidthTier,
  useViewportSize,
} from '@/shared/lib/useShelfBreakpoint';
import { useLayoutMetrics } from '@/shared/lib/LayoutMetricsContext';
import { useFeedCollectionsQuery } from '../hooks/useFeedCollectionsQuery';
import { useFeedEventQueue } from '../hooks/useFeedEventQueue';
import { CollectionBookCard } from './CollectionBookCard';
import type { FeedCollectionItem } from '../api/getFeedCollections';

// 279(→287-8→295 이산 배치→295 추가 수정에서 3:4 비율+동적 예산으로 재설계): 목업(Team-PinLog/
// mockup 탐색 페이지)의 책장 레이아웃 — 한 행당 카드 수는 여전히 breakpoint(및 mdlg 구간의
// orientation)별 이산 표(FEED_COLUMNS_BY_KEY)지만, 카드 "크기"는 더 이상 고정 표가 아니다.
//
// 295 추가 수정(이슈 1: 카드 비율): 카드 가로:세로 비율을 3:4(FEED_CARD_RATIO)로 고정한다 —
// breakpoint/그리드 구성과 무관한 최우선 제약이다. 카드 폭은 항상 `카드 높이 * 3/4`로 역산해서
// 만든다.
// 315: 그 역산이 이제 정확히 맞아떨어진다 — 카드 높이에서 고정항(정보 패널 + 테두리 2px)이 전부
// 빠져 scale의 순수 1차식이 됐다(FEED_CARD_REF_HEIGHT).
// 295 추가 수정(이슈 2: 동적 세로 예산): xl은 기존 고정 SHELF_SCROLL_MAX_H_PX(590, 319에서 삭제)를 쓰고,
// sm·mdlg는 실제 뷰포트 높이 기반 동적 예산(getPageContentBudgetPx)을 쓴다. 카드 크기(scale)는 이
// 예산과 그리드 가로 폭(getFeedGridAreaWidthPx, 실제 뷰포트 폭 기반) 중 더 빡빡한 쪽에 맞춰 실시간
// 역산한다(solveFeedScale) — "화면을 거의 가득 채우도록" 조정하되 카드/gap/선반 판이 서로 다른
// 비율로 찌그러지지 않도록 전부 같은 scale 하나로 묶는다.
// 295 추가 수정(이슈 1.2: 행 수 하향): 3행으로는 비율을 지키며 도저히 예산 안에 들어올 수 없을
// 만큼(카드 폭이 FEED_ROWS_MIN_CARD_WIDTH_PX 미만) 작아지면 2행으로 낮춘다(decideFeedRows) —
// 실제 뷰포트 높이에 따라 매 렌더 다시 판단한다(고정 표가 아니다).
// 315: 카드 아래 정보 패널(제목·키워드·메타를 담던 고정 높이 블록)이 통째로 사라지면서, 그 높이를
// 구간별로 계산하던 상수들(TITLE_HEIGHT_PX·META_HEIGHT_PX·KEYWORDS_HEIGHT_PX_*·INFO_PADDING_PX_*·
// INFO_GAP_PX_*·getInfoLayout)도 함께 없앴다. 정보는 이제 표지 안에 얹히고(CollectionBookCard),
// 그 글자 크기는 고정 px이 아니라 카드 폭에 비례하는 em이라 세로 예산 계산에 들어갈 고정항이 없다.

// 슬롯 수(pageSize = columns*rows)만큼 채우고 모자란 자리는 null로 채워 캐비닛 크기를 고정한다 —
// 마지막 페이지처럼 슬롯 수 미만일 때도 책장 전체 크기는 그대로 두고 왼쪽부터 채운 뒤 나머지는 빈
// 선반으로 보여준다.
function toShelfRows(
  items: FeedCollectionItem[],
  columns: number,
  pageSize: number,
): (FeedCollectionItem | null)[][] {
  const slots: (FeedCollectionItem | null)[] = Array.from(
    { length: pageSize },
    (_, index) => items[index] ?? null,
  );
  const rows: (FeedCollectionItem | null)[][] = [];
  for (let i = 0; i < slots.length; i += columns) {
    rows.push(slots.slice(i, i + columns));
  }
  return rows;
}

// 354: 책을 펼치면 FeedPage가 언마운트되므로(오버레이처럼 보이지만 실제로는 라우트 이동) 아래
// cursorHistory/pageIndex도 함께 사라진다 — 닫고 돌아오면 캐시가 남아 있어도 언제나 1페이지였다.
// "지금 몇 번째 페이지를 보고 있었는가"만 모듈 스코프에 남겨두면 되돌아왔을 때 그 cursor의 캐시가
// 곧장 그려진다.
// ⚠️ sessionStorage가 아니라 모듈 변수인 것이 핵심이다. cursor는 특정 Feed Session에 묶인 opaque
// 값이라(08_API_명세 10.1) 쿼리 캐시와 정확히 같은 수명(탭의 JS 수명)을 가져야 한다 — 새로고침하면
// 캐시와 함께 사라져 새 세션의 1페이지에서 시작하는 게 맞고, 저장소에 남겨두면 죽은 세션의 cursor로
// 요청하게 된다. pageSize가 다르면(리사이즈로 그리드 구성이 바뀐 경우) 복원하지 않는다 — 같은
// cursor라도 페이지가 담는 항목 수가 달라 "보던 위치"가 아니게 된다(아래 pageSize 리셋과 같은 이유).
interface FeedPagePosition {
  cursorHistory: (string | undefined)[];
  pageIndex: number;
  pageSize: number;
}

let lastFeedPagePosition: FeedPagePosition | null = null;

/**
 * Feed(발행된 Collection 추천 목록) 목록. 근거: Jira S15P11A705-142, docs/reference/08_API_명세.md 10.1.
 * IMPRESSION은 서버가 목록 응답 생성 시 자동 기록한다 — 프론트는 CLICK만 큐잉한다.
 * 항목 클릭 시 이벤트를 큐에 쌓고 전송 완료를 기다리지 않고 바로 상세로 이동한다.
 *
 * 249: 무한스크롤 대신 이전/다음 버튼 페이지네이션으로 바뀌었다. getFeedCollections는 opaque cursor
 * 기반이라 서버가 prevCursor를 주지 않는다(08_API_명세 10.1) — "이전"은 지금까지 방문한 cursor를
 * pageIndex로 가리키는 로컬 배열(cursorHistory)에서 꺼내 쓴다. cursorHistory[0]은 첫 페이지(cursor
 * undefined)이고, "다음"을 누를 때만 직전 페이지의 nextCursor를 이어붙인다 — 항상 직전 페이지의
 * nextCursor로만 다음 페이지를 요청해 같은 Feed Session 체인을 유지한다(10.1 "같은 Session의 다음
 * 페이지는 nextCursor로 이어받는다").
 * 295 반응형 재설계(요구사항 A/E, 추가 수정 이슈 1/2/3): 좌우 버튼 페이지네이션 방식이라 책장
 * 내부에 별도 스크롤이 있으면 안 된다 — 열 수는 breakpoint별 고정 표, 카드 크기는 3:4 비율 +
 * 동적 예산 기반 scale로 매 렌더 다시 계산한다(overflow-y-auto는 계산이 어긋나는 극단적 경우에
 * 대비한 안전판으로만 남긴다).
 * 314: 짙은 남색 캐비닛(ShelfCabinet)과 "추천 도서" 헤더바를 걷어내고 페이지 배경 위에 선반 판과
 * 책만 남긴다 — 시안의 밝은 오픈 책장이다. 셸이 없어졌으므로 좌우 페이지 버튼이 들어앉을 안쪽
 * 여백도 사라진다. 대신 선반 덩어리(책 줄 + 좌우 gutter, getFeedShelfWidthPx)를 가운데 정렬하고
 * 그 gutter를 버튼 자리로 쓴다 — 버튼이 양 끝 카드 위를 덮지 않고, 선반 판도 책 없는 허공까지
 * 뻗지 않는다.
 * 314: 카드 아래 순번 배지도 없앴다 — 책이 선반 판에 딱 닿아 얹혀 보여야 하는데 배지가 그 사이를
 * 벌리고 있었다. position은 표시에서만 빠지고 CLICK 이벤트에는 응답 값 그대로 실린다(재계산 금지).
 * 315: 카드 안쪽도 표지 한 장으로 합쳤다 — 표지 아래 붙어 있던 정보 패널을 없애고 제목·키워드·
 * 저장된 장소 수·날짜를 표지 위에 얹는다(CollectionBookCard). 그 결과 카드 높이에서 "scale과
 * 무관한 고정항"이 완전히 사라져 세로 예산 계산이 순수 비례식이 됐다(shelfCabinetLayout.ts).
 * 이 티켓에서도 페이지네이션·이벤트 큐잉 로직은 그대로다 — requestId·position은 응답 값 그대로다.
 */
export function FeedList() {
  const navigate = useNavigate();
  const feedEventQueue = useFeedEventQueue();

  const tier = useShelfWidthTier();
  const isLandscape = useIsLandscapeOrientation();
  const { width: viewportWidth, height: viewportHeight } = useViewportSize();
  const { navChromeHeightPx, titleHeightPx } = useLayoutMetrics();

  const columnsKey = getFeedColumnsKey(tier, isLandscape);
  const columns = FEED_COLUMNS_BY_KEY[columnsKey];

  // 314: 전 구간이 실제 뷰포트 높이 기반 동적 예산을 쓴다 — xl의 고정 590은 "캐비닛 안쪽" 높이라는
  // 뜻이었고 캐비닛이 사라지면서 근거를 잃었다(그대로 두면 책장 아래가 크게 빈다).
  // 295 추가 수정(이슈 1.1): nav바·타이틀 높이는 하드코딩 추정치가 아니라 LayoutMetricsContext가
  // 실측해 보고한 값이다(AppLayout.tsx/PageTitle.tsx 참고).
  // 315: budgetPx는 스크롤 박스 바깥 치수(maxHeight)이고, 카드·선반이 실제로 쓸 수 있는 몫은 위아래
  // 여백을 뺀 contentBudgetPx다 — 이 구분을 빼먹으면 여백만큼 매번 예산이 넘쳐 스크롤바가 뜬다.
  const budgetPx = getPageContentBudgetPx(
    viewportHeight,
    { navChromeHeightPx, titleHeightPx },
    tier,
  );
  const contentBudgetPx = getFeedRowsContentBudgetPx(budgetPx);

  // 좌측 사이드바가 실제 가용 폭을 그만큼 줄인다. 330: 사이드바가 md부터 생기고 폭도 구간마다
  // 다르므로(레일 72 / 넓은 240) 값을 getSidebarWidthPx가 판단한다 — sm은 0이라 기존과 동일하다.
  const availableGridWidthPx = getFeedGridAreaWidthPx(viewportWidth, getSidebarWidthPx(tier));

  // 314: 행 수도 더 이상 구간별 고정값이 아니다 — 세로 예산과 가로 폭을 둘 다 반영해 화면을 가장
  // 많이 덮는 배치를 고른다(decideFeedRows). 이전에는 xl·mdlgLandscape가 2행 고정이라 세로가 남고,
  // 나머지는 세로만 보고 행을 늘려 가로가 남았다.
  const rows = decideFeedRows({
    columns,
    maxRows: FEED_MAX_ROWS_BY_KEY[columnsKey],
    budgetPx: contentBudgetPx,
    availableGridWidthPx,
  });
  const pageSize = columns * rows;
  const scale = solveFeedScale({
    columns,
    rows,
    budgetPx: contentBudgetPx,
    availableGridWidthPx,
  });
  const dims = getFeedCardDimensions(scale);
  // 314: 컬럼 폭을 1fr(남는 폭을 균등 분배)이 아니라 카드 폭 그대로 잡고 그리드 전체를 가운데
  // 정렬한다. 1fr이면 scale이 세로에 걸려 카드가 작아질 때 남는 가로 폭이 전부 칸 여백으로 흘러가
  // 책 사이가 휑하게 벌어졌다(gridGap 20px인데 실제 간격은 100px을 넘기도 했다). 고정 폭이면 책
  // 사이 간격은 항상 정확히 gridGap이고, 남는 폭은 선반 덩어리 바깥으로 빠진다.
  const gridTemplateColumns = `repeat(${columns}, ${dims.cardWidth}px)`;
  // 선반 한 덩어리(책 줄 + 좌우 gutter)를 가운데 정렬한다 — 판이 책 없는 허공까지 뻗지 않는다.
  const shelfWidthPx = getFeedShelfWidthPx(columns, dims.cardWidth, dims.gridGap);
  const cardBoxStyle = { width: dims.cardWidth, height: dims.cardHeight };
  // 314: 순번 배지를 없애면서 카드 아래에 붙던 배지 높이·간격도 사라졌다 — 칸 높이가 곧 카드
  // 높이이고, 책이 선반 판 바로 위에 얹힌다.
  const itemColumnHeight = dims.cardHeight;

  // 구간(열 수)이나 행 수가 바뀌면 이전에 쌓아둔 cursor 체인은 이번 페이지 크기와 더 이상 맞지
  // 않는다 — 첫 페이지로 되돌려 새 pageSize로 다시 받는다(queryKey에 size가 포함돼 있어 캐시
  // 오염은 없지만, 사용자가 보던 페이지 번호 자체가 새 그리드에서는 다른 항목 수를 의미하게 된다).
  // "prop이 바뀌면 state를 리셋"하는 리액트 표준 패턴(렌더 중 setState) — useEffect+setState는
  // 커밋 후 리렌더를 한 번 더 유발해(react-hooks/set-state-in-effect) 화면이 잠깐 깜빡일 수 있다.
  // 354: 초기값은 직전에 보던 페이지다(lastFeedPagePosition). 이 두 state를 pageSize 계산 아래로
  // 내린 이유도 그것이다 — 복원 여부를 판단하려면 이번 렌더의 pageSize를 먼저 알아야 한다.
  const restored = lastFeedPagePosition?.pageSize === pageSize ? lastFeedPagePosition : null;
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>(
    () => restored?.cursorHistory ?? [undefined],
  );
  const [pageIndex, setPageIndex] = useState(() => restored?.pageIndex ?? 0);

  const [prevPageSize, setPrevPageSize] = useState(pageSize);
  if (pageSize !== prevPageSize) {
    setPrevPageSize(pageSize);
    setCursorHistory([undefined]);
    setPageIndex(0);
  }

  const cursor = cursorHistory[pageIndex];
  const feedQuery = useFeedCollectionsQuery(cursor, pageSize);

  // 다음 마운트가 이어받을 위치를 기록한다. 렌더 중이 아니라 커밋 후에 쓴다 — 위 pageSize 리셋처럼
  // 렌더 중 state가 바뀌는 경로가 있어서, 렌더 중에 쓰면 버려질 값을 기록할 수 있다.
  useEffect(() => {
    lastFeedPagePosition = { cursorHistory, pageIndex, pageSize };
  }, [cursorHistory, pageIndex, pageSize]);

  const emptyShelfLayout: EmptyShelfLayout = {
    columns,
    shelfWidthPx,
    pageSize,
    gridTemplateColumns,
    itemColumnHeight,
    budgetPx,
    cardBoxStyle,
    rowsGap: dims.rowsGap,
    gridGap: dims.gridGap,
    boardHeight: dims.boardHeight,
  };

  if (feedQuery.isPending) {
    return (
      <EmptyShelves
        layout={emptyShelfLayout}
        slotClassName="animate-pulse rounded-lg bg-line-subtle"
      />
    );
  }

  if (feedQuery.isError) {
    return (
      <EmptyShelves
        layout={emptyShelfLayout}
        overlay={
          <ErrorState
            title="추천 목록을 불러오지 못했어요"
            description="잠시 후 다시 시도해 주세요."
          />
        }
      />
    );
  }

  const page = feedQuery.data;
  const items = page.items;
  const canGoPrevious = pageIndex > 0;
  const canGoNext = page.hasNext;

  const handlePrevious = () => {
    if (!canGoPrevious) {
      return;
    }
    setPageIndex((index) => index - 1);
  };

  const handleNext = () => {
    if (!canGoNext) {
      return;
    }
    const nextIndex = pageIndex + 1;
    setCursorHistory((history) =>
      nextIndex < history.length ? history : [...history, page.nextCursor ?? undefined],
    );
    setPageIndex(nextIndex);
  };

  const handleItemClick = (item: FeedCollectionItem) => {
    // position·requestId는 응답 값 그대로 사용한다 — 재계산 금지(api-contract.md Feed 이벤트).
    feedEventQueue.enqueue({
      requestId: page.requestId,
      event: 'CLICK',
      collectionId: item.collectionId,
      placeId: null,
      position: item.position,
    });
    void navigate({
      to: '/collections/$collectionId',
      params: { collectionId: item.collectionId },
      search: { feedRequestId: page.requestId, feedPosition: item.position },
      state: { collectionOverlay: true },
    });
  };

  if (items.length === 0) {
    return (
      <EmptyShelves
        layout={emptyShelfLayout}
        overlay={<p className="text-sm text-ink-gray">아직 추천할 컬렉션이 없습니다</p>}
      />
    );
  }

  // 279 추가 수정: 페이지 이동은 하단 바깥 텍스트 버튼 대신, 목업처럼 좌우 가장자리의 원형 화살표
  // 아이콘 버튼으로 옮겼다.
  // 295 추가 수정(이슈 2): 이 wrapper가 flex-1(남는 세로 공간을 전부 채움)이었을 때는 top-1/2가
  // "본문 전체 높이"의 중앙을 가리켰다 — 카드 그리드 실제 높이(budgetPx로 제한된 자연 높이)가
  // 그보다 짧으면 그리드는 화면 상단에 짧게 보이는데 버튼은 훨씬 아래에 위치해 어긋나 보였다.
  // flex-1/min-h-0를 빼서 이 wrapper가 카드 그리드의 자연 높이만큼만 차지하게 하면, top-1/2가
  // 정확히 "카드 그리드가 실제로 차지하는 높이"의 중앙을 가리키게 된다.
  // 314: 캐비닛이 사라져 버튼이 앉을 안쪽 여백(px-5)이 없어졌다 — 대신 그리드에 좌우
  // FEED_SIDE_GUTTER_PX만큼 padding을 주고(FEED_GRID_CLASS의 px-7) 버튼을 그 gutter에 놓는다.
  // 선반 판은 gutter까지 덮는 full-bleed로 두어 시안처럼 책보다 넓게 깔린다.
  // 328: mx-auto → m-auto. 부모(FeedPage의 flex-1 래퍼)가 flex-col이 되면서 세로 auto 마진이
  // "남는 세로 공간을 위아래로 나눠 갖는다"는 뜻을 갖게 됐다 — 책장이 화면 중앙에 온다. 가로는
  // 기존 mx-auto와 동일하게 동작하고, flex 컨테이너가 아닌 곳에 놓여도 세로 auto는 0으로 풀려
  // 기존 동작 그대로다(FeedPage 주석 참고).
  return (
    <div className="relative m-auto flex flex-col" style={{ width: shelfWidthPx }}>
      <FeedArrowButton direction="left" disabled={!canGoPrevious} onClick={handlePrevious} />
      <FeedArrowButton direction="right" disabled={!canGoNext} onClick={handleNext} />

      {/* maxHeight를 budgetPx 하나만 안전판으로 두고, 실제 높이는 scale이 만드는 자연 높이를 쓴다. */}
      <div style={getRowsScrollStyle(dims.rowsGap, budgetPx)} className={FEED_ROWS_SCROLL_CLASS}>
        {toShelfRows(items, columns, pageSize).map((row, rowIndex) => (
          <div key={rowIndex} className="flex flex-col">
            <div
              style={{ gridTemplateColumns, gridAutoRows: itemColumnHeight, gap: dims.gridGap }}
              className={FEED_GRID_CLASS}
            >
              {row.map((item, indexInRow) =>
                item ? (
                  // 315: 카드 JSX는 CollectionBookCard로 분리했다 — 정보가 표지 안으로 들어가면서
                  // 카드 내부 조판이 길어졌고, 316에서 이 자리를 표지 레이아웃 6종이 대체한다.
                  // 클릭 핸들러·이벤트 큐잉·페이지네이션은 그대로 이 컴포넌트가 갖는다.
                  // 354: key에서 requestId를 뺐다. 이 목록이 어떤 이유로든 다시 받아지면(명시적
                  // invalidate 등) requestId가 바뀌는데, 그게 key에 섞여 있으면 같은 자리에 같은
                  // 책이 있어도 카드가 전부 재마운트돼 표지 <img>까지 다시 그려진다 — 사용자
                  // 눈에는 "책장이 처음부터 다시 로딩되는" 장면이다. 한 페이지 안에서 슬롯을
                  // 식별하는 값은 collectionId + position이면 충분하다(position은 응답 값 그대로).
                  <CollectionBookCard
                    key={`${item.collectionId}-${item.position}`}
                    item={item}
                    widthPx={dims.cardWidth}
                    heightPx={dims.cardHeight}
                    onClick={() => handleItemClick(item)}
                  />
                ) : (
                  // 페이지 크기(pageSize) 미만인 페이지(예: 마지막 페이지)의 남는 슬롯 — 책장
                  // 크기(현재 구간의 columns×rows)는 그대로 두고 빈 선반으로 보여준다.
                  // 314: 다크 배경에서는 점선 테두리가 "빈 자리"로 읽혔지만 밝은 배경에서는 유령
                  // 카드처럼 보인다 — 자리만 차지하는 투명 스페이서로 바꾼다(크기 고정은 그대로).
                  <div
                    key={`empty-${rowIndex}-${indexInRow}`}
                    aria-hidden="true"
                    style={cardBoxStyle}
                  />
                ),
              )}
            </div>

            <ShelfPlank heightPx={dims.boardHeight} />
          </div>
        ))}
      </div>
    </div>
  );
}

interface EmptyShelfLayout {
  columns: number;
  shelfWidthPx: number;
  pageSize: number;
  gridTemplateColumns: string;
  itemColumnHeight: number;
  budgetPx: number;
  cardBoxStyle: { width: number; height: number };
  rowsGap: number;
  gridGap: number;
  boardHeight: number;
}

/**
 * 314: 책이 없어도 선반은 그대로 보여주는 뼈대. 로딩·빈 목록·에러 세 상태가 공유한다.
 * 이전에는 이 세 상태가 캐비닛 안에 문구 한 줄만 띄웠는데, 캐비닛이 사라지면서 그 방식으로는
 * 화면이 통째로 비어 "책장" 자체가 사라진 것처럼 보인다 — 빈 책장도 책장으로 보여야 한다.
 * 슬롯은 toShelfRows(빈 배열)가 만드는 null 자리를 그대로 쓴다(크기 고정은 유지, 카드만 없음).
 * overlay는 선반 위 정중앙에 얹는다. 로딩은 overlay 없이 slotClassName으로 스켈레톤만 칠한다.
 */
function EmptyShelves({
  layout,
  slotClassName,
  overlay,
}: {
  layout: EmptyShelfLayout;
  slotClassName?: string;
  overlay?: ReactNode;
}) {
  return (
    <div className="relative m-auto flex flex-col" style={{ width: layout.shelfWidthPx }}>
      {/* 314: 데이터가 없는 상태에서도 좌우 버튼은 자리에 있어야 한다 — 책장 가구의 일부라, 로딩·빈
          목록·에러에서 사라졌다가 데이터가 오면 나타나면 레이아웃이 흔들린 것처럼 보인다.
          넘길 페이지가 없는 상태이므로 항상 disabled다. */}
      <FeedArrowButton direction="left" disabled onClick={noop} />
      <FeedArrowButton direction="right" disabled onClick={noop} />

      {/* overflow-y-auto는 안전판으로만 남긴다 — maxHeight(budgetPx)를 넘지 않도록 scale이 이미
          역산돼 있으므로 정상 케이스에서는 스크롤이 뜨지 않는다. */}
      <div
        style={getRowsScrollStyle(layout.rowsGap, layout.budgetPx)}
        className={FEED_ROWS_SCROLL_CLASS}
      >
        {toShelfRows([], layout.columns, layout.pageSize).map((row, rowIndex) => (
          <div key={rowIndex} className="flex flex-col">
            <div
              style={{
                gridTemplateColumns: layout.gridTemplateColumns,
                gridAutoRows: layout.itemColumnHeight,
                gap: layout.gridGap,
              }}
              className={FEED_GRID_CLASS}
            >
              {row.map((_, indexInRow) => (
                <div
                  key={indexInRow}
                  aria-hidden="true"
                  style={layout.cardBoxStyle}
                  className={slotClassName}
                />
              ))}
            </div>
            <ShelfPlank heightPx={layout.boardHeight} />
          </div>
        ))}
      </div>
      {overlay && <div className="absolute inset-0 grid place-items-center">{overlay}</div>}
    </div>
  );
}

// 314: 그리드 좌우에 FEED_SIDE_GUTTER_PX(28px = px-7)만큼 여백을 준다 — getFeedGridAreaWidthPx가
// 카드 크기를 역산할 때 빼는 값과 반드시 같아야 한다(JS 상수 ↔ Tailwind 리터럴 수동 동기화).
// 이 여백이 좌우 페이지 버튼의 자리이자, 캐비닛의 border+px-5가 하던 역할을 대신한다.
// 328: getFeedGridAreaWidthPx는 이제 여기에 더해 그림자 번짐 폭(FEED_PLANK_SHADOW_BLEED_PX)도
// 뺀다 — 그쪽은 이 클래스가 아니라 스크롤 박스의 인라인 padding이라, 이 px-7 리터럴 자체는 여전히
// FEED_SIDE_GUTTER_PX 하나와만 짝이다.
// 314: overflow-y-auto는 계산이 어긋나는 극단적 경우에 대비한 안전판인데, 그 때문에 맨 윗줄 카드가
// hover(-translate-y-1.5 = 6px)로 떠오를 때 스크롤 박스 위쪽 경계에 잘렸다. 위쪽에 그 이동량보다
// 조금 더 큰 padding을 두면 떠오른 카드가 padding 영역 안에 머물러 잘리지 않는다.
// 315: 아래쪽에도 같은 이유의 여백이 필요했는데 빠져 있어 맨 아래 선반 판의 그림자가 잘렸다. 이제
// 위아래 padding을 Tailwind 리터럴(pt-2)이 아니라 인라인 style로 준다 — 이 값은 세로 예산에서
// 차감돼야 하는 값이라(getFeedRowsContentBudgetPx) 클래스 문자열과 JS 상수로 이원화하면 반드시
// 어긋난다. shelfCabinetLayout.ts를 단일 소스로 두고 여기서는 읽어 쓰기만 한다.
// 328: 좌우 padding도 같은 이유로 필요하다 — overflow-y-auto는 세로만 스크롤할 뿐 가로도 함께
// 클리핑해서, 스크롤 박스 폭을 꽉 채우는 선반 판의 좌우 그림자(8px)가 그대로 잘려 나갔다.
// 이 폭은 getFeedGridAreaWidthPx가 카드 가로 예산에서 이미 빼고 getFeedShelfWidthPx가 다시
// 더하므로(FEED_PLANK_SHADOW_BLEED_PX 주석), 판 폭도 카드 폭도 이 여백에 침범당하지 않는다.
const FEED_ROWS_SCROLL_CLASS = 'flex flex-col overflow-y-auto';

function getRowsScrollStyle(rowsGapPx: number, budgetPx: number): CSSProperties {
  return {
    gap: rowsGapPx,
    maxHeight: budgetPx,
    paddingTop: FEED_ROWS_PADDING_TOP_PX,
    paddingBottom: FEED_ROWS_PADDING_BOTTOM_PX,
    paddingLeft: FEED_ROWS_PADDING_X_PX,
    paddingRight: FEED_ROWS_PADDING_X_PX,
  };
}

const FEED_GRID_CLASS = 'grid items-start justify-center px-7';

const noop = () => {};

// 314: 다크 캐비닛 위의 반투명 흰 버튼(border-paper-white/20 bg-paper-white/10)은 밝은 배경에서
// 보이지 않는다 — 시안처럼 흰 원형 + 옅은 그림자로 띄운다. left-0/right-0은 FEED_GRID_CLASS의
// px-7 gutter 안쪽이다. 데이터가 있든 없든(EmptyShelves) 같은 컴포넌트를 써서 위치·크기가 어긋나지
// 않게 한다.
function FeedArrowButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'left' | 'right';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'left' ? '이전 페이지' : '다음 페이지'}
      className={`absolute top-1/2 z-10 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-line-card bg-snow-white text-pin-navy shadow-[0_2px_8px_rgba(4,33,66,.12)] transition hover:border-log-mint hover:bg-log-mint hover:text-white disabled:pointer-events-none disabled:opacity-40 ${
        direction === 'left' ? 'left-0' : 'right-0'
      }`}
    >
      <ChevronIcon direction={direction} />
    </button>
  );
}

// LibraryPage.tsx의 동일한 화살표 아이콘과 같은 형태(24x24 viewBox, currentColor stroke)를 쓴다.
function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      {direction === 'left' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );
}
