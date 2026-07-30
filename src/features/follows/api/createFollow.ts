import { z } from 'zod';
import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 8.2 Follow 생성.
 * 봉투({ success, data })는 httpClient 인터셉터가 벗긴다. 여기서는 언랩된 data만 파싱한다.
 * collectionId는 공개 진입점이다 — 작성자의 내부 사용자 ID를 프론트가 모르므로 이걸로 식별한다
 * (privacy-rules.md 2장). 생성 시 별칭은 항상 null이며, 별칭 등록은 144(Library)에서 PATCH로 처리한다.
 */
const createFollowResponseSchema = z.object({
  followId: z.number(),
  alias: z.string().nullable(),
  createdAt: z.string(),
});

export type CreateFollowResponse = z.infer<typeof createFollowResponseSchema>;

export async function createFollow(collectionId: number): Promise<CreateFollowResponse> {
  const { data } = await httpClient.post('/follows', { collectionId });
  return createFollowResponseSchema.parse(data);
}
