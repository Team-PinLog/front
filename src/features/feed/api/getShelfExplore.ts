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
