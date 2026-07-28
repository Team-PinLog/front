import { redirect } from '@tanstack/react-router';
import { getIsLoggedIn } from './getIsLoggedIn';
import { savePreLoginPath } from './preLoginPath';

interface RequireLoggedInArgs {
  location: { pathname: string };
}

/**
 * 보호 라우트의 `beforeLoad`에 붙여 쓰는 가드.
 * `logged_in` 쿠키가 없으면 현재 경로를 저장하고 `/login`으로 리다이렉트한다.
 * 쿠키가 있다고 인가를 확정하는 게 아니다 — 일단 그려보고, 실제 401은 client.ts의
 * single-flight 재발급(S15P11A705-82)이 처리한다. 이 가드는 초기 화면 결정용일 뿐이다.
 */
export function requireLoggedIn({ location }: RequireLoggedInArgs): void {
  if (getIsLoggedIn()) {
    return;
  }
  savePreLoginPath(location.pathname);
  throw redirect({ to: '/login' });
}
