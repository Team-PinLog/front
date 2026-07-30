import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면(Component) → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 3.6 — 회원 탈퇴, 204(본문 없음). 되돌릴 수 없다.
 */
export async function deleteAccount(): Promise<void> {
  await httpClient.delete('/me');
}
