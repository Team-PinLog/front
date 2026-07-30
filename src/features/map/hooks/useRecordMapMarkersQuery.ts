import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import {
  getRecordMapMarkers,
  type RecordMapBbox,
  type RecordMapMarkers,
} from '../api/getRecordMapMarkers';

export function recordMapMarkersQueryKey() {
  return ['records', 'map'] as const;
}

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// queryKey는 bbox와 무관하게 고정한다 — bbox별로 캐시를 나누지 않고, 최신 조회 결과 하나만 유지한다.
// 최초 마운트 시 bboxRef가 비어 있어 bbox 없이(전체 마커) 1회 자동 조회된다.
// "이 지역에서 재검색" 클릭 시 refetchWithBbox로 최신 bbox를 반영해 다시 조회한다.
export function useRecordMapMarkersQuery() {
  const bboxRef = useRef<RecordMapBbox | undefined>(undefined);

  const query = useQuery<RecordMapMarkers, ApiError>({
    queryKey: recordMapMarkersQueryKey(),
    queryFn: () => getRecordMapMarkers(bboxRef.current),
  });

  function refetchWithBbox(bbox: RecordMapBbox) {
    bboxRef.current = bbox;
    return query.refetch();
  }

  return { ...query, refetchWithBbox };
}
