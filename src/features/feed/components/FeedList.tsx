import { useState, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ErrorState } from '@/shared/ui/ErrorState';
import { formatDate } from '@/shared/lib/formatDate';
import { getCollectionAccentColor } from '@/shared/lib/getCollectionAccentColor';
import {
  decideFeedRows,
  FEED_COLUMNS_BY_KEY,
  FEED_MAX_ROWS_BY_KEY,
  getFeedColumnsKey,
  getFeedCardDimensions,
  getFeedDynamicBudgetPx,
  getFeedGridAreaWidthPx,
  getFeedShelfWidthPx,
  SIDEBAR_WIDTH_PX,
  solveFeedScale,
} from '@/shared/lib/shelfCabinetLayout';
import {
  useIsLandscapeOrientation,
  useShelfWidthTier,
  useViewportSize,
} from '@/shared/lib/useShelfBreakpoint';
import { useLayoutMetrics } from '@/shared/lib/LayoutMetricsContext';
import { markCollectionOverlayIntent } from '@/features/collections/lib/collectionOverlayIntent';
import { useFeedCollectionsQuery } from '../hooks/useFeedCollectionsQuery';
import { useFeedEventQueue } from '../hooks/useFeedEventQueue';
import type { FeedCollectionItem } from '../api/getFeedCollections';

// 279(→287-8→295 이산 배치→295 추가 수정에서 3:4 비율+동적 예산으로 재설계): 목업(Team-PinLog/
// mockup 탐색 페이지)의 책장 레이아웃 — 한 행당 카드 수는 여전히 breakpoint(및 mdlg 구간의
// orientation)별 이산 표(FEED_COLUMNS_BY_KEY)지만, 카드 "크기"는 더 이상 고정 표가 아니다.
//
// 295 추가 수정(이슈 1: 카드 비율): 카드 전체(표지+정보 패널) 가로:세로 비율을 3:4(FEED_CARD_RATIO)로
// 고정한다 — breakpoint/그리드 구성과 무관한 최우선 제약이다. 카드 폭은 항상 `카드 높이 * 3/4`로
// 역산해서 만든다(아래 TITLE/KEYWORDS/META처럼 텍스트 영역은 폭과 무관하게 고정 px이므로, 높이 →
// 폭 방향으로 역산해야 비율이 항상 정확히 맞는다).
// 295 추가 수정(이슈 2: 동적 세로 예산): xl은 기존 고정 SHELF_SCROLL_MAX_H_PX(590)를 그대로 쓰고,
// sm·mdlg는 실제 뷰포트 높이 기반 동적 예산(getFeedDynamicBudgetPx)을 쓴다. 카드 크기(scale)는 이
// 예산과 그리드 가로 폭(getFeedGridAreaWidthPx, 실제 뷰포트 폭 기반) 중 더 빡빡한 쪽에 맞춰 실시간
// 역산한다(solveFeedScale) — "화면을 거의 가득 채우도록" 조정하되 카드/gap/선반 판이 서로 다른
// 비율로 찌그러지지 않도록 전부 같은 scale 하나로 묶는다.
// 295 추가 수정(이슈 1.2: 행 수 하향): mdlgPortrait·sm(원래 3행)은 3행으로는 비율을 지키며 도저히
// 예산 안에 들어올 수 없을 만큼(scale이 FEED_ROWS_FALLBACK_MIN_SCALE 미만) 작아지면 2행(6개)으로
// 낮춘다(decideFeedRows) — 실제 뷰포트 높이에 따라 매 렌더 다시 판단한다(고정 표가 아니다).
// 295 추가 수정(이슈 3: 키워드 자리): 제목-메타 사이에 키워드가 들어갈 자리를 항상 예약한다 —
// sm은 2줄(KEYWORDS_HEIGHT_PX_SM), 그 외 구간은 1줄(KEYWORDS_HEIGHT_PX_DEFAULT). 키워드 데이터가
// 없어도(현재 더미 데이터) 이 높이만큼은 항상 비어있는 채로 유지되어, 실제 키워드가 들어와도
// 레이아웃이 흔들리지 않는다. 이 여유를 만들기 위해 정보 패널 padding/gap도 구간별로 줄였다(sm은
// 특히 더 — 3열 그리드가 320px 폭에서 매우 빡빡해, 정보 패널을 최대한 압축해야 표지가 아예
// 사라지지 않는다).
const TITLE_HEIGHT_PX = 30; // text-xs(12px) leading-tight(1.25) 2줄 = 15px*2, 전 구간 공통 고정
const META_HEIGHT_PX = 14; // 장소개수·날짜 1줄(truncate), 전 구간 공통 고정
const KEYWORDS_HEIGHT_PX_DEFAULT = 16; // 1줄 분량 pill
const KEYWORDS_HEIGHT_PX_SM = 32; // 2줄 분량 pill — sm은 카드 자체가 좁아 키워드가 더 잘 줄바꿈된다
const INFO_PADDING_PX_DEFAULT = 6; // p-1.5
const INFO_PADDING_PX_SM = 2;
const INFO_GAP_PX_DEFAULT = 3;
const INFO_GAP_PX_SM = 1;

