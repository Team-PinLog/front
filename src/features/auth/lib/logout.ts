import { router } from '@/app/router';
import { logoutRequest } from '../api/logout';

/**
 * 로그아웃 버튼 등 컴포넌트에서 호출하는 흐름 함수.
 * 요청 성공/실패와 무관하게 `/login`으로 이동한다 — 실패해도 클라이언트 관점에서는
 * 로그아웃 의도가 있고, 이후 보호 라우트 진입 시 `requireLoggedIn` 가드가 다시 검증한다.
 * 실패는 콘솔 로깅만 남기고 사용자에게 알리지 않는다(로그아웃은 실패해도 막히면 안 됨).
 */
export async function logout(): Promise<void> {
  try {
    await logoutRequest();
  } catch (error) {
    console.error('로그아웃 요청이 실패했지만 로그아웃 흐름은 계속 진행합니다.', error);
  } finally {
    await router.navigate({ to: '/login' });
  }
}
