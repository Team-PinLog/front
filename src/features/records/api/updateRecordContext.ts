import { z } from 'zod';
import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 5.5 Context 수정, docs/reference/05-1_파트간_요구사항.md 1.1.
 * Context 수정은 내부적으로 기존 Context를 소프트 삭제하고 새 Context를 생성하는 교체 방식이라
 * 응답에 새 contextId가 온다. createdAt은 구 Context의 최초 작성 시각을 그대로 승계한다.
 * 봉투({ success, data })는 httpClient 인터셉터가 벗긴다. 여기서는 언랩된 data만 파싱한다.
 */
const updateRecordContextResponseSchema = z.object({
  contextId: z.number(),
  body: z.string(),
  createdAt: z.string(),
  keywords: z.array(z.string()),
});

export type UpdateRecordContextResponse = z.infer<typeof updateRecordContextResponseSchema>;

export interface UpdateRecordContextRequest {
  recordId: number;
  contextId: number;
  body: string;
}

export async function updateRecordContext({
  recordId,
  contextId,
  body,
}: UpdateRecordContextRequest): Promise<UpdateRecordContextResponse> {
  const { data } = await httpClient.patch(`/records/${recordId}/contexts/${contextId}`, { body });
  return updateRecordContextResponseSchema.parse(data);
}
