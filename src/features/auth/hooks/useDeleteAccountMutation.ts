import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { deleteAccount } from '../api/deleteAccount';

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// 성공 시 캐시를 통째로 비운다 — 다음 사용자 로그인 시 이전 사용자 데이터가 남아있지 않도록.
export function useDeleteAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, void>({
    mutationFn: deleteAccount,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
