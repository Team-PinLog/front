import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { deleteCollection } from '../api/deleteCollection';
import { collectionDetailQueryKey } from './useCollectionDetailQuery';

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// 성공 시 상세 쿼리는 invalidate가 아니라 remove한다 — Collection 자체가 삭제되어 재조회하면 404이기 때문이다
// (useForceDeleteRecordMutation.ts와 동일 패턴).
export function useDeleteCollectionMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, number>({
    mutationFn: deleteCollection,
    onSuccess: (_data, collectionId) => {
      queryClient.removeQueries({ queryKey: collectionDetailQueryKey(collectionId) });
      // TODO(S15P11A705-140): 내 Collection 목록 쿼리(GET /collections, 7.2) 도입 후 해당 쿼리 키 invalidateQueries 추가.
    },
  });
}
