import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { deleteAccount, type WithdrawalStart } from '../api/deleteAccount';

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
//
// 캐시를 여기서 비우지 않는다. 이 요청은 왕복을 시작할 뿐 아직 아무것도 지우지 않으므로,
// 지금 비우면 사용자가 공급자 화면에서 취소하고 돌아왔을 때 멀쩡한 세션의 캐시만 날린 셈이 된다.
// 탈퇴가 확정되면 서버가 인증 쿠키를 만료시키고 전체 페이지 이동이 일어나 캐시는 자연히 사라진다.
export function useDeleteAccountMutation() {
  return useMutation<WithdrawalStart, ApiError, void>({
    mutationFn: deleteAccount,
  });
}
