import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { getRecordMapMarkers, type RecordMapMarkers } from '../api/getRecordMapMarkers';

export function recordMapMarkersQueryKey() {
  return ['records', 'map'] as const;
}

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// 이 화면은 항상 내 활성 Record 전체 마커를 보여준다 — bbox 재조회("이 지역에서 재검색") UX는
// S15P11A705-307에서 제거했다(지도가 배경 레이어로 항상 떠 있는 구조로 바뀌면서 불필요해짐).
// bbox 없이 마운트 시 1회만 조회한다.
export function useRecordMapMarkersQuery() {
  return useQuery<RecordMapMarkers, ApiError>({
    queryKey: recordMapMarkersQueryKey(),
    queryFn: () => getRecordMapMarkers(),
    // 401 refresh 실패 시 전역 retry:1 상속으로 인한 재요청 루프를 막는다(S15P11A705-256).
    retry: false,
  });
}
