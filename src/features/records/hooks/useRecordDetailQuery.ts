import { useQuery } from '@tanstack/react-query';
import { getRecordDetail } from '../api/getRecordDetail';

export function recordDetailQueryKey(recordId: number) {
  return ['records', 'detail', recordId] as const;
}

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
export function useRecordDetailQuery(recordId: number) {
  return useQuery({
    queryKey: recordDetailQueryKey(recordId),
    queryFn: () => getRecordDetail(recordId),
  });
}
