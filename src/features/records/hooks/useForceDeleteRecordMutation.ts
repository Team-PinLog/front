import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { collectionDetailQueryKey } from '@/features/collections/hooks/useCollectionDetailQuery';
import { myCollectionsQueryKey } from '@/features/collections/hooks/useMyCollectionsQuery';
import { forceDeleteRecord } from '../api/forceDeleteRecord';
import { recordDetailQueryKey } from './useRecordDetailQuery';

export interface ForceDeleteRecordVariables {
  recordId: number;
  // 409 응답의 impact.collectionIds 그대로 — 이 Record 삭제로 연쇄 삭제되는 Collection 목록(DeleteConfirmDialog가 전달).
  collectionIds: number[];
}

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// 성공 시 Record 상세 쿼리는 invalidate가 아니라 remove한다 — Record 자체가 삭제되어 재조회하면 404이기 때문이다.
// 연쇄 삭제된 Collection들의 상세 쿼리도 같은 이유로 remove한다(useDeleteCollectionMutation.ts와 동일 패턴).
export function useForceDeleteRecordMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, ForceDeleteRecordVariables>({
    mutationFn: ({ recordId }) => forceDeleteRecord(recordId),
    onSuccess: (_data, { recordId, collectionIds }) => {
      queryClient.removeQueries({ queryKey: recordDetailQueryKey(recordId) });

      if (collectionIds.length > 0) {
        collectionIds.forEach((collectionId) => {
          queryClient.removeQueries({ queryKey: collectionDetailQueryKey(collectionId) });
        });
        queryClient.invalidateQueries({ queryKey: myCollectionsQueryKey });
      }
    },
  });
}
