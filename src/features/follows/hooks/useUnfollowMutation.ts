import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { deleteFollow } from '../api/deleteFollow';
import { shelfExploreQueryKey } from '@/features/feed/hooks/useShelfExploreQuery';

export interface UnfollowMutationVariables {
  followId: number;
  // 책장 탐색 쿼리를 invalidate하려면 진입점인 sourceCollectionId가 필요하다 — deleteFollow 응답(204,
  // 본문 없음)에는 collectionId가 없으므로 호출부가 함께 넘긴다.
  sourceCollectionId: number;
}

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
export function useUnfollowMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, UnfollowMutationVariables>({
    mutationFn: ({ followId }) => deleteFollow(followId),
    onSuccess: (_data, { sourceCollectionId }) => {
      queryClient.invalidateQueries({ queryKey: shelfExploreQueryKey(sourceCollectionId) });
    },
  });
}
