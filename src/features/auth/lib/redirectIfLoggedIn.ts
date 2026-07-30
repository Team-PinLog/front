import { redirect } from '@tanstack/react-router';
import { getIsLoggedIn } from './getIsLoggedIn';

/**
 * 비보호 라우트(`/login`)의 `beforeLoad`에 붙여 쓰는 가드.
 * `logged_in` 쿠키가 있으면(이미 로그인 상태) 홈(`/`)으로 리다이렉트한다.
 * requireLoggedIn.ts와 조건이 반대다 — 목적지가 항상 `/`로 고정이라 preLoginPath 저장은 하지 않는다.
 */
export function redirectIfLoggedIn(): void {
  if (!getIsLoggedIn()) {
    return;
  }
  throw redirect({ to: '/' });
}
