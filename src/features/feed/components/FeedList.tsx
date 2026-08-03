import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ErrorState } from '@/shared/ui/ErrorState';
import { formatDate } from '@/shared/lib/formatDate';
import { getCollectionAccentColor } from '@/shared/lib/getCollectionAccentColor';
import { markCollectionOverlayIntent } from '@/features/collections/lib/collectionOverlayIntent';
import { PAGE_SIZE, useFeedCollectionsQuery } from '../hooks/useFeedCollectionsQuery';
import { useFeedEventQueue } from '../hooks/useFeedEventQueue';
import type { FeedCollectionItem } from '../api/getFeedCollections';

// 279: 목업(Team-PinLog/mockup 탐색 페이지)의 책장 레이아웃 — 5열 × 2줄 고정 슬롯.
// PAGE_SIZE(useFeedCollectionsQuery)와 반드시 일치해야 한다.
const SHELF_COLUMNS = 5;

// 279 추가 수정(카드 크기 고정 재작업): aspect-ratio + flex-1 + overflow-hidden 조합에 기대지
// 않는다 — 카드(button)가 grid item이고 grid item의 min-height:auto/min-width:auto 자동 최소 크기
// 계산이 overflow 값에 따라 content 기반으로 잡히면(브라우저/상황에 따라) aspect-ratio·width가
// 지정한 크기를 콘텐츠가 밀어서 넘길 수 있다(2줄 제목 카드가 더 커 보이거나, 제목 길이에 따라
// 좌우 폭이 달라지던 원인). 대신 표지·제목·키워드·메타 각 영역과 카드 전체에 전부 명시적 px
// width/height를 주고, 그 합이 서로 정확히 맞도록 상수로 관리한다 — 어떤 콘텐츠가 들어와도 'auto'
// 계산이 개입할 여지 자체를 없앤다.
//
// 폭 재작업: `width: min(100%, Npx)`은 실제 grid item(카드+배지를 감싸는 wrapper div)이 자체
// 너비가 없는 shrink-to-fit 상태라 "100%"를 확정할 수 없고, 이 경우 브라우저가 percentage 대신
// 자식(특히 장소개수·날짜 줄의 white-space:nowrap 텍스트, truncate가 넘침을 가려줄 뿐 min-content
// 자체는 줄지 않는다)의 min-content 너비로 폴백해 제목·메타 길이에 따라 카드 좌우 폭이 달라지는
// 원인이 됐다. wrapper와 카드 모두에 min()이 아닌 고정 px width를 직접 줘서, width 축도 height
// 축과 동일하게 'auto'/percentage 계산이 전혀 개입하지 못하게 했다(wrapper 쪽엔 overflow-hidden을
// 일부러 넣지 않았다 — 아래 ITEM_COLUMN_WIDTH_STYLE 주석 참고). 반응형은 범위 밖이라(참고: 이번
// 작업 지시) 고정 px 하나로 충분하다.
const CARD_WIDTH_PX = 175;
// 목업 근사 비율(150/210)에서 유도한 값을 고정 px로 굳혔다: 175 * (210/150) = 245.
const CARD_HEIGHT_PX = 245;
const TITLE_HEIGHT_PX = 30; // text-xs(12px) leading-tight(1.25) 2줄 = 15px*2
const KEYWORDS_HEIGHT_PX = 32; // h-8, 2줄 분량 pill
const META_HEIGHT_PX = 14; // 장소개수·날짜 1줄(truncate)
const INFO_GAP_PX = 4; // gap-1, 제목/키워드/메타 사이 2곳
const INFO_PADDING_PX = 8; // p-2
const INFO_HEIGHT_PX =
  INFO_PADDING_PX * 2 + TITLE_HEIGHT_PX + KEYWORDS_HEIGHT_PX + META_HEIGHT_PX + INFO_GAP_PX * 2;
// button은 border(1px×2)가 있어 border-box 기준 콘텐츠 영역이 CARD_HEIGHT_PX보다 2px 작다 —
// 표지 높이에서 그 2px를 미리 빼서 표지+정보 합이 실제 콘텐츠 영역과 정확히 맞도록 한다.
const CARD_BORDER_PX = 2;
const COVER_HEIGHT_PX = CARD_HEIGHT_PX - CARD_BORDER_PX - INFO_HEIGHT_PX;
const CARD_BOX_STYLE = { width: CARD_WIDTH_PX, height: CARD_HEIGHT_PX };

