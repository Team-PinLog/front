import { useInfiniteQuery } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { getShelfExplore, type ShelfExplorePage } from '../api/getShelfExplore';

export function shelfExploreQueryKey(collectionId: number) {
  return ['feed', 'shelf', collectionId] as const;
}

const PAGE_SIZE = 20;

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
// follow(followed/followId/alias)는 페이지네이션 대상이 아니라 각 페이지가 동일한 스냅샷을 반환한다
// (08_API_명세 8.1) — 최신 상태(Follow/Unfollow 직후)는 첫 페이지 기준으로 쓴다. 호출부(ShelfExploreSection)의 책임.
export function useShelfExploreQuery(collectionId: number) {
  return useInfiniteQuery<ShelfExplorePage, ApiError>({
    queryKey: shelfExploreQueryKey(collectionId),
    queryFn: ({ pageParam }) =>
      getShelfExplore(collectionId, { cursor: pageParam as string | undefined, size: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.collections.hasNext ? (lastPage.collections.nextCursor ?? undefined) : undefined,
  });
}
