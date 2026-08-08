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
 *
 * 418: **구석에 작게** 둔다(코멘트 2의 4번). 파괴적 동작이 페이지를 펼쳤을 때 먼저 눈에 들어오면
 * 안 되므로 평소에는 종이에 흐리게 적힌 잉크 정도로 두고, 호버·포커스에서만 또렷해진다.
 * 없애지는 않는다 — 흐릿한 것과 숨은 것은 다르고, 소유자에게 이 장을 덜어낼 길은 필요하다.
 * `opacity-0`으로 감추지 않는 이유이기도 하다(포커스로만 드러나는 컨트롤은 마우스 사용자가 찾지 못한다).
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
        title="이 기록을 컬렉션에서 빼기"
        className="rounded-full px-2 py-1 text-[11px] font-bold text-[#b6b0a6] underline-offset-4 transition-colors hover:text-red-500 hover:underline focus:outline-none focus-visible:text-red-500 focus-visible:underline disabled:opacity-40"
      >
        {removeRecordMutation.isPending ? '빼는 중…' : '이 장 뜯어내기'}
      </button>

      {showInlineError && (
        <p className="text-xs text-red-600">{removeRecordMutation.error.message}</p>
      )}
    </div>
  );
}
