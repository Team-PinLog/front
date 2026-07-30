import { z } from 'zod';
import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 5.1, docs/api-contract.md Record·Context.
 * 봉투({ success, data })는 httpClient 인터셉터가 벗긴다. 여기서는 언랩된 data만 파싱한다.
 */
const recordPlaceSchema = z.object({
  placeId: z.number(),
  name: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
});

const recordContextSchema = z.object({
  contextId: z.number(),
  body: z.string(),
  createdAt: z.string(),
});

// Keyword 등급(code/label)은 MVP 범위 밖 — 현재는 label 문자열 배열이다(api-contract.md Keyword 등급).
// keywords: []는 AI 미완료 상태의 정상 응답이다(architecture.md 5장) — 오류로 처리하지 않는다.
const createRecordResponseSchema = z.object({
  result: z.enum(['RECORD_CREATED', 'CONTEXT_ADDED']),
  recordId: z.number(),
  place: recordPlaceSchema,
  contexts: z.array(recordContextSchema),
  keywords: z.array(z.string()),
  createdAt: z.string(),
});

export type CreateRecordResponse = z.infer<typeof createRecordResponseSchema>;

// KakaoPlace(검색 결과)·PlaceSummary(이미 저장된 Record의 place)를 모두 구조적으로 받아들이기 위한 최소 형태.
// 142 "저장하기"(features/collections/components/RecordSaveButton)가 PlaceSummary로 이 함수를 재사용한다.
export interface CreateRecordPlaceInput {
  kakaoPlaceId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface CreateRecordRequest {
  place: CreateRecordPlaceInput;
  contextBody: string;
}

export async function createRecord({
  place,
  contextBody,
}: CreateRecordRequest): Promise<CreateRecordResponse> {
  const { data } = await httpClient.post('/records', {
    place: {
      kakaoPlaceId: place.kakaoPlaceId,
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
    },
    contextBody,
  });
  return createRecordResponseSchema.parse(data);
}
