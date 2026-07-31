import { useAddToCollection } from '@/contexts/useAddToCollection';

/**
 * Record 상세에서 기존 컬렉션에 담거나 새 컬렉션을 만드는 진입점.
 * 근거: Jira S15P11A705-139·216, docs/reference/09_유저플로우.md 6장.
 */
export function AddToCollectionButton() {
  const addToCollectionState = useAddToCollection();

  return (
    <button
      type="button"
      onClick={addToCollectionState.open}
      className="h-11 rounded-lg border border-pin-navy/15 text-sm font-bold text-pin-navy"
    >
      컬렉션에 담기
    </button>
  );
}
