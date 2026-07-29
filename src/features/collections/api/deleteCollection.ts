import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 7.6 관련 — 소유자만 가능, 204(본문 없음).
 * 직접 삭제(direct)와 마지막 Record 제거 후 확인(lastRecordRemoval) 두 경로 모두 이 함수를 호출한다.
 */
export async function deleteCollection(collectionId: number): Promise<void> {
  await httpClient.delete(`/collections/${collectionId}`);
}
