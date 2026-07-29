import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { getRecordDetail, type RecordDetail } from '../api/getRecordDetail';

export function recordDetailQueryKey(recordId: number) {
  return ['records', 'detail', recordId] as const;
}

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다(useCreateRecordMutation.ts와 동일 패턴).
export function useRecordDetailQuery(recordId: number) {
  return useQuery<RecordDetail, ApiError>({
    queryKey: recordDetailQueryKey(recordId),
    queryFn: () => getRecordDetail(recordId),
  });
}
