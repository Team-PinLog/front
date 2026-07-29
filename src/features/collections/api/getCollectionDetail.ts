import { z } from 'zod';
import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 7.3 Collection 상세 통합 조회.
 * 봉투({ success, data })는 httpClient 인터셉터가 벗긴다. 여기서는 언랩된 data만 파싱한다.
 * Feed·타인 Shelf·직접 진입 공통 DTO라, 소유자 조회와 타인(공개) 조회가 같은 스키마를 공유한다.
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

const followSummarySchema = z.object({
  followed: z.boolean(),
  followId: z.number().nullable(),
  alias: z.string().nullable(),
});

// contexts는 ownedByMe: true일 때만 배열이고, 타인(공개) 조회는 null이다(privacy-rules.md 1장 — Context 원문 비공개).
// keywords: []는 AI 미완료 상태의 정상 응답이다(architecture.md 5장) — 오류로 처리하지 않는다.
const collectionRecordItemSchema = z.object({
  recordId: z.number(),
  place: placeSummarySchema,
  contexts: z.array(contextDetailSchema).nullable(),
  keywords: z.array(z.string()),
  createdAt: z.string(),
  addedToCollectionAt: z.string(),
});

// follow는 ownedByMe: true(본인 Collection)면 null이다.
const collectionDetailSchema = z.object({
  collectionId: z.number(),
  title: z.string(),
  ownedByMe: z.boolean(),
  follow: followSummarySchema.nullable(),
  records: z.object({
    items: z.array(collectionRecordItemSchema),
    nextCursor: z.string().nullable(),
    hasNext: z.boolean(),
  }),
  publishedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CollectionDetail = z.infer<typeof collectionDetailSchema>;

export interface GetCollectionDetailParams {
  recordCursor?: string;
  recordSize?: number;
}

export async function getCollectionDetail(
  collectionId: number,
  params?: GetCollectionDetailParams,
): Promise<CollectionDetail> {
  const { data } = await httpClient.get(`/collections/${collectionId}`, { params });
  return collectionDetailSchema.parse(data);
}
