import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 7.6 Record 제거.
 * 마지막 Record 제거 요청은 409(DELETE_CONFIRMATION_REQUIRED)로 거절되며, httpClient 인터셉터가 이를 ApiError로 던진다.
 * 마지막이 아니면 204(본문 없음)라 Zod 파싱을 하지 않는다.
 */
export interface RemoveRecordFromCollectionRequest {
  collectionId: number;
  recordId: number;
}

export async function removeRecordFromCollection({
  collectionId,
  recordId,
}: RemoveRecordFromCollectionRequest): Promise<void> {
  await httpClient.delete(`/collections/${collectionId}/records/${recordId}`);
}
