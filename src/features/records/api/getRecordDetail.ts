import { z } from 'zod';
import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 5.2, 11.1 RecordDetail.
 * 봉투({ success, data })는 httpClient 인터셉터가 벗긴다. 여기서는 언랩된 data만 파싱한다.
 */
const placeSummarySchema = z.object({
  placeId: z.number(),
  name: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
});

const contextDetailSchema = z.object({
  contextId: z.number(),
  body: z.string(),
  createdAt: z.string(),
});

// contexts는 본인 소유 Record 조회에서만 배열이고 타인 조회는 null이다(11.1 규칙, privacy-rules.md 1장).
// GET /records/{recordId}는 본인 소유 Record만 조회하므로(5.2) 이 화면에서는 항상 배열로 온다.
// keywords: []는 AI 미완료 상태의 정상 응답이다(architecture.md 5장) — 오류로 처리하지 않는다.
const recordDetailSchema = z.object({
  recordId: z.number(),
  place: placeSummarySchema,
  contexts: z.array(contextDetailSchema).nullable(),
  keywords: z.array(z.string()),
  createdAt: z.string(),
  addedToCollectionAt: z.string().optional(),
});

export type RecordDetail = z.infer<typeof recordDetailSchema>;

export async function getRecordDetail(recordId: number): Promise<RecordDetail> {
  const { data } = await httpClient.get(`/records/${recordId}`);
  return recordDetailSchema.parse(data);
}
