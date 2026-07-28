/**
 * 로그인 시작 전 사용자가 있던 경로를 sessionStorage에 보관한다.
 * 콜백 성공 시(S15P11A705-99) 이 경로로 복귀하고, 없으면 메인으로 폴백한다.
 * 근거: docs/reference/11_인증_설계.md 21행(콜백 URL 절).
 */
export const PRE_LOGIN_PATH_KEY = 'pinlog:pre-login-path';

const LOGIN_PATH = '/login';

/** `/login` 자체는 복귀 대상이 아니므로 저장하지 않는다. */
export function savePreLoginPath(pathname: string = window.location.pathname): void {
  if (pathname === LOGIN_PATH) {
    return;
  }
  sessionStorage.setItem(PRE_LOGIN_PATH_KEY, pathname);
}

export function getPreLoginPath(): string | null {
  return sessionStorage.getItem(PRE_LOGIN_PATH_KEY);
}