function getInfoLayout(isSm: boolean) {
  const keywordsHeight = isSm ? KEYWORDS_HEIGHT_PX_SM : KEYWORDS_HEIGHT_PX_DEFAULT;
  const padding = isSm ? INFO_PADDING_PX_SM : INFO_PADDING_PX_DEFAULT;
  const gap = isSm ? INFO_GAP_PX_SM : INFO_GAP_PX_DEFAULT;
  const infoHeight = padding * 2 + TITLE_HEIGHT_PX + keywordsHeight + META_HEIGHT_PX + gap * 2;
  return { keywordsHeight, padding, gap, infoHeight };
}

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
 * 카드 "안쪽" 구조(표지 + 정보 패널)는 이 티켓에서 건드리지 않는다 — 315의 범위다.
 */
export function FeedList() {
  const navigate = useNavigate();
  const feedEventQueue = useFeedEventQueue();
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);

  const tier = useShelfWidthTier();
  const isLandscape = useIsLandscapeOrientation();
  const { width: viewportWidth, height: viewportHeight } = useViewportSize();
  const { navHeightPx, titleHeightPx } = useLayoutMetrics();

  const columnsKey = getFeedColumnsKey(tier, isLandscape);
  const columns = FEED_COLUMNS_BY_KEY[columnsKey];
  const isSm = tier === 'sm';
  const { keywordsHeight, padding, gap, infoHeight } = getInfoLayout(isSm);

  // 314: 전 구간이 실제 뷰포트 높이 기반 동적 예산을 쓴다 — xl의 고정 590은 "캐비닛 안쪽" 높이라는
  // 뜻이었고 캐비닛이 사라지면서 근거를 잃었다(그대로 두면 책장 아래가 크게 빈다).
  // 295 추가 수정(이슈 1.1): nav바·타이틀 높이는 하드코딩 추정치가 아니라 LayoutMetricsContext가
  // 실측해 보고한 값이다(AppLayout.tsx/PageTitle.tsx 참고).
  const budgetPx = getFeedDynamicBudgetPx(viewportHeight, { navHeightPx, titleHeightPx }, tier);

  // 304: xl에서는 좌측 사이드바(SIDEBAR_WIDTH_PX)가 실제 가용 폭을 그만큼 줄인다 — sm·mdlg는
  // 사이드바가 없어 기존과 동일하게 0을 넘긴다.
  const availableGridWidthPx = getFeedGridAreaWidthPx(
    viewportWidth,
    tier === 'xl' ? SIDEBAR_WIDTH_PX : 0,
  );

  // 314: 행 수도 더 이상 구간별 고정값이 아니다 — 세로 예산과 가로 폭을 둘 다 반영해 화면을 가장
  // 많이 덮는 배치를 고른다(decideFeedRows). 이전에는 xl·mdlgLandscape가 2행 고정이라 세로가 남고,
  // 나머지는 세로만 보고 행을 늘려 가로가 남았다.
  const rows = decideFeedRows({
    columns,
    maxRows: FEED_MAX_ROWS_BY_KEY[columnsKey],
    infoHeightPx: infoHeight,
    budgetPx,
    availableGridWidthPx,
  });
  const pageSize = columns * rows;
  const scale = solveFeedScale({
    columns,
    rows,
    infoHeightPx: infoHeight,
    budgetPx,
    availableGridWidthPx,
  });
  const dims = getFeedCardDimensions(scale, infoHeight);
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
  const [prevPageSize, setPrevPageSize] = useState(pageSize);
  if (pageSize !== prevPageSize) {
    setPrevPageSize(pageSize);
    setCursorHistory([undefined]);
    setPageIndex(0);
  }

  const cursor = cursorHistory[pageIndex];
  const feedQuery = useFeedCollectionsQuery(cursor, pageSize);

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
    markCollectionOverlayIntent();
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
  return (
    <div className="relative mx-auto flex flex-col" style={{ width: shelfWidthPx }}>
      <FeedArrowButton direction="left" disabled={!canGoPrevious} onClick={handlePrevious} />
      <FeedArrowButton direction="right" disabled={!canGoNext} onClick={handleNext} />

      {/* maxHeight를 budgetPx 하나만 안전판으로 두고, 실제 높이는 scale이 만드는 자연 높이를 쓴다. */}
      <div style={{ gap: dims.rowsGap, maxHeight: budgetPx }} className={FEED_ROWS_SCROLL_CLASS}>
        {toShelfRows(items, columns, pageSize).map((row, rowIndex) => (
          <div key={rowIndex} className="flex flex-col">
            <div
              style={{ gridTemplateColumns, gridAutoRows: itemColumnHeight, gap: dims.gridGap }}
              className={FEED_GRID_CLASS}
            >
              {row.map((item, indexInRow) =>
                item ? (
                  <button
                    key={`${page.requestId}-${item.collectionId}-${item.position}`}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    style={cardBoxStyle}
                    className="flex flex-col overflow-hidden rounded-lg border border-line-card bg-white text-left shadow-[0_6px_14px_rgba(4,33,66,.08)] transition duration-150 ease-out hover:-translate-y-1.5 hover:shadow-[0_14px_26px_rgba(4,33,66,.2)]"
                  >
                    {/* 279 추가 수정: 표지에 명시적 높이(dims.coverHeight)를 직접 지정해 'auto'
                            계산이 개입할 여지를 없앤다. */}
                    <div
                      aria-hidden="true"
                      style={{
                        height: dims.coverHeight,
                        backgroundColor: getCollectionAccentColor(item.collectionId),
                      }}
                    />
                    <div
                      style={{ height: infoHeight, padding, gap }}
                      className="flex flex-col overflow-hidden"
                    >
                      {/* 279 추가 수정: line-clamp-2 + 명시적 height(TITLE_HEIGHT_PX)로 1줄이든
                              2줄이든 항상 동일한 높이를 점유하게 한다. */}
                      <p
                        style={{ height: TITLE_HEIGHT_PX }}
                        className="line-clamp-2 overflow-hidden text-xs font-bold leading-tight text-pin-navy"
                      >
                        {item.title}
                      </p>

                      {/* 295 추가 수정(이슈 3): 키워드 자리를 항상 예약한다(sm 2줄/그 외 1줄) —
                              keywords가 빈 배열이어도(현재 더미 데이터) 이 높이만큼은 항상 비워둔다. */}
                      <div
                        style={{ height: keywordsHeight }}
                        className="flex flex-wrap content-start gap-1 overflow-hidden"
                      >
                        {item.keywords.map((keyword) => (
                          <span
                            key={keyword}
                            className="h-fit rounded-full bg-log-mint/10 px-1.5 py-px text-[9px] font-bold leading-[12px] text-log-mint"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>

                      <p
                        style={{ height: META_HEIGHT_PX, lineHeight: `${META_HEIGHT_PX}px` }}
                        className="truncate text-[9px] text-ink-gray-light"
                      >
                        <span className="font-semibold text-log-mint">
                          {item.recordCount}개 장소
                        </span>{' '}
                        · {formatDate(item.createdAt)}
                      </p>
                    </div>
                  </button>
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
    <div className="relative mx-auto flex flex-col" style={{ width: layout.shelfWidthPx }}>
      {/* 314: 데이터가 없는 상태에서도 좌우 버튼은 자리에 있어야 한다 — 책장 가구의 일부라, 로딩·빈
          목록·에러에서 사라졌다가 데이터가 오면 나타나면 레이아웃이 흔들린 것처럼 보인다.
          넘길 페이지가 없는 상태이므로 항상 disabled다. */}
      <FeedArrowButton direction="left" disabled onClick={noop} />
      <FeedArrowButton direction="right" disabled onClick={noop} />

      {/* overflow-y-auto는 안전판으로만 남긴다 — maxHeight(budgetPx)를 넘지 않도록 scale이 이미
          역산돼 있으므로 정상 케이스에서는 스크롤이 뜨지 않는다. */}
      <div
        style={{ gap: layout.rowsGap, maxHeight: layout.budgetPx }}
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
// 314: overflow-y-auto는 계산이 어긋나는 극단적 경우에 대비한 안전판인데, 그 때문에 맨 윗줄 카드가
// hover(-translate-y-1.5 = 6px)로 떠오를 때 스크롤 박스 위쪽 경계에 잘렸다. 위쪽에 그 이동량보다
// 조금 더 큰 padding을 두면 떠오른 카드가 padding 영역 안에 머물러 잘리지 않는다(box-sizing이
// border-box라 maxHeight 안에서 8px을 나눠 쓰는 셈인데, MOBILE_SAFETY_MARGIN_PX와 같은 크기라
// 예산 계산에 새로 반영할 필요는 없다).
const FEED_ROWS_SCROLL_CLASS = 'flex flex-col overflow-y-auto pt-2';

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

// 279 추가 수정: 선반 보드를 Library(shared/ui/Shelf.tsx ShelfBoard)와 동일한 나무색 그라디언트로
// 맞췄다.
// 314: 시안의 선반은 "탄색 얇은 줄"이 아니라 흰 크림빛의 두꺼운 나무 판이다. 세 가지를 바꿨다.
//  (1) 두께 — FEED_SCALE_REF.boardHeight 8 → 22
//  (2) 색 — 밝은 크림 토큰 3단(shelf-wood-light 윗면 → shelf-wood 몸통 → shelf-wood-dark 앞 모서리).
//      단순 2단이면 여전히 평평해 보여서, 윗면 하이라이트를 25%까지 넓게 잡아 판의 윗면이 빛을 받는
//      것처럼 만든다.
//  (3) 입체감 — 모서리를 굴리고(rounded-[4px]), 안쪽 상단에 흰 하이라이트 선을 넣고, 판 아래로
//      떨어지는 그림자를 밝은 배경용 알파로 둔다(다크 배경 전제의 rgba(0,0,0,.3)에서 완화).
//  (4) 나뭇결 — 레퍼런스(밝은 원목 텍스처)의 결은 직선이 아니라 물결치듯 흐르고, 굵기도 제각각이다.
//      repeating-linear-gradient는 아무리 각도를 비틀어도 결국 평행 직선이라 이 느낌이 안 나온다
//      (실제로 넣어보니 나뭇결이 아니라 빗살무늬로 보였다). 그래서 SVG feTurbulence로 노이즈를
//      만들어 쓴다 — baseFrequency의 x를 아주 낮게(0.006), y를 높게(0.13) 주면 노이즈가 가로로 길게
//      늘어나 나뭇결 방향(판의 길이 방향)과 같아지고, numOctaves 4가 굵은 결·잔결을 함께 만든다.
//      feColorMatrix의 알파 행(1 0 0 0 -0.42)은 "빨강 채널 - 0.42"를 알파로 쓴다는 뜻이라, 노이즈
//      값이 낮은 부분은 완전히 투명해지고 높은 부분만 결로 남는다(반투명 안개가 아니라 선명한 결).
//      색은 판 위에 얹는 웜 브라운(0.55/0.45/0.32) 하나뿐이라 시안의 크림 톤은 그대로 유지된다.
//      판 색(토큰 그라디언트)은 className으로 두고 결만 별도 자식으로 분리했다 — 둘 다
//      background-image라 한 요소에 합치면 Tailwind 그라디언트가 덮여버린다.
const PLANK_GRAIN_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="60">',
  '<filter id="g" x="0" y="0" width="100%" height="100%">',
  '<feTurbulence type="fractalNoise" baseFrequency="0.006 0.13" numOctaves="4" seed="17"/>',
  '<feColorMatrix type="matrix" values="0 0 0 0 0.55 0 0 0 0 0.45 0 0 0 0 0.32 1 0 0 0 -0.42"/>',
  '</filter>',
  '<rect width="800" height="60" filter="url(#g)"/>',
  '</svg>',
].join('');

// 800px 주기로 가로 반복한다 — 선반이 그보다 짧으면 반복 자체가 화면에 드러나지 않는다.
const PLANK_GRAIN_IMAGE = `url("data:image/svg+xml,${encodeURIComponent(PLANK_GRAIN_SVG)}")`;

function ShelfPlank({ heightPx }: { heightPx: number }) {
  return (
    <div
      aria-hidden="true"
      style={{ height: heightPx }}
      className="relative overflow-hidden rounded-[4px] bg-gradient-to-b from-shelf-wood-light from-25% via-shelf-wood via-70% to-shelf-wood-dark shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_10px_16px_rgba(4,33,66,.13)]"
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{ backgroundImage: PLANK_GRAIN_IMAGE, backgroundSize: '800px 100%' }}
      />
    </div>
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
