import { redirect } from '@tanstack/react-router';
import { logoutRequest } from '../api/logout';
import type { OAuthCallbackSearch } from './oauthCallbackSearchSchema';
import { resolvePostLoginRedirect } from './resolvePostLoginRedirect';

interface HandleOAuthCallbackArgs {
  search: OAuthCallbackSearch;
}

const OAUTH_FAILURE_MESSAGE = '로그인에 실패했습니다. 다시 시도해 주세요.';

/**
 * `/auth/callback`의 `beforeLoad`에 붙여 쓰는 착지 처리.
 * 성공(`error` 없음): 로그인 시작 전 경로(없으면 메인)로 이동.
 * 실패(`error` 있음, 예: `OAUTH_FAILED`): 실패 알림 표시 후 `/login`으로 이동 — 저장된 복귀 경로는
 * 사용하지 않는다(지우지도 않는다 — 재시도 시 재사용 가능).
 * 실패 시 이전 로그인의 `logged_in` 쿠키가 만료되지 않은 채 남아 있으면 `/login`의
 * `redirectIfLoggedIn` 가드가 다시 `/`로 튕겨내(실제 세션 없이도 보호 라우트에 진입해 401만 반복됨)
 * `/login`으로 못 가므로, 로그아웃 API로 세션·`logged_in` 쿠키를 확실히 정리한 뒤 이동한다
 * (08_API_명세 3.4: 세션이 없거나 이미 무효해도 204라 실패해도 무시하고 진행 가능).
 * ⚠️ 알림은 아직 별도 알림 시스템이 없어 `alert()` placeholder다. 실제 컴포넌트로 교체 필요.
 */
export async function handleOAuthCallback({ search }: HandleOAuthCallbackArgs): Promise<never> {
  if (search.error) {
    window.alert(OAUTH_FAILURE_MESSAGE);
    try {
      await logoutRequest();
    } catch (error) {
      console.error('OAuth 실패 후 정리용 로그아웃 요청이 실패했습니다.', error);
    }
    throw redirect({ to: '/login' });
  }

  throw redirect({ to: resolvePostLoginRedirect() });
}
