import { useNavigate } from '@tanstack/react-router';
import { useCollectionDeleteConfirm } from '@/contexts/useCollectionDeleteConfirm';
import { useDeleteCollectionMutation } from '../hooks/useDeleteCollectionMutation';

interface CollectionDeleteConfirmDialogProps {
  collectionId: number;
}

/**
 * Collection 삭제 확인 모달. 두 진입 경로(trigger)를 하나로 처리한다.
 * 근거: Jira S15P11A705-140, docs/reference/08_API_명세.md 7.6.
 * - direct: 상세 화면의 삭제 버튼 클릭.
 * - lastRecordRemoval: 마지막 Record 제거 시도(409 DELETE_CONFIRMATION_REQUIRED).
 * 어느 쪽이든 확인 시 DELETE /collections/{collectionId}를 호출한다(DeleteConfirmDialog.tsx와 동일 패턴).
 */
export function CollectionDeleteConfirmDialog({
  collectionId,
}: CollectionDeleteConfirmDialogProps) {
  const deleteConfirm = useCollectionDeleteConfirm();
  const deleteCollectionMutation = useDeleteCollectionMutation();
  const navigate = useNavigate();

  if (!deleteConfirm.isOpen) {
    return null;
  }

  const message =
    deleteConfirm.trigger === 'lastRecordRemoval'
      ? '마지막 기록을 제거하면 컬렉션이 함께 삭제됩니다. 계속하시겠어요?'
      : '이 컬렉션을 삭제하시겠어요? 안의 기록은 유지됩니다.';

  const handleConfirm = () => {
    deleteCollectionMutation.mutate(collectionId, {
      onSuccess: () => {
        deleteConfirm.close();
        // 삭제된 Collection 상세에는 더 이상 머무를 수 없어 홈으로 이탈한다(navigate(-1)이 아닌 이유는
        // DeleteConfirmDialog.tsx와 동일 — 삭제된 리소스로 뒤로가기는 무의미하다).
        void navigate({ to: '/' });
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pin-navy/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6">
        <p className="text-sm leading-relaxed text-pin-navy">{message}</p>

        {deleteCollectionMutation.isError && (
          <p className="mt-3 text-xs text-red-600">{deleteCollectionMutation.error.message}</p>
        )}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={deleteConfirm.close}
            disabled={deleteCollectionMutation.isPending}
            className="h-11 flex-1 rounded-lg border border-pin-navy/15 text-sm font-bold text-pin-navy disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleteCollectionMutation.isPending}
            className="h-11 flex-1 rounded-lg bg-log-mint text-sm font-bold text-pin-navy disabled:opacity-40"
          >
            {deleteCollectionMutation.isPending ? '삭제 중…' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  );
}
