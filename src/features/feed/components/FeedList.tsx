import { useNavigate } from '@tanstack/react-router';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useFeedCollectionsQuery } from '../hooks/useFeedCollectionsQuery';
import { useFeedEventQueue } from '../hooks/useFeedEventQueue';
import type { FeedCollectionItem } from '../api/getFeedCollections';

interface FeedListItem extends FeedCollectionItem {
  requestId: string;
}

/**
 * Feed(발행된 Collection 추천 목록) 목록. 근거: Jira S15P11A705-142, docs/reference/08_API_명세.md 10.1.
 * IMPRESSION은 서버가 목록 응답 생성 시 자동 기록한다 — 프론트는 CLICK만 큐잉한다.
 * 항목 클릭 시 이벤트를 큐에 쌓고 전송 완료를 기다리지 않고 바로 상세로 이동한다.
 */
export function FeedList() {
  const navigate = useNavigate();
  const feedQuery = useFeedCollectionsQuery();
  const feedEventQueue = useFeedEventQueue();

  if (feedQuery.isPending) {
    return <p className="p-8 text-sm text-ink-gray">불러오는 중…</p>;
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

  const pages = feedQuery.data.pages;
  // requestId는 페이지 단위 필드라 item엔 없다(08_API_명세 10.1) — flatten하면서 각 item에 합쳐 보관한다.
  const items: FeedListItem[] = pages.flatMap((page) =>
    page.items.map((item) => ({ ...item, requestId: page.requestId })),
  );
  const hasNext = pages[pages.length - 1].hasNext;

  if (items.length === 0) {
    return <p className="p-8 text-sm text-ink-gray">아직 추천할 컬렉션이 없습니다</p>;
  }

  const handleItemClick = (item: FeedListItem) => {
    // position·requestId는 응답 값 그대로 사용한다 — 재계산 금지(api-contract.md Feed 이벤트).
    feedEventQueue.enqueue({
      requestId: item.requestId,
      event: 'CLICK',
      collectionId: item.collectionId,
      placeId: null,
      position: item.position,
    });
    void navigate({
      to: '/collections/$collectionId',
      params: { collectionId: item.collectionId },
      search: { feedRequestId: item.requestId, feedPosition: item.position },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        {items.map((item) => (
          <button
            key={`${item.requestId}-${item.collectionId}-${item.position}`}
            type="button"
            onClick={() => handleItemClick(item)}
            className="flex flex-col gap-2 rounded-lg border border-line-card bg-white p-4 text-left"
          >
            <div className="flex items-start justify-between gap-4">
              <p className="text-base font-bold text-pin-navy">{item.title}</p>
              <p className="flex-none text-xs font-semibold text-log-mint">{item.recordCount}개</p>
            </div>

            {item.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-log-mint/10 px-3 py-1.5 text-xs font-bold text-log-mint"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}

            <p className="text-xs text-ink-gray">{item.createdAt}</p>
          </button>
        ))}
      </section>

      {hasNext && (
        <button
          type="button"
          onClick={() => void feedQuery.fetchNextPage()}
          disabled={feedQuery.isFetchingNextPage}
          className="h-11 rounded-lg border border-pin-navy/15 text-sm font-bold text-pin-navy disabled:opacity-40"
        >
          {feedQuery.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
        </button>
      )}
    </div>
  );
}
