import { useCreateCollection } from '@/contexts/useCreateCollection';

/**
 * Record 상세에서 해당 Record 1개로 새 Collection을 만드는 진입점.
 * 근거: Jira S15P11A705-139.
 */
export function AddToCollectionButton() {
  const createCollectionState = useCreateCollection();

  return (
    <button
      type="button"
      onClick={createCollectionState.open}
      className="h-11 rounded-lg border border-pin-navy/15 text-sm font-bold text-pin-navy"
    >
      컬렉션 만들기
    </button>
  );
}
