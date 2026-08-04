import { z } from 'zod';
import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 5.2, 11.1 RecordDetail.
 * 봉투({ success, data })는 httpClient 인터셉터가 벗긴다. 여기서는 언랩된 data만 파싱한다.
 */
// thumbnailUrl은 4:3 장소 대표 이미지다. 없으면 null이며 서버가 필드를 생략하지 않는다(11.1).
// 다만 back PR #184가 오늘 머지된 직후라 배포 시점이 프론트보다 늦을 수 있어 optional로 받는다.
// 표시 측은 null·로드 실패 양쪽 모두 기본 이미지로 폴백한다(docs/api-contract.md DTO — PlaceSummary).
const placeSummarySchema = z.object({
  placeId: z.number(),
  name: z.string(),
  address: z.string(),
  thumbnailUrl: z.string().nullable().optional(),
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
