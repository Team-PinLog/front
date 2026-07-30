import { useNavigate } from '@tanstack/react-router';
import { useDeleteConfirm } from '@/contexts/useDeleteConfirm';
import { useForceDeleteRecordMutation } from '../hooks/useForceDeleteRecordMutation';

interface DeleteConfirmDialogProps {
  recordId: number;
}

/**
 * 마지막 Context 삭제 시도(409 DELETE_CONFIRMATION_REQUIRED) 후 Record 강제 삭제를 확인받는 모달.
 * 근거: Jira S15P11A705-138, docs/api-contract.md 5.6~5.8.
 * Record 전용 문구라 shared/ui로 공용화하지 않고 features 내부에 둔다.
 */
export function DeleteConfirmDialog({ recordId }: DeleteConfirmDialogProps) {
  const deleteConfirm = useDeleteConfirm();
  const forceDeleteMutation = useForceDeleteRecordMutation();
  const navigate = useNavigate();

  if (!deleteConfirm.isOpen || !deleteConfirm.impact) {
    return null;
  }

  const { collectionIds } = deleteConfirm.impact;
  const message =
    collectionIds.length > 0
      ? `이 기록을 삭제하면 컬렉션 ${collectionIds.length}개도 함께 사라집니다. 계속하시겠어요?`
      : '이 기록을 삭제하시겠어요? 기록이 함께 사라집니다.';

  const handleConfirm = () => {
    forceDeleteMutation.mutate(
      { recordId, collectionIds },
      {
        onSuccess: () => {
          deleteConfirm.close();
          // 삭제된 Record 상세에는 더 이상 머무를 수 없어 홈으로 이탈한다(전용 목록 라우트가 아직 없음).
          void navigate({ to: '/' });
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pin-navy/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6">
        <p className="text-sm leading-relaxed text-pin-navy">{message}</p>

        {forceDeleteMutation.isError && (
          <p className="mt-3 text-xs text-red-600">{forceDeleteMutation.error.message}</p>
        )}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={deleteConfirm.close}
            disabled={forceDeleteMutation.isPending}
            className="h-11 flex-1 rounded-lg border border-pin-navy/15 text-sm font-bold text-pin-navy disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={forceDeleteMutation.isPending}
            className="h-11 flex-1 rounded-lg bg-log-mint text-sm font-bold text-pin-navy disabled:opacity-40"
          >
            {forceDeleteMutation.isPending ? '삭제 중…' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  );
}
