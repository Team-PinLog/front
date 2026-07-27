import { z } from 'zod';
import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면(Component) → Hook → API 함수(여기) → httpClient
 * API 함수가 요청/응답 타입을 소유하고, 응답을 Zod로 파싱한다.
 * 근거: docs/architecture.md 1장, docs/reference/08_API_명세.md 3.6.
 */
const meSummarySchema = z.object({
  provider: z.string(),
  email: z.string(),
  recordCount: z.number(),
  collectionCount: z.number(),
  followerCount: z.number(),
  followingCount: z.number(),
});

export type MeSummary = z.infer<typeof meSummarySchema>;

export async function getMeSummary(): Promise<MeSummary> {
  const { data } = await httpClient.get('/me/summary');
  return meSummarySchema.parse(data);
}
