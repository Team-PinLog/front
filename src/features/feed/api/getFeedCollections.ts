import { z } from 'zod';
import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 10.1 추천 목록.
 * 봉투({ success, data })는 httpClient 인터셉터가 벗긴다. 여기서는 언랩된 data만 파싱한다.
 * requestId는 응답(페이지) 단위 필드이며 item에는 없다 — 각 item에 합치는 건 호출부(useFeedCollectionsQuery
 * 소비처)의 책임이다.
 */
// keywords: []는 AI 미완료 상태의 정상 응답이다(architecture.md 5장) — 오류로 처리하지 않는다.
const feedCollectionItemSchema = z.object({
  position: z.number(),
  collectionId: z.number(),
  title: z.string(),
  recordCount: z.number(),
  keywords: z.array(z.string()),
  createdAt: z.string(),
});

export type FeedCollectionItem = z.infer<typeof feedCollectionItemSchema>;

const feedCollectionsPageSchema = z.object({
  requestId: z.string(),
  items: z.array(feedCollectionItemSchema),
  nextCursor: z.string().nullable(),
  hasNext: z.boolean(),
});

export type FeedCollectionsPage = z.infer<typeof feedCollectionsPageSchema>;

export interface GetFeedCollectionsParams {
  cursor?: string;
  size?: number;
}

export async function getFeedCollections(
  params?: GetFeedCollectionsParams,
): Promise<FeedCollectionsPage> {
  const { data } = await httpClient.get('/feed/collections', { params });
  return feedCollectionsPageSchema.parse(data);
}
