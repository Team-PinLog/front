import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { createFollow, type CreateFollowResponse } from '../api/createFollow';
import { shelfExploreQueryKey } from '@/features/feed/hooks/useShelfExploreQuery';

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
// mutate 인자는 Follow 대상 작성자의 공개 진입점인 collectionId다(privacy-rules.md 2장).
// 성공 시 그 책장 탐색 쿼리(follow.followed/followId)를 invalidate해 버튼 상태를 갱신한다.
export function useFollowMutation() {
  const queryClient = useQueryClient();

  return useMutation<CreateFollowResponse, ApiError, number>({
    mutationFn: createFollow,
    onSuccess: (_data, collectionId) => {
      queryClient.invalidateQueries({ queryKey: shelfExploreQueryKey(collectionId) });
    },
  });
}
