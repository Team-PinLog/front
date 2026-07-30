import { useInfiniteQuery } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import {
  getFollowShelfCollections,
  type FollowShelfCollectionsPage,
} from '../api/getFollowShelfCollections';

// followId별로 독립된 쿼리 인스턴스 — 이 커서는 "책장별 Collection" 커서다. 팔로우 목록 커서
// (useFollowsQuery)·Record 커서와 절대 혼용하지 않는다.
export function followShelfCollectionsQueryKey(followId: number) {
  return ['follows', followId, 'collections'] as const;
}

const PAGE_SIZE = 6;

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
export function useFollowShelfCollectionsQuery(followId: number) {
  return useInfiniteQuery<FollowShelfCollectionsPage, ApiError>({
    queryKey: followShelfCollectionsQueryKey(followId),
    queryFn: ({ pageParam }) =>
      getFollowShelfCollections(followId, {
        cursor: pageParam as string | undefined,
        size: PAGE_SIZE,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? (lastPage.nextCursor ?? undefined) : undefined,
  });
}
