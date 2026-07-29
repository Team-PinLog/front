import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/api-contract.md 5.6~5.8.
 * 409(DELETE_CONFIRMATION_REQUIRED) 확인 후 사용자 동의 시에만 호출한다.
 * 연쇄 삭제 대상이 없어도 항상 안전하게 호출 가능하며 204(본문 없음)를 반환한다.
 */
export async function forceDeleteRecord(recordId: number): Promise<void> {
  await httpClient.delete(`/records/${recordId}/force`);
}
