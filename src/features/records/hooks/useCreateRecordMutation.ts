import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { recordMapMarkersQueryKey } from '@/features/map/hooks/useRecordMapMarkersQuery';
import { myRecordListQueryKey } from '@/features/map/hooks/useMyRecordListQuery';
import {
  createRecord,
  type CreateRecordRequest,
  type CreateRecordResponse,
} from '../api/createRecord';

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
// 성공 후 지도 마커 쿼리를 무효화한다. result가 CONTEXT_ADDED(기존 장소에 맥락만 추가)인 경우
// recordId가 이미 마커 목록에 있어 setQueryData로 직접 추가하면 중복이 생기므로,
// 낙관적 병합 대신 invalidateQueries로 서버 목록을 다시 조회해 정확성을 우선한다.
export function useCreateRecordMutation() {
  const queryClient = useQueryClient();

  return useMutation<CreateRecordResponse, ApiError, CreateRecordRequest>({
    mutationFn: createRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recordMapMarkersQueryKey() });
      queryClient.invalidateQueries({ queryKey: myRecordListQueryKey() });
    },
  });
}
