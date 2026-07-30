import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useWithdrawConfirm } from '@/contexts/useWithdrawConfirm';
import { useDeleteAccountMutation } from '@/features/auth/hooks/useDeleteAccountMutation';

// 성공 메시지를 잠깐 보여준 뒤 이동한다(토스트 컴포넌트가 없어 인라인 메시지로 대체).
const SUCCESS_MESSAGE_DURATION_MS = 1200;

/**
 * 회원 탈퇴 확인 다이얼로그.
 * 근거: Jira S15P11A705-162, docs/reference/08_API_명세.md 3.6.
 * 목업(withdraw-confirm)과 동일하게 "아니오"(취소, 강조 스타일)를 먼저, "예"(탈퇴 진행, 약한 스타일)를
 * 나중에 배치한다 — 일반적인 좌우 배치(취소-오른쪽/확인-왼쪽)와 반대다.
 */
export function WithdrawConfirmDialog() {
  const withdrawConfirm = useWithdrawConfirm();
  const deleteAccountMutation = useDeleteAccountMutation();
  const navigate = useNavigate();
  const [isSucceeded, setIsSucceeded] = useState(false);

  useEffect(() => {
    if (!isSucceeded) {
      return;
    }
    const timer = setTimeout(() => {
      void navigate({ to: '/login' });
    }, SUCCESS_MESSAGE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [isSucceeded, navigate]);

  if (!withdrawConfirm.isOpen) {
    return null;
  }

  const handleClose = () => {
    deleteAccountMutation.reset();
    withdrawConfirm.close();
  };

  const handleConfirm = () => {
    deleteAccountMutation.mutate(undefined, {
      onSuccess: () => setIsSucceeded(true),
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

        {isSucceeded && <p className="mt-3 text-xs text-log-mint">탈퇴가 완료되었습니다</p>}

        {deleteAccountMutation.isError && (
          <p className="mt-3 text-xs text-red-600">{deleteAccountMutation.error.message}</p>
        )}

        {!isSucceeded && (
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
              {deleteAccountMutation.isPending ? '탈퇴 처리 중…' : '예'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
