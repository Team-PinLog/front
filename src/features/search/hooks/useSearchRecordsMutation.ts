import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { searchRecords, type SearchRecordsResponse } from '../api/searchRecords';

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
// 검색은 캐시할 목록이 아니라 제출 시점의 1회성 액션이므로 useQuery가 아닌 useMutation을 쓴다.
export function useSearchRecordsMutation() {
  return useMutation<SearchRecordsResponse, ApiError, string>({
    mutationFn: searchRecords,
  });
}
