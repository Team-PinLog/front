import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 8.4 Follow 해제. 204(본문 없음)라 Zod 파싱을 하지 않는다.
 */
export async function deleteFollow(followId: number): Promise<void> {
  await httpClient.delete(`/follows/${followId}`);
}
