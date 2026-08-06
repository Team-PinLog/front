import { redirect } from '@tanstack/react-router';
import { logoutRequest } from '../api/logout';
import type { OAuthCallbackSearch } from './oauthCallbackSearchSchema';
import { resolvePostLoginRedirect } from './resolvePostLoginRedirect';
import { clearWithdrawalNotice, hasWithdrawalNotice } from './withdrawalNotice';

interface HandleOAuthCallbackArgs {
  search: OAuthCallbackSearch;
}

const OAUTH_FAILURE_MESSAGE = '로그인에 실패했습니다. 다시 시도해 주세요.';

/**
 * 탈퇴가 실제로 끝났을 때만 보여주는 문구. 취소('탈퇴를 취소했습니다.')와 분명히 구분돼야 한다 —
 * 되돌릴 수 없는 동작이라 사용자가 둘을 헷갈리면 확인할 방법이 없다.
 */
const WITHDRAWAL_SUCCESS_MESSAGE = '탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.';

/**
 * 탈퇴 왕복의 실패 어휘(08_API_명세 3.6.2). 값마다 사용자가 할 일이 달라 문구를 나눈다.
 *
 * **이 경우들은 회원이 그대로 살아 있다** — 서버가 연결 해제에 성공한 경우에만 삭제하고,
 * 실패하면 인증 쿠키도 지우지 않는다. 그래서 아래 로그아웃 정리를 하지 않는다. 로그아웃시키면
 * 다시 시도하려는 사용자가 로그인부터 해야 한다.
 */
const WITHDRAWAL_FAILURE_MESSAGES: Record<string, string> = {
  WITHDRAWAL_CANCELLED: '탈퇴를 취소했습니다.',
  WITHDRAWAL_FAILED: '탈퇴에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  WITHDRAWAL_UNLINK_FAILED: '탈퇴에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  WITHDRAWAL_ACCOUNT_MISMATCH: '가입에 사용한 계정으로 인증해야 탈퇴할 수 있습니다.',
};

/**
 * `/auth/callback`의 `beforeLoad`에 붙여 쓰는 착지 처리.
 * 성공(`error` 없음): 로그인 시작 전 경로(없으면 메인)로 이동. 단 이 탭이 탈퇴를 시작했다는 표시가
 * 남아 있으면(withdrawalNotice) 그전에 탈퇴 완료를 알린다 — 탈퇴 성공도 `error` 없이 같은 곳으로
 * 착지해(08 §3.6.2) 표시 없이는 평범한 로그인과 구분되지 않는다. 근거: Jira S15P11A705-347.
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
    // 어떤 실패든 탈퇴 표시는 여기서 지운다. 이 착지로 왕복이 끝났고 회원은 지워지지 않았으므로,
    // 남겨두면 이후 같은 탭에서 평범히 로그인할 때 "탈퇴가 완료되었습니다"가 잘못 뜬다.
    // WITHDRAWAL_* 뿐 아니라 OAUTH_FAILED에도 적용한다 — 표시가 살아남을 이유가 없는 건 같다.
    clearWithdrawalNotice();

    // 탈퇴 왕복의 실패는 회원이 살아 있는 상태다. 로그아웃 정리를 하지 않고 되돌려보낸다.
    const withdrawalMessage = WITHDRAWAL_FAILURE_MESSAGES[search.error];
    if (withdrawalMessage) {
      window.alert(withdrawalMessage);
      // 설정은 라우트가 아니라 AppLayout 안의 패널이라 홈으로 보낸다. 세션이 살아 있으므로
      // 사용자는 거기서 다시 시도할 수 있다.
      throw redirect({ to: '/' });
    }

    window.alert(OAUTH_FAILURE_MESSAGE);
    try {
      await logoutRequest();
    } catch (error) {
      console.error('OAuth 실패 후 정리용 로그아웃 요청이 실패했습니다.', error);
    }
    throw redirect({ to: '/login' });
  }

  // 탈퇴가 확정된 경우도 여기로 온다 — 성공에는 별도 파라미터가 없다(08 §3.6.2).
  // 서버가 인증 쿠키를 만료시켰으므로 보호 라우트에 들어가려다 로그인으로 밀려난다.
  //
  // 그래서 이 착지만으로는 탈퇴 완료와 평범한 로그인이 구분되지 않는다. 이 탭이 탈퇴를 시작했다는
  // 표시가 남아 있는 경우에만 완료를 알린다. 읽는 즉시 지운다 — 한 번 알리고 끝나야 한다.
  const withdrawn = hasWithdrawalNotice();
  clearWithdrawalNotice();
  if (withdrawn) {
    window.alert(WITHDRAWAL_SUCCESS_MESSAGE);
  }

  throw redirect({ to: resolvePostLoginRedirect() });
}
