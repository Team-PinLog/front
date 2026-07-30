import { z } from 'zod';
import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 6.1 AI 자연어 검색.
 * 봉투({ success, data })는 httpClient 인터셉터가 벗긴다. 여기서는 언랩된 data만 파싱한다.
 */
const SEARCH_RESULT_SIZE = 20;

const searchPlaceSchema = z.object({
  placeId: z.number(),
  name: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
});

const searchMatchedContextSchema = z.object({
  contextId: z.number(),
  body: z.string(),
  createdAt: z.string(),
});

// similarity는 정렬 근거·디버깅용으로 항상 반환되지만 UI에는 노출하지 않는다(08_API_명세 6.1).
// keywords: []는 AI 미완료 상태의 정상 응답이다(architecture.md 5장) — 오류로 처리하지 않는다.
const searchResultItemSchema = z.object({
  recordId: z.number(),
  similarity: z.number(),
  place: searchPlaceSchema,
  matchedContext: searchMatchedContextSchema,
  keywords: z.array(z.string()),
  createdAt: z.string(),
});

// bounds는 지도 통합 범위 밖이라 이번 티켓에서는 사용하지 않지만 응답 파싱에는 포함한다.
const searchRecordsResponseSchema = z.object({
  bounds: z
    .object({
      swLat: z.number(),
      swLng: z.number(),
      neLat: z.number(),
      neLng: z.number(),
    })
    .nullable(),
  items: z.array(searchResultItemSchema),
});

export type SearchResultItem = z.infer<typeof searchResultItemSchema>;
export type SearchRecordsResponse = z.infer<typeof searchRecordsResponseSchema>;

export async function searchRecords(query: string): Promise<SearchRecordsResponse> {
  const { data } = await httpClient.post('/search/records', {
    query,
    size: SEARCH_RESULT_SIZE,
  });
  return searchRecordsResponseSchema.parse(data);
}
