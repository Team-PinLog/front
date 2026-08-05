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
  // 318: 표지 이미지 URL. Collection이 실리는 모든 응답에 포함되고 null이어도 생략되지 않는다
  // (docs/api-contract.md § Collection 표지 이미지). null은 표지가 없는 정상 상태이므로 오류로
  // 처리하지 않고 기본 표지로 폴백한다.
  // optional까지 두는 이유: 백엔드 배포가 프론트보다 늦을 수 있다 — 필드가 없다고 파싱이 깨지면
  // 표지와 무관한 목록 전체가 죽는다(thumbnailUrl 선례, getCollectionDetail.ts).
  coverImageUrl: z.string().nullable().optional(),
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
