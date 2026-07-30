import { z } from 'zod';
import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 9.2 팔로우 목록.
 * 이번 티켓(143)에서 소비하는 화면은 없다 — Follow 목록 화면은 144(Library) 범위. API 함수만 미리 만들어 둔다.
 *
 * 커서 주의(conventions.md, 08_API_명세 9.1): 여기서 쓰는 커서는 "팔로우 목록" 커서다. 책장별 Collection
 * 커서(GET /follows/{followId}/collections)·Record 커서(GET /collections/{collectionId})와는 독립적이며
 * 혼용하지 않는다 — 144에서 세 목록을 동시에 다룰 때 서로 다른 cursor 값을 섞어 쓰지 않도록 유의한다.
 */
const followListItemSchema = z.object({
  followId: z.number(),
  alias: z.string().nullable(),
  createdAt: z.string(),
});

export type FollowListItem = z.infer<typeof followListItemSchema>;

const followListPageSchema = z.object({
  items: z.array(followListItemSchema),
  nextCursor: z.string().nullable(),
  hasNext: z.boolean(),
});

export type FollowListPage = z.infer<typeof followListPageSchema>;

export interface GetFollowsParams {
  cursor?: string;
  size?: number;
}

export async function getFollows(params?: GetFollowsParams): Promise<FollowListPage> {
  const { data } = await httpClient.get('/follows', { params });
  return followListPageSchema.parse(data);
}
