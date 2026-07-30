import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { getRecordMapMarkers, type RecordMapMarkers } from '../api/getRecordMapMarkers';

export function myRecordListQueryKey() {
  return ['records', 'map', 'list'] as const;
}

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// 167(새 컬렉션 모달) 전용: 지도 렌더링(150)과 무관하게 bbox 없이 내 전체 Record 목록만 조회한다.
// useRecordMapMarkersQuery는 bboxRef·refetchWithBbox 등 지도 상호작용에 얽혀 있어 재사용하지 않고 분리했다.
export function useMyRecordListQuery(enabled: boolean) {
  return useQuery<RecordMapMarkers, ApiError>({
    queryKey: myRecordListQueryKey(),
    queryFn: () => getRecordMapMarkers(),
    enabled,
  });
}
