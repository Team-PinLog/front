import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { useCollectionDeleteConfirm } from '@/contexts/useCollectionDeleteConfirm';
import { removeRecordFromCollection } from '../api/removeRecordFromCollection';
import { collectionDetailQueryKey } from './useCollectionDetailQuery';

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
// 마지막 Record 제거 시도(409 DELETE_CONFIRMATION_REQUIRED)는 여기서 확인 모달을 연다. impact는 07/08 문서상
// 이 케이스에 명시되어 있지 않아 서버 응답에 있으면 쓰고 없어도 open은 그대로 호출한다(trigger만으로 문구를 정한다).
// 그 외 에러는 rethrow하지 않는다 — mutation.error에 담겨 호출부(RecordRemoveButton)가 일반 에러로 표시한다
// (useDeleteContextMutation.ts와 동일 패턴).
export function useRemoveRecordFromCollectionMutation(collectionId: number) {
  const queryClient = useQueryClient();
  const deleteConfirm = useCollectionDeleteConfirm();

  return useMutation<void, ApiError, number>({
    mutationFn: (recordId) => removeRecordFromCollection({ collectionId, recordId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionDetailQueryKey(collectionId) });
    },
    onError: (error) => {
      if (error.code === 'DELETE_CONFIRMATION_REQUIRED') {
        deleteConfirm.open('lastRecordRemoval');
      }
    },
  });
}