const BADGE_HEIGHT_PX = 16;
const ITEM_COLUMN_GAP_PX = 8; // gap-2, 카드와 배지 사이
// 실제 아이템 칸(카드+gap+배지) 전체 높이 — 그리드 행 높이를 여기 고정해 콘텐츠가 달라져도 행
// 높이가 흔들리지 않게 한다.
const ITEM_COLUMN_HEIGHT_PX = CARD_HEIGHT_PX + ITEM_COLUMN_GAP_PX + BADGE_HEIGHT_PX;
// wrapper(카드+배지)는 자체 너비가 없는 shrink-to-fit 상태라 카드의 `width: min(100%, ...)`에서
// "100%"가 확정되지 않아 콘텐츠 기반 폭으로 흘렀다 — wrapper에 고정 width를 직접 줘서 100%가
// 항상 CARD_WIDTH_PX로 확정되게 한다. overflow-hidden은 일부러 넣지 않았다: wrapper 높이는 이미
// 자식(카드+배지) 높이 합과 정확히 같아 넘칠 일이 없고, 호버 시 카드가 -translate-y로 위로
// 들리는 애니메이션이 overflow-hidden에 잘릴 수 있어서다(호버 리프트는 정상 동작 확인됨 — 건드리지
// 않는다).
const ITEM_COLUMN_WIDTH_STYLE = { width: CARD_WIDTH_PX };

