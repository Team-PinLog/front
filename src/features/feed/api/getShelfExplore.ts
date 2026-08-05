import { z } from 'zod';
import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 8.1 최초 공개 책장 탐색.
 * 봉투({ success, data })는 httpClient 인터셉터가 벗긴다. 여기서는 언랩된 data만 파싱한다.
 * 작성자의 내부 사용자 ID는 응답에 없다(privacy-rules.md 2장) — collectionId가 진입점이다.
 */
// keywords: []는 AI 미완료 상태의 정상 응답이다(architecture.md 5장) — 오류로 처리하지 않는다.
const shelfExploreCollectionItemSchema = z.object({
  collectionId: z.number(),
  title: z.string(),
  recordCount: z.number(),
  keywords: z.array(z.string()),
  // 318: 표지 이미지 URL. Collection이 실리는 모든 응답에 포함되고 null이어도 생략되지 않는다
  // (docs/api-contract.md § Collection 표지 이미지). null은 표지가 없는 정상 상태이므로 오류로
  // 처리하지 않고 기본 표지로 폴백한다.
  // optional까지 두는 이유: 백엔드 배포가 프론트보다 늦을 수 있다 — 필드가 없다고 파싱이 깨지면
  // 표지와 무관한 목록 전체가 죽는다(thumbnailUrl 선례, getCollectionDetail.ts).
  coverImageUrl: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type ShelfExploreCollectionItem = z.infer<typeof shelfExploreCollectionItemSchema>;

const shelfExploreFollowSchema = z.object({
  followed: z.boolean(),
  followId: z.number().nullable(),
  alias: z.string().nullable(),
});

export type ShelfExploreFollow = z.infer<typeof shelfExploreFollowSchema>;

const shelfExplorePageSchema = z.object({
  sourceCollectionId: z.number(),
  follow: shelfExploreFollowSchema,
  collections: z.object({
    items: z.array(shelfExploreCollectionItemSchema),
    nextCursor: z.string().nullable(),
    hasNext: z.boolean(),
  }),
});

export type ShelfExplorePage = z.infer<typeof shelfExplorePageSchema>;

export interface GetShelfExploreParams {
  cursor?: string;
  size?: number;
}

export async function getShelfExplore(
  collectionId: number,
  params?: GetShelfExploreParams,
): Promise<ShelfExplorePage> {
  const { data } = await httpClient.get(`/feed/collections/${collectionId}/shelf`, { params });
  return shelfExplorePageSchema.parse(data);
}
