import type { RecordDetail } from '../api/getRecordDetail';
import { useDeleteContextMutation } from '../hooks/useDeleteContextMutation';

type ContextDetail = NonNullable<RecordDetail['contexts']>[number];

interface ContextListItemProps {
  recordId: number;
  context: ContextDetail;
}

/**
 * Record 상세의 Context 항목 하나 + 삭제 액션.
 * 근거: Jira S15P11A705-138.
 * 마지막 Context 삭제(409)는 확인 모달(DeleteConfirmDialog)로 이어지므로 여기서는 그 외 에러만 노출한다.
 */
export function ContextListItem({ recordId, context }: ContextListItemProps) {
  const deleteContextMutation = useDeleteContextMutation(recordId);

  const showInlineError =
    deleteContextMutation.isError &&
    deleteContextMutation.error.code !== 'DELETE_CONFIRMATION_REQUIRED';

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line-card bg-white p-4">
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-gray">{context.body}</p>

      {showInlineError && (
        <p className="text-xs text-red-600">{deleteContextMutation.error.message}</p>
      )}

      <button
        type="button"
        onClick={() => deleteContextMutation.mutate(context.contextId)}
        disabled={deleteContextMutation.isPending}
        className="self-end text-xs font-bold text-red-600 disabled:opacity-40"
      >
        {deleteContextMutation.isPending ? '삭제 중…' : '삭제'}
      </button>
    </div>
  );
}
