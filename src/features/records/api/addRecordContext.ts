import { z } from 'zod';
import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 5.4 Context 추가.
 * 봉투({ success, data })는 httpClient 인터셉터가 벗긴다. 여기서는 언랩된 data만 파싱한다.
 */
const addRecordContextResponseSchema = z.object({
  contextId: z.number(),
  body: z.string(),
  createdAt: z.string(),
  keywords: z.array(z.string()),
});

export type AddRecordContextResponse = z.infer<typeof addRecordContextResponseSchema>;

export interface AddRecordContextRequest {
  recordId: number;
  body: string;
}

export async function addRecordContext({
  recordId,
  body,
}: AddRecordContextRequest): Promise<AddRecordContextResponse> {
  const { data } = await httpClient.post(`/records/${recordId}/contexts`, { body });
  return addRecordContextResponseSchema.parse(data);
}