// 슬롯 수(PAGE_SIZE)만큼 채우고 모자란 자리는 null로 채워 5×2 크기를 고정한다 — 마지막 페이지처럼
// 10개 미만일 때도 책장 전체 크기는 그대로 두고 왼쪽부터 채운 뒤 나머지는 빈 선반으로 보여준다.
function toShelfRows(items: FeedCollectionItem[]): (FeedCollectionItem | null)[][] {
  const slots: (FeedCollectionItem | null)[] = Array.from(
    { length: PAGE_SIZE },
    (_, index) => items[index] ?? null,
  );
  const rows: (FeedCollectionItem | null)[][] = [];
  for (let i = 0; i < slots.length; i += SHELF_COLUMNS) {
    rows.push(slots.slice(i, i + SHELF_COLUMNS));
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
 */
export function FeedList() {
  const navigate = useNavigate();
  const feedEventQueue = useFeedEventQueue();
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);

  const cursor = cursorHistory[pageIndex];
  const feedQuery = useFeedCollectionsQuery(cursor);

  if (feedQuery.isPending) {
    return (
      <div className="overflow-hidden rounded-xl bg-pin-navy p-6 shadow-[0_10px_28px_rgba(4,33,66,.35)]">
        <div className="flex flex-col gap-8">
          {toShelfRows([]).map((row, rowIndex) => (
            <div key={rowIndex} className="flex flex-col gap-3">
              <div
                style={{ gridAutoRows: CARD_HEIGHT_PX }}
                className="grid grid-cols-5 items-start justify-items-center gap-6"
              >
                {row.map((_, indexInRow) => (
                  <div
                    key={indexInRow}
                    aria-hidden="true"
                    style={CARD_BOX_STYLE}
                    className="animate-pulse rounded-lg bg-paper-white/10"
                  />
                ))}
              </div>
              {/* 279 추가 수정: 선반 보드를 Library(shared/ui/Shelf.tsx ShelfBoard)와 동일한
                  나무색 그라디언트로 맞췄다 — shelf-wood/shelf-wood-dark 토큰(tailwind.config.js)은
                  이 파일의 기존 임의 hex(#e0b77d/#b9854f)를 그대로 토큰화한 값이다. */}
              <div className="h-2.5 rounded-[1px] bg-gradient-to-b from-shelf-wood to-shelf-wood-dark shadow-[0_7px_10px_rgba(0,0,0,.3)]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (feedQuery.isError) {
    return (
      <div className="p-8">
        <ErrorState
          title="추천 목록을 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
        />
      </div>
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
    return <p className="p-8 text-sm text-ink-gray">아직 추천할 컬렉션이 없습니다</p>;
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-pin-navy p-6 shadow-[0_10px_28px_rgba(4,33,66,.35)]">
      {/* 279 추가 수정: Library(shared/ui/Shelf.tsx)와 시각적으로 통일한 곤색 책장 배경 — 다만
          Shelf.tsx 자체는 토큰이 아닌 임의 hex(#172742 등)라 그대로 재사용하지 않고, 여기서는
          tailwind.config.js 토큰(pin-navy/paper-white)만으로 새로 만든다.
          페이지 이동은 캐비닛 하단 바깥 텍스트 버튼 대신, 목업처럼 캐비닛 내부 좌우 가장자리의
          원형 화살표 아이콘 버튼으로 옮겼다(페이지 숫자 텍스트는 목업에 없어 제거). */}
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

      <div className="flex flex-col gap-8">
        {toShelfRows(items).map((row, rowIndex) => (
          <div key={rowIndex} className="flex flex-col gap-3">
            <div
              style={{ gridAutoRows: ITEM_COLUMN_HEIGHT_PX }}
              className="grid grid-cols-5 items-start justify-items-center gap-6"
            >
              {row.map((item, indexInRow) =>
                item ? (
                  <div
                    key={`${page.requestId}-${item.collectionId}-${item.position}`}
                    style={ITEM_COLUMN_WIDTH_STYLE}
                    className="flex flex-col items-center gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => handleItemClick(item)}
                      style={CARD_BOX_STYLE}
                      className="flex flex-col overflow-hidden rounded-lg border border-line-card bg-white text-left shadow-[0_6px_14px_rgba(4,33,66,.08)] transition duration-150 ease-out hover:-translate-y-1.5 hover:shadow-[0_14px_26px_rgba(4,33,66,.2)]"
                    >
                      {/* 279 추가 수정: aspect-ratio + flex-1 조합은 grid item의 min-height:auto
                          자동 최소 크기 계산에 따라 콘텐츠가 지정 높이를 밀어 넘길 수 있어(2줄
                          제목 카드가 더 커 보이는 원인 후보), 표지에 고정 px 높이(COVER_HEIGHT_PX)를
                          직접 지정하는 방식으로 바꿨다 — 'auto' 계산이 개입할 여지 자체를 없앤다. */}
                      <div
                        aria-hidden="true"
                        style={{
                          height: COVER_HEIGHT_PX,
                          backgroundColor: getCollectionAccentColor(item.collectionId),
                        }}
                      />
                      <div
                        style={{
                          height: INFO_HEIGHT_PX,
                          padding: INFO_PADDING_PX,
                          gap: INFO_GAP_PX,
                        }}
                        className="flex flex-col overflow-hidden"
                      >
                        {/* 279 추가 수정: line-clamp-2는 overflow:hidden을 포함하지만 "최대 2줄까지"만
                            보장할 뿐, 1줄짜리 짧은 제목이면 <p> 자체가 1줄 높이로만 찬다. 그래서
                            명시적 height(TITLE_HEIGHT_PX)를 함께 줘 1줄이든 2줄이든 항상 동일한
                            높이를 점유하게 했다. Collection 제목은 최대 20자로 확정돼 있어(도메인
                            확정 사실) line-clamp-2는 그 상한을 넘는 극단적 케이스의 안전장치로 남긴다. */}
                        <p
                          style={{ height: TITLE_HEIGHT_PX }}
                          className="line-clamp-2 overflow-hidden text-xs font-bold leading-tight text-pin-navy"
                        >
                          {item.title}
                        </p>

                        {/* keywords는 API가 최대 4개로 내려주므로 slice하지 않는다 — 명시적
                            height(KEYWORDS_HEIGHT_PX, 2줄 분량)로 키워드 0~4개 어느 쪽이든 높이가
                            흔들리지 않게 한다. */}
                        <div
                          style={{ height: KEYWORDS_HEIGHT_PX }}
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

                        {/* 장소개수·날짜를 한 줄로 합치고(데이터는 그대로, 배치만 압축) 명시적
                            height(META_HEIGHT_PX)를 줘 폰트 렌더링 차이로도 흔들리지 않게 한다. */}
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
                        않는다(api-contract.md Feed 이벤트 원칙). 명시적 height(BADGE_HEIGHT_PX)로
                        그리드 행 높이(ITEM_COLUMN_HEIGHT_PX) 계산과 실제 렌더링이 어긋나지 않게 한다. */}
                    <span
                      style={{ height: BADGE_HEIGHT_PX }}
                      className="inline-flex items-center rounded-full bg-line-subtle px-2.5 text-[10px] font-semibold leading-none text-ink-gray"
                    >
                      {item.position + 1}
                    </span>
                  </div>
                ) : (
                  // 10개 미만인 페이지(예: 마지막 페이지)의 남는 슬롯 — 책장 크기(5×2)는 그대로
                  // 두고 빈 선반으로 보여준다.
                  <div
                    key={`empty-${rowIndex}-${indexInRow}`}
                    aria-hidden="true"
                    style={CARD_BOX_STYLE}
                    className="rounded-lg border border-dashed border-paper-white/20"
                  />
                ),
              )}
            </div>

            {/* 279 추가 수정: 선반 보드를 Library(ShelfBoard)와 동일한 나무색 그라디언트로 맞췄다. */}
            <div className="h-2.5 rounded-[1px] bg-gradient-to-b from-shelf-wood to-shelf-wood-dark shadow-[0_7px_10px_rgba(0,0,0,.3)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

// LibraryPage.tsx의 동일한 화살표 아이콘과 같은 형태(24x24 viewBox, currentColor stroke)를 쓴다 —
// 버튼의 text-* 토큰 색을 그대로 물려받도록 색을 하드코딩하지 않는다.
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
