import { useInfiniteQuery } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { getFeedCollections, type FeedCollectionsPage } from '../api/getFeedCollections';

export const feedCollectionsQueryKey = ['feed', 'collections'] as const;

const PAGE_SIZE = 20;

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
// requestId는 페이지 단위 필드라 여기서는 그대로 페이지에 둔다 — item에 합치는 건 소비처(FeedList)가
// flatten할 때 처리한다(item 자체엔 requestId가 없다, 08_API_명세 10.1).
export function useFeedCollectionsQuery() {
  return useInfiniteQuery<FeedCollectionsPage, ApiError>({
    queryKey: feedCollectionsQueryKey,
    queryFn: ({ pageParam }) =>
      getFeedCollections({ cursor: pageParam as string | undefined, size: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? (lastPage.nextCursor ?? undefined) : undefined,
  });
}
