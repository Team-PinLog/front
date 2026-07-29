import { useRemoveRecordFromCollectionMutation } from '../hooks/useRemoveRecordFromCollectionMutation';

interface RecordRemoveButtonProps {
  collectionId: number;
  recordId: number;
}

/**
 * Collection 상세에서 소유자가 담긴 Record를 제거하는 버튼.
 * 근거: Jira S15P11A705-140, docs/reference/08_API_명세.md 7.6.
 * ownedByMe일 때만 노출해야 하며, 그 판단은 호출부(CollectionDetailView)가 한다 — 여기서는 다루지 않는다.
 * 마지막 Record 제거(409)는 CollectionDeleteConfirmDialog로 이어지므로 여기서는 그 외 에러만 노출한다.
 */
export function RecordRemoveButton({ collectionId, recordId }: RecordRemoveButtonProps) {
  const removeRecordMutation = useRemoveRecordFromCollectionMutation(collectionId);

  const showInlineError =
    removeRecordMutation.isError &&
    removeRecordMutation.error.code !== 'DELETE_CONFIRMATION_REQUIRED';

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => removeRecordMutation.mutate(recordId)}
        disabled={removeRecordMutation.isPending}
        className="text-xs font-bold text-red-600 disabled:opacity-40"
      >
        {removeRecordMutation.isPending ? '제거 중…' : '제거'}
      </button>

      {showInlineError && (
        <p className="text-xs text-red-600">{removeRecordMutation.error.message}</p>
      )}
    </div>
  );
}
