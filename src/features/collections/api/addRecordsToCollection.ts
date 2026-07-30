import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 7.5 Record 추가.
 * 이미 담긴 Record가 섞여 있어도 실패시키지 않고 중복만 건너뛰는 멱등 API다. 응답 본문 형식이 명세에
 * 없어 성공 여부만 판단하면 되므로 Zod 파싱을 하지 않는다(removeRecordFromCollection.ts와 동일 패턴).
 */
export interface AddRecordsToCollectionRequest {
  collectionId: number;
  recordIds: number[];
}

export async function addRecordsToCollection({
  collectionId,
  recordIds,
}: AddRecordsToCollectionRequest): Promise<void> {
  await httpClient.post(`/collections/${collectionId}/records`, { recordIds });
}
