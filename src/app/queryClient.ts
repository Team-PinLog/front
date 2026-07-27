import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 인증 만료(401) 등은 재시도로 해결되지 않으므로 최소 재시도만 둔다.
      retry: 1,
      // 탭 재포커스마다 재요청하지 않는다. 최신성이 중요한 화면은 쿼리별로 override.
      refetchOnWindowFocus: false,
      // 짧은 시간 내 재방문 시 재요청을 막는 기본값. 도메인별 특성에 맞춰 이후 조정.
      staleTime: 30 * 1000,
    },
    mutations: {
      // Mutation은 부작용이 있으므로 자동 재시도하지 않는다.
      retry: 0,
    },
  },
});
