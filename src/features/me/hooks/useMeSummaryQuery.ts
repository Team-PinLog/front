import { useQuery } from '@tanstack/react-query';
import { getMeSummary } from '../api/getMeSummary';

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
export function useMeSummaryQuery() {
  return useQuery({
    queryKey: ['me', 'summary'],
    queryFn: getMeSummary,
  });
}
