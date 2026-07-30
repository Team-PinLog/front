import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logout } from '../lib/logout';

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. logout()은 이미 요청 실패와 무관하게 /login으로
// 이동하는 흐름 함수라(logout.ts) 여기서는 감싸기만 하고, onSettled에서 캐시만 정리한다.
// 08_API_명세 3.4: 이미 로그아웃된 상태도 204라 사실상 실패 케이스가 거의 없지만, 방어적으로
// onError가 아닌 onSettled를 써서 성공/실패 모두 캐시를 비운다.
export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear();
    },
  });
}
