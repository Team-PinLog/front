import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { getMeActivity, type MeActivity } from '../api/getMeActivity';

/**
 * ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
 * 근거: docs/reference/08_API_명세.md 3.7 — 화면 진입 시 1회 호출이고 파라미터가 없어
 * 쿼리 키도 상수 하나다.
 *
 * ['me', 'summary'](useMeSummaryQuery)와 키를 나눈다. 3.7이 3.5(마이페이지 요약)를 대체하지 않고,
 * 호출 시점·응답 크기가 서로 달라서다 — 한쪽을 무효화할 때 다른 쪽까지 다시 받게 하지 않는다.
 * TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
 */
export const meActivityQueryKey = ['me', 'activity'] as const;

export function useMeActivityQuery() {
  return useQuery<MeActivity, ApiError>({
    queryKey: meActivityQueryKey,
    queryFn: getMeActivity,
  });
}
