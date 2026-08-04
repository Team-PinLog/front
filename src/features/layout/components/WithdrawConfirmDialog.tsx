import { useWithdrawConfirm } from '@/contexts/useWithdrawConfirm';
import { useDeleteAccountMutation } from '@/features/auth/hooks/useDeleteAccountMutation';

/**
 * 회원 탈퇴 확인 다이얼로그.
 * 근거: Jira S15P11A705-162, docs/reference/08_API_명세.md 3.6.
 * 목업(withdraw-confirm)과 동일하게 "아니오"(취소, 강조 스타일)를 먼저, "예"(탈퇴 진행, 약한 스타일)를
 * 나중에 배치한다 — 일반적인 좌우 배치(취소-오른쪽/확인-왼쪽)와 반대다.
 *
 * **성공 메시지를 여기서 보여주지 않는다.** 「예」를 눌러 받는 것은 완료가 아니라 공급자 인가
 * 진입 주소이고, 이 시점에는 아직 아무것도 지워지지 않았다. 사용자는 공급자 화면에서 취소할 수도
 * 있다. 탈퇴 완료는 왕복이 끝나고 인증 쿠키가 만료된 채 `/auth/callback`에 착지하는 것으로 드러난다.
 */
export function WithdrawConfirmDialog() {
  const withdrawConfirm = useWithdrawConfirm();
  const deleteAccountMutation = useDeleteAccountMutation();

  if (!withdrawConfirm.isOpen) {
    return null;
  }

  const handleClose = () => {
    deleteAccountMutation.reset();
    withdrawConfirm.close();
  };

  const handleConfirm = () => {
    deleteAccountMutation.mutate(undefined, {
      onSuccess: ({ authorizationUrl }) => {
        // 라우터 이동이 아니라 전체 페이지 이동이어야 한다 — 목적지가 공급자 화면이다.
        // fetch·axios로 부르면 사용자에게 그 화면이 보이지 않는다(08 §3.6.1).
        window.location.href = authorizationUrl;
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pin-navy/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6">
        <p className="text-base font-bold leading-relaxed text-pin-navy">
          기록이 모두 사라집니다.
          <br />
          탈퇴하시겠습니까?
        </p>

        <p className="mt-3 text-xs text-ink-gray">
          계속하려면 가입에 사용한 소셜 계정으로 한 번 더 인증해야 합니다.
        </p>

        {deleteAccountMutation.isError && (
          <p className="mt-3 text-xs text-red-600">{deleteAccountMutation.error.message}</p>
        )}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={deleteAccountMutation.isPending}
            className="h-11 flex-1 rounded-lg bg-log-mint text-sm font-bold text-pin-navy disabled:opacity-40"
          >
            아니오
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleteAccountMutation.isPending}
            className="h-11 flex-1 rounded-lg border border-pin-navy/15 text-sm font-bold text-ink-gray disabled:opacity-40"
          >
            {deleteAccountMutation.isPending ? '이동 중…' : '예'}
          </button>
        </div>
      </div>
    </div>
  );
}
