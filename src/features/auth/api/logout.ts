import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면(Component) → Hook/흐름 함수 → API 함수(여기) → httpClient
 * 근거: docs/api-contract.md "로그아웃" — POST /auth/logout, 204(본문 없음).
 * 인증 쿠키·`logged_in` 쿠키 만료는 서버가 처리한다. 쿠키가 없거나 이미 무효해도 204로 응답된다.
 */
export async function logoutRequest(): Promise<void> {
  await httpClient.post('/auth/logout');
}
