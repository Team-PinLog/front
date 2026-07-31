import { useState } from 'react';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useMyRecordListQuery } from '@/features/map/hooks/useMyRecordListQuery';
import { useAddRecordsToCollectionMutation } from '../hooks/useAddRecordsToCollectionMutation';

interface AddRecordToCollectionDialogProps {
  collectionId: number;
  excludedRecordIds: Set<number>;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Collection 상세(소유자 뷰)에서 내 Record를 골라 이 Collection에 담는 다이얼로그.
 * 근거: Jira S15P11A705-217, docs/reference/09_유저플로우.md 6장(진입점 양방향) ·
 * docs/reference/06_데이터모델_및_무결성.md("기록 선택 화면에는 이미 담긴 기록이 나타나지 않습니다").
 * 216(AddToCollectionDialog)과 반대 방향이라 excludedRecordIds(이 Collection에 이미 담긴 recordId)로
 * 실제 필터링을 한다 — 216은 Record 하나가 어느 Collection에 담겼는지 알 방법이 없어 필터링을 못 했지만,
 * 여기서는 호출부(CollectionDetailView)가 이미 로드한 flatRecords로 정확한 목록을 만들어 줄 수 있다.
 * NewCollectionModal의 레코드 다중 선택 리스트 UI 패턴을 재사용하되, 대상은 새 Collection이 아니라
 * 기존 collectionId 하나이므로 선택한 recordIds를 배열 그대로 한 번에 전송한다(Promise.allSettled 불필요).
 */
export function AddRecordToCollectionDialog({
  collectionId,
  excludedRecordIds,
  isOpen,
  onClose,
}: AddRecordToCollectionDialogProps) {
  const [selectedRecordIds, setSelectedRecordIds] = useState<number[]>([]);
  const recordListQuery = useMyRecordListQuery(isOpen);
  const addRecordsMutation = useAddRecordsToCollectionMutation();

  if (!isOpen) {
    return null;
  }

  const resetState = () => {
    setSelectedRecordIds([]);
    addRecordsMutation.reset();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const toggleRecord = (recordId: number) => {
    setSelectedRecordIds((prev) =>
      prev.includes(recordId) ? prev.filter((id) => id !== recordId) : [...prev, recordId],
    );
  };

  const availableItems = (recordListQuery.data?.items ?? []).filter(
    (item) => !excludedRecordIds.has(item.recordId),
  );

  const canSubmit = selectedRecordIds.length > 0 && !addRecordsMutation.isPending;

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }
    addRecordsMutation.mutate(
      { collectionId, recordIds: selectedRecordIds },
      {
        onSuccess: () => {
          resetState();
          onClose();
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pin-navy/40 p-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-lg bg-white p-6">
        <h2 className="flex-none text-sm font-bold text-pin-navy">
          내 레코드 추가 ({selectedRecordIds.length}개 선택됨)
        </h2>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-lg border border-line-card">
          {recordListQuery.isPending && <p className="p-4 text-sm text-ink-gray">불러오는 중…</p>}

          {recordListQuery.isError && (
            <div className="p-4">
              <ErrorState
                title="장소 목록을 불러오지 못했어요"
                description="잠시 후 다시 시도해 주세요."
              />
            </div>
          )}

          {recordListQuery.isSuccess && availableItems.length === 0 && (
            <p className="p-4 text-sm text-ink-gray">새로 담을 수 있는 장소가 없어요.</p>
          )}

          {availableItems.length > 0 && (
            <ul>
              {availableItems.map((item) => (
                <li key={item.recordId} className="border-b border-line-subtle last:border-b-0">
                  <label className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-pin-navy">
                    <input
                      type="checkbox"
                      checked={selectedRecordIds.includes(item.recordId)}
                      onChange={() => toggleRecord(item.recordId)}
                      className="h-4 w-4 flex-none accent-log-mint"
                    />
                    {item.name}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {addRecordsMutation.isError && (
          <p className="mt-2 flex-none text-xs text-red-600">{addRecordsMutation.error.message}</p>
        )}

        <div className="mt-4 flex flex-none gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={addRecordsMutation.isPending}
            className="h-11 flex-1 rounded-lg border border-pin-navy/15 text-sm font-bold text-pin-navy disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-11 flex-1 rounded-lg bg-log-mint text-sm font-bold text-pin-navy disabled:opacity-40"
          >
            {addRecordsMutation.isPending ? '담는 중…' : '담기'}
          </button>
        </div>
      </div>
    </div>
  );
}
