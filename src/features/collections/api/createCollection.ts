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
  // 318: 생성 직후에는 항상 null이다 — 표지는 생성 요청에 없고, 확정된 뒤 PATCH로 등록한다
  // (docs/api-contract.md § Collection 표지 이미지). 값을 쓰지는 않지만 계약대로 받아둔다.
  coverImageUrl: z.string().nullable().optional(),
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
