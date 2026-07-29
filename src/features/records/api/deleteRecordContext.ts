import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/api-contract.md 5.6~5.8, docs/reference/08_API_명세.md 해당 절.
 * 204 응답(본문 없음)이라 Zod 파싱을 하지 않는다.
 * 마지막 Context 삭제 시도는 409 + error.impact로 거절되며, httpClient 인터셉터가 이를 ApiError로 던진다
 * (impact는 shared/http/types.ts의 ApiError.impact로 이미 타입화되어 있다).
 */
export interface DeleteRecordContextRequest {
  recordId: number;
  contextId: number;
}

export async function deleteRecordContext({
  recordId,
  contextId,
}: DeleteRecordContextRequest): Promise<void> {
  await httpClient.delete(`/records/${recordId}/contexts/${contextId}`);
}
