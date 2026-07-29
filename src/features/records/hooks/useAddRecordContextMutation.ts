import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { addRecordContext, type AddRecordContextResponse } from '../api/addRecordContext';
import { recordDetailQueryKey } from './useRecordDetailQuery';

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
// 성공 후에는 Record 상세 쿼리를 무효화해 최신 contexts·keywords로 다시 채운다(AI 파생 keywords는 비동기라 직접 병합하지 않는다).
export function useAddRecordContextMutation(recordId: number) {
  const queryClient = useQueryClient();

  return useMutation<AddRecordContextResponse, ApiError, string>({
    mutationFn: (body) => addRecordContext({ recordId, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recordDetailQueryKey(recordId) });
    },
  });
}
