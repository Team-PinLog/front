import { z } from 'zod';
import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 7.2 내 Collection 목록, 9.1 "내 책장: GET /collections".
 * 봉투({ success, data })는 httpClient 인터셉터가 벗긴다. 여기서는 언랩된 data만 파싱한다.
 *
 * CollectionSummary는 08_API_명세에 완전한 응답 예시가 없다 — CollectionDetail(11.3)과 Feed 목록 아이템(10.1)
 * 필드를 근거로 추정한 스키마다(Jira S15P11A705-141). 실제 응답이 다르면 이 스키마만 조정하면 된다.
 */
const collectionSummarySchema = z.object({
  collectionId: z.number(),
  title: z.string(),
  recordCount: z.number(),
  createdAt: z.string(),
});

export type CollectionSummary = z.infer<typeof collectionSummarySchema>;

const myCollectionsPageSchema = z.object({
  items: z.array(collectionSummarySchema),
  nextCursor: z.string().nullable(),
  hasNext: z.boolean(),
});

export type MyCollectionsPage = z.infer<typeof myCollectionsPageSchema>;

export interface GetMyCollectionsParams {
  cursor?: string;
  size?: number;
}

export async function getMyCollections(
  params?: GetMyCollectionsParams,
): Promise<MyCollectionsPage> {
  const { data } = await httpClient.get('/collections', { params });
  return myCollectionsPageSchema.parse(data);
}
