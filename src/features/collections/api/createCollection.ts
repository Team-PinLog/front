import { z } from 'zod';
import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 7.1 Collection 생성.
 * 봉투({ success, data })는 httpClient 인터셉터가 벗긴다. 여기서는 언랩된 data만 파싱한다.
 */
const createCollectionResponseSchema = z.object({
  collectionId: z.number(),
  title: z.string(),
  recordCount: z.number(),
  publishedAt: z.string(),
  createdAt: z.string(),
});

export type CreateCollectionResponse = z.infer<typeof createCollectionResponseSchema>;

export interface CreateCollectionRequest {
  title: string;
  recordIds: number[];
}

export async function createCollection(
  payload: CreateCollectionRequest,
): Promise<CreateCollectionResponse> {
  const { data } = await httpClient.post('/collections', payload);
  return createCollectionResponseSchema.parse(data);
}
