import { useInfiniteQuery } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { getFollows, type FollowListPage } from '../api/getFollows';

// Library(144)의 "팔로우 책장" 섹션 이동 단위 쿼리 키. 별칭 수정(useUpdateFollowAliasMutation)·언팔로우
// (useUnfollowMutation)의 onSuccess가 이 키를 invalidate한다 — 변경 시 함께 맞춘다.
export const followsListQueryKey = ['follows', 'list'] as const;

const PAGE_SIZE = 10;

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
// 이 커서는 "팔로우 목록" 커서다 — 책장별 Collection 커서(useFollowShelfCollectionsQuery)와 절대 혼용하지 않는다.
export function useFollowsQuery() {
  return useInfiniteQuery<FollowListPage, ApiError>({
    queryKey: followsListQueryKey,
    queryFn: ({ pageParam }) =>
      getFollows({ cursor: pageParam as string | undefined, size: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? (lastPage.nextCursor ?? undefined) : undefined,
  });
}
