import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { addRecordsToCollection } from '../api/addRecordsToCollection';
import { collectionDetailQueryKey } from './useCollectionDetailQuery';

export interface AddRecordsToCollectionVariables {
  collectionId: number;
  recordId: number;
}

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
// 168(Record 저장 시트)에서 여러 Collection에 동시에 담을 때 이 Hook 하나를 재사용해 mutateAsync를
// Promise.allSettled로 병렬 호출한다 — 개별 성공/실패는 호출부가 판단한다.
export function useAddRecordsToCollectionMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, AddRecordsToCollectionVariables>({
    mutationFn: ({ collectionId, recordId }) =>
      addRecordsToCollection({ collectionId, recordIds: [recordId] }),
    onSuccess: (_data, { collectionId }) => {
      queryClient.invalidateQueries({ queryKey: collectionDetailQueryKey(collectionId) });
    },
  });
}
