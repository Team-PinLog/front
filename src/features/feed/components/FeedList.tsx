import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ErrorState } from '@/shared/ui/ErrorState';
import { formatDate } from '@/shared/lib/formatDate';
import { getCollectionAccentColor } from '@/shared/lib/getCollectionAccentColor';
import {
  decideFeedRows,
  FEED_COLUMNS_BY_KEY,
  getFeedColumnsKey,
  getFeedCardDimensions,
  getFeedDynamicBudgetPx,
  getFeedGridAreaWidthPx,
  SHELF_SCROLL_MAX_H_PX,
  SIDEBAR_WIDTH_PX,
  solveFeedScale,
} from '@/shared/lib/shelfCabinetLayout';
import {
  useIsLandscapeOrientation,
  useShelfWidthTier,
  useViewportSize,
} from '@/shared/lib/useShelfBreakpoint';
import { useLayoutMetrics } from '@/shared/lib/LayoutMetricsContext';
import { ShelfCabinet } from '@/shared/ui/Shelf';
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
// 역산한다(solveFeedScale) — "화면을 거의 가득 채우도록" 조정하되 카드/배지/gap/보드가 서로 다른
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
 * 295 반응형 재설계(요구사항 A/E, 추가 수정 이슈 1/2/3): 좌우 버튼 페이지네이션 방식이라 캐비닛
 * 내부에 별도 스크롤이 있으면 안 된다 — 열 수는 breakpoint별 고정 표, 카드 크기는 3:4 비율 +
 * 동적 예산 기반 scale로 매 렌더 다시 계산한다(overflow-y-auto는 계산이 어긋나는 극단적 경우에
 * 대비한 안전판으로만 남긴다). 캐비닛 셸도 Library와 동일한 ShelfCabinet(shared/ui/Shelf.tsx)을
 * 재사용해 "추천 도서" 헤더바를 얹는다.
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

  // xl은 기존 고정 예산(590)을 그대로 쓴다(요구사항 2.4) — sm·mdlg만 실제 뷰포트 높이 기반 동적
  // 예산을 쓴다. 295 추가 수정(이슈 1.1): nav바·타이틀 높이는 더 이상 하드코딩 추정치가 아니라
  // LayoutMetricsContext가 실측해 보고한 값이다(AppLayout.tsx/PageTitle.tsx 참고).
  const budgetPx =
    tier === 'xl'
      ? SHELF_SCROLL_MAX_H_PX
      : getFeedDynamicBudgetPx(viewportHeight, { navHeightPx, titleHeightPx });
  // mdlgLandscape·xl은 원래부터 2행 고정(행 수를 낮출 이유가 없다) — mdlgPortrait·sm만 예산에 따라
  // 3행/2행을 동적으로 판단한다(요구사항 1.2).
  const rows =
    tier === 'xl' || columnsKey === 'mdlgLandscape' ? 2 : decideFeedRows(infoHeight, budgetPx);
  const pageSize = columns * rows;
  const gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;

  // 304: xl에서는 좌측 사이드바(SIDEBAR_WIDTH_PX)가 실제 가용 폭을 그만큼 줄인다 — sm·mdlg는
  // 사이드바가 없어 기존과 동일하게 0을 넘긴다.
  const availableGridWidthPx = getFeedGridAreaWidthPx(
    viewportWidth,
    tier === 'xl' ? SIDEBAR_WIDTH_PX : 0,
  );
  const scale = solveFeedScale({
    columns,
    rows,
    infoHeightPx: infoHeight,
    budgetPx,
    availableGridWidthPx,
  });
  const dims = getFeedCardDimensions(scale, infoHeight);
  const cardBoxStyle = { width: dims.cardWidth, height: dims.cardHeight };
  const itemColumnWidthStyle = { width: dims.cardWidth };
  const itemColumnHeight = dims.cardHeight + dims.itemColumnGap + dims.badgeHeight;

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

  if (feedQuery.isPending) {
    return (
      <ShelfCabinet headerTitle="추천 도서">
        {/* overflow-y-auto는 안전판으로만 남긴다 — maxHeight(budgetPx)를 넘지 않도록 scale이 이미
            역산돼 있으므로 정상 케이스에서는 스크롤이 뜨지 않는다. */}
        <div
          style={{ gap: dims.rowsGap, maxHeight: budgetPx }}
          className="flex flex-col overflow-y-auto"
        >
          {toShelfRows([], columns, pageSize).map((row, rowIndex) => (
            <div key={rowIndex} style={{ gap: dims.rowInternalGap }} className="flex flex-col">
              <div
                style={{ gridTemplateColumns, gridAutoRows: itemColumnHeight, gap: dims.gridGap }}
                className="grid items-start justify-items-center"
              >
                {row.map((_, indexInRow) => (
                  <div
                    key={indexInRow}
                    aria-hidden="true"
                    style={cardBoxStyle}
                    className="animate-pulse rounded-lg bg-paper-white/10"
                  />
                ))}
              </div>
              {/* 279 추가 수정: 선반 보드를 Library(shared/ui/Shelf.tsx ShelfBoard)와 동일한
                  나무색 그라디언트로 맞췄다. */}
              <div
                style={{ height: dims.boardHeight }}
                className="rounded-[1px] bg-gradient-to-b from-shelf-wood to-shelf-wood-dark shadow-[0_7px_10px_rgba(0,0,0,.3)]"
              />
            </div>
          ))}
        </div>
      </ShelfCabinet>
    );
  }

  if (feedQuery.isError) {
    return (
      <ShelfCabinet headerTitle="추천 도서">
        <ErrorState
          title="추천 목록을 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
        />
      </ShelfCabinet>
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
      <ShelfCabinet headerTitle="추천 도서">
        <p className="text-sm text-white/50">아직 추천할 컬렉션이 없습니다</p>
      </ShelfCabinet>
    );
  }

  return (
    <ShelfCabinet headerTitle="추천 도서">
      {/* 279 추가 수정: 페이지 이동은 캐비닛 하단 바깥 텍스트 버튼 대신, 목업처럼 캐비닛 내부 좌우
          가장자리의 원형 화살표 아이콘 버튼으로 옮겼다.
          295 추가 수정(이슈 2): 이 wrapper가 flex-1(ShelfCabinet 본문의 남는 세로 공간을 전부
          채움)이었을 때는, top-1/2가 "캐비닛 본문 전체 높이"의 중앙을 가리켰다 — 카드 그리드
          실제 높이(budgetPx로 제한된 자연 높이)가 그보다 짧으면 캐비닛이 화면 상단에 짧게 보이는데
          버튼은 훨씬 아래(뷰포트/캐비닛 전체 중앙)에 위치해 어긋나 보였다. flex-1/min-h-0를 빼서 이
          wrapper가 카드 그리드의 자연 높이만큼만 차지하게 하면, top-1/2가 정확히 "카드 그리드가
          실제로 차지하는 높이"의 중앙을 가리키게 된다(캐비닛이 화면 상단에 짧게 있든 길게 있든). */}
      <div className="relative flex flex-col">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={!canGoPrevious}
          aria-label="이전 페이지"
          className="absolute left-3 top-1/2 z-10 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-paper-white/20 bg-paper-white/10 text-paper-white transition hover:border-log-mint hover:bg-log-mint hover:text-pin-navy disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronIcon direction="left" />
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext}
          aria-label="다음 페이지"
          className="absolute right-3 top-1/2 z-10 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-paper-white/20 bg-paper-white/10 text-paper-white transition hover:border-log-mint hover:bg-log-mint hover:text-pin-navy disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronIcon direction="right" />
        </button>

        {/* maxHeight를 budgetPx 하나만 안전판으로 두고, 실제 높이는 scale이 만드는 자연 높이를 쓴다. */}
        <div
          style={{ gap: dims.rowsGap, maxHeight: budgetPx }}
          className="flex flex-col overflow-y-auto"
        >
          {toShelfRows(items, columns, pageSize).map((row, rowIndex) => (
            <div key={rowIndex} style={{ gap: dims.rowInternalGap }} className="flex flex-col">
              <div
                style={{ gridTemplateColumns, gridAutoRows: itemColumnHeight, gap: dims.gridGap }}
                className="grid items-start justify-items-center"
              >
                {row.map((item, indexInRow) =>
                  item ? (
                    <div
                      key={`${page.requestId}-${item.collectionId}-${item.position}`}
                      style={itemColumnWidthStyle}
                      className="flex flex-col items-center gap-2"
                    >
                      <button
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

                      {/* 배지 값은 서버 응답의 position을 그대로 쓴다 — 프론트에서 재계산·보정하지
                          않는다(api-contract.md Feed 이벤트 원칙). */}
                      <span
                        style={{ height: dims.badgeHeight }}
                        className="inline-flex items-center rounded-full bg-line-subtle px-2.5 text-[10px] font-semibold leading-none text-ink-gray"
                      >
                        {item.position + 1}
                      </span>
                    </div>
                  ) : (
                    // 페이지 크기(pageSize) 미만인 페이지(예: 마지막 페이지)의 남는 슬롯 — 책장
                    // 크기(현재 구간의 columns×rows)는 그대로 두고 빈 선반으로 보여준다.
                    <div
                      key={`empty-${rowIndex}-${indexInRow}`}
                      aria-hidden="true"
                      style={cardBoxStyle}
                      className="rounded-lg border border-dashed border-paper-white/20"
                    />
                  ),
                )}
              </div>

              <div
                style={{ height: dims.boardHeight }}
                className="rounded-[1px] bg-gradient-to-b from-shelf-wood to-shelf-wood-dark shadow-[0_7px_10px_rgba(0,0,0,.3)]"
              />
            </div>
          ))}
        </div>
      </div>
    </ShelfCabinet>
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
