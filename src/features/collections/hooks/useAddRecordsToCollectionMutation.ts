import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { addRecordsToCollection } from '../api/addRecordsToCollection';
import { collectionDetailQueryKey } from './useCollectionDetailQuery';

export interface AddRecordsToCollectionVariables {
  collectionId: number;
  recordIds: number[];
}

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
// 168(Record 저장 시트)에서 여러 Collection에 동시에 담을 때 이 Hook 하나를 재사용해 mutateAsync를
// Promise.allSettled로 병렬 호출한다(호출당 recordIds는 [recordId] 하나) — 개별 성공/실패는 호출부가 판단한다.
// 217(Collection 상세 → 내 Record 다중 선택)은 반대로 recordIds에 여러 개를 담아 한 번만 호출한다.
export function useAddRecordsToCollectionMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, AddRecordsToCollectionVariables>({
    mutationFn: ({ collectionId, recordIds }) =>
      addRecordsToCollection({ collectionId, recordIds }),
    onSuccess: (_data, { collectionId }) => {
      queryClient.invalidateQueries({ queryKey: collectionDetailQueryKey(collectionId) });
    },
  });
}
