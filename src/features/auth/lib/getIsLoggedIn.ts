const LOGGED_IN_COOKIE = 'logged_in=1';

/**
 * `logged_in` 표시 쿠키(비-HttpOnly) 존재 여부만 확인한다.
 * ⚠️ UI 힌트 전용이다 — 실제 인가 판단에 쓰지 않는다. 쿠키가 있어도 서버가 401을 낼 수 있고,
 * 그 경우 401 single-flight 재발급(S15P11A705-82)이 처리한다.
 * 근거: docs/api-contract.md "로그인 상태 확인" 섹션, docs/reference/08_API_명세.md 1.8.
 */
export function getIsLoggedIn(): boolean {
  return document.cookie.split('; ').includes(LOGGED_IN_COOKIE);
}
