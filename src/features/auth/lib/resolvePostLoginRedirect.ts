import { clearPreLoginPath, getPreLoginPath } from './preLoginPath';

/**
 * 콜백 성공 시 이동할 경로를 정한다. 저장된 로그인 시작 전 경로가 있으면 그 경로,
 * 없으면 메인(`/`)으로 폴백한다. 사용한 저장값은 이 호출로 정리되어 다음 로그인에 재사용되지 않는다.
 */
export function resolvePostLoginRedirect(): string {
  const preLoginPath = getPreLoginPath();
  clearPreLoginPath();
  return preLoginPath ?? '/';
}
