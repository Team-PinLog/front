import { z } from 'zod';
import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 9.3 팔로우 책장의 Collection 목록.
 * 봉투({ success, data })는 httpClient 인터셉터가 벗긴다. 여기서는 언랩된 data만 파싱한다.
 *
 * followId가 현재 로그인 사용자의 활성 Follow가 아니면 서버가 404를 반환한다 — httpClient가 던지는
 * ApiError를 그대로 호출부(useFollowShelfCollectionsQuery)에 전달한다.
 * 이 커서는 "책장별 Collection" 커서다 — 팔로우 목록 커서(getFollows)·Record 커서와 절대 혼용하지 않는다.
 */
// keywords: []는 AI 미완료 상태의 정상 응답이다(architecture.md 5장) — 오류로 처리하지 않는다.
const followShelfCollectionItemSchema = z.object({
  collectionId: z.number(),
  title: z.string(),
  recordCount: z.number(),
  keywords: z.array(z.string()),
  createdAt: z.string(),
});

export type FollowShelfCollectionItem = z.infer<typeof followShelfCollectionItemSchema>;

const followShelfCollectionsPageSchema = z.object({
  items: z.array(followShelfCollectionItemSchema),
  nextCursor: z.string().nullable(),
  hasNext: z.boolean(),
});

export type FollowShelfCollectionsPage = z.infer<typeof followShelfCollectionsPageSchema>;

export interface GetFollowShelfCollectionsParams {
  cursor?: string;
  size?: number;
}

export async function getFollowShelfCollections(
  followId: number,
  params?: GetFollowShelfCollectionsParams,
): Promise<FollowShelfCollectionsPage> {
  const { data } = await httpClient.get(`/follows/${followId}/collections`, { params });
  return followShelfCollectionsPageSchema.parse(data);
}
