import { redirect } from '@tanstack/react-router';
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
 * ⚠️ 알림은 아직 별도 알림 시스템이 없어 `alert()` placeholder다. 실제 컴포넌트로 교체 필요.
 */
export function handleOAuthCallback({ search }: HandleOAuthCallbackArgs): never {
  if (search.error) {
    window.alert(OAUTH_FAILURE_MESSAGE);
    throw redirect({ to: '/login' });
  }

  throw redirect({ to: resolvePostLoginRedirect() });
}
