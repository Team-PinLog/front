import { z } from 'zod';
import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 4.2 내 Record 지도.
 * bbox 없이 호출하면 내 전체 활성 Record 마커를 반환한다. bounds는 결과 없으면 null이다.
 */
const recordMapBoundsSchema = z.object({
  swLat: z.number(),
  swLng: z.number(),
  neLat: z.number(),
  neLng: z.number(),
});

export type RecordMapBbox = z.infer<typeof recordMapBoundsSchema>;

const recordMapItemSchema = z.object({
  recordId: z.number(),
  placeId: z.number(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  // 마커 색상을 collectionId 단위로 통일하기 위해 추가(S15P11A705-307,
  // docs/api-contract.md "[확정] 지도 마커 조회 응답에 collectionId 추가"). 백엔드 확정 타입은
  // number(문자열 아님). 배포 시점이 프론트보다 늦을 수 있어 optional로 받는다 — 필드가 없거나
  // 명시적으로 null이면 getRecordMarkerColor가 "미분류"로 취급한다.
  collectionId: z.coerce.number().nullable().optional(),
});

export type RecordMapItem = z.infer<typeof recordMapItemSchema>;

const recordMapMarkersSchema = z.object({
  bounds: recordMapBoundsSchema.nullable(),
  items: z.array(recordMapItemSchema),
});

export type RecordMapMarkers = z.infer<typeof recordMapMarkersSchema>;

export async function getRecordMapMarkers(bbox?: RecordMapBbox): Promise<RecordMapMarkers> {
  const { data } = await httpClient.get('/records/map', { params: bbox });
  return recordMapMarkersSchema.parse(data);
}
