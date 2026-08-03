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
      <div className="overflow-hidden rounded-xl border border-line-card bg-paper-white p-6 shadow-[0_10px_24px_rgba(4,33,66,.08)]">
        <div className="flex flex-col gap-6">
          {toShelfRows([]).map((row, rowIndex) => (
            <div key={rowIndex} className="flex flex-col gap-3">
              <div className="grid grid-cols-5 gap-4">
                {row.map((_, indexInRow) => (
                  <div
                    key={indexInRow}
                    aria-hidden="true"
                    className="aspect-square w-full animate-pulse rounded-lg bg-line-subtle"
                  />
                ))}
              </div>
              <div className="h-2 rounded-full bg-line-subtle" />
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
    <div className="flex flex-col gap-6">
      {/* 279: 목업(탐색 페이지)의 책장 레이아웃 — 5열×2줄 고정 슬롯, 줄마다 선반 구분선(h-2 bar). */}
      <div className="overflow-hidden rounded-xl border border-line-card bg-paper-white p-6 shadow-[0_10px_24px_rgba(4,33,66,.08)]">
        <div className="flex flex-col gap-6">
          {toShelfRows(items).map((row, rowIndex) => (
            <div key={rowIndex} className="flex flex-col gap-3">
              <div className="grid grid-cols-5 gap-4">
                {row.map((item, indexInRow) =>
                  item ? (
                    <button
                      key={`${page.requestId}-${item.collectionId}-${item.position}`}
                      type="button"
                      onClick={() => handleItemClick(item)}
                      className="flex w-full flex-col overflow-hidden rounded-lg border border-line-card bg-white text-left shadow-[0_6px_14px_rgba(4,33,66,.08)] transition-transform hover:-translate-y-1"
                    >
                      <div
                        aria-hidden="true"
                        className="aspect-square w-full"
                        style={{ backgroundColor: getCollectionAccentColor(item.collectionId) }}
                      />
                      <div className="flex flex-col gap-1.5 p-3">
                        <p className="line-clamp-2 text-sm font-bold leading-snug text-pin-navy">
                          {item.title}
                        </p>

                        {/* keywords는 API가 최대 4개로 내려주므로 slice하지 않는다 — h-11(2줄
                            분량)로 컨테이너 높이만 고정해 키워드 0~4개 어느 쪽이든 카드 높이가
                            흔들리지 않게 한다. */}
                        <div className="flex h-11 flex-wrap content-start gap-1 overflow-hidden">
                          {item.keywords.map((keyword) => (
                            <span
                              key={keyword}
                              className="h-fit rounded-full bg-log-mint/10 px-2 py-0.5 text-[10px] font-bold text-log-mint"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>

                        <p className="text-[10px] font-semibold text-log-mint">
                          {item.recordCount}개 장소
                        </p>
                        <p className="text-[10px] text-ink-gray-light">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                    </button>
                  ) : (
                    // 10개 미만인 페이지(예: 마지막 페이지)의 남는 슬롯 — 책장 크기(5×2)는 그대로
                    // 두고 빈 선반으로 보여준다.
                    <div
                      key={`empty-${rowIndex}-${indexInRow}`}
                      aria-hidden="true"
                      className="aspect-square w-full rounded-lg border border-dashed border-line-card"
                    />
                  ),
                )}
              </div>

              <div className="h-2 rounded-full bg-line-subtle" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={!canGoPrevious}
          className="h-10 rounded-lg border border-pin-navy/15 px-4 text-sm font-bold text-pin-navy disabled:opacity-40"
        >
          ‹ 이전
        </button>
        <p className="text-xs font-semibold text-ink-gray">{pageIndex + 1}페이지</p>
        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext}
          className="h-10 rounded-lg border border-pin-navy/15 px-4 text-sm font-bold text-pin-navy disabled:opacity-40"
        >
          다음 ›
        </button>
      </div>
    </div>
  );
}
