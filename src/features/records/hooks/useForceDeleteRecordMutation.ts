import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { forceDeleteRecord } from '../api/forceDeleteRecord';
import { recordDetailQueryKey } from './useRecordDetailQuery';

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// 성공 시 Record 상세 쿼리는 invalidate가 아니라 remove한다 — Record 자체가 삭제되어 재조회하면 404이기 때문이다.
export function useForceDeleteRecordMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, number>({
    mutationFn: forceDeleteRecord,
    onSuccess: (_data, recordId) => {
      queryClient.removeQueries({ queryKey: recordDetailQueryKey(recordId) });
      // TODO(S15P11A705-138): Collection 목록/상세 쿼리 도입 후 impact.collectionIds 대상으로 invalidateQueries 추가.
    },
  });
}
