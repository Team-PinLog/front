import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { useDeleteConfirm } from '@/contexts/useDeleteConfirm';
import { collectionDetailQueryKeyPrefix } from '@/features/collections/hooks/useCollectionDetailQuery';
import { deleteRecordContext } from '../api/deleteRecordContext';
import { recordDetailQueryKey } from './useRecordDetailQuery';

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
// 마지막 Context 삭제 시도(409 DELETE_CONFIRMATION_REQUIRED)는 여기서 확인 모달을 연다(impact는 서버 응답 그대로 전달).
// 그 외 에러는 rethrow하지 않는다 — mutation.error에 담겨 호출부가 일반 에러로 표시한다(addRecordContext와 동일 패턴).
export function useDeleteContextMutation(recordId: number) {
  const queryClient = useQueryClient();
  const deleteConfirm = useDeleteConfirm();

  return useMutation<void, ApiError, number>({
    mutationFn: (contextId) => deleteRecordContext({ recordId, contextId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recordDetailQueryKey(recordId) });
      // useUpdateContextMutation과 동일한 이유로 Collection 상세 캐시도 접두사로 함께 무효화한다
      // (이 Context를 보여주는 Collection이 무엇인지 이 훅은 모른다 — 위 파일 주석 참고).
      queryClient.invalidateQueries({ queryKey: collectionDetailQueryKeyPrefix() });
    },
    onError: (error, contextId) => {
      if (error.code === 'DELETE_CONFIRMATION_REQUIRED' && error.impact) {
        deleteConfirm.open(contextId, error.impact);
      }
    },
  });
}
