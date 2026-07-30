import { useState } from 'react';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useMyRecordListQuery } from '@/features/map/hooks/useMyRecordListQuery';
import { useCreateCollectionMutation } from '../hooks/useCreateCollectionMutation';
import type { CreateCollectionResponse } from '../api/createCollection';

const TITLE_MAX_LENGTH = 20;

interface NewCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (collection: { collectionId: number; title: string }) => void;
}

/**
 * 내 Record 다중 선택 기반 새 컬렉션 생성 모달.
 * 근거: Jira S15P11A705-167, docs/reference/08_API_명세.md 7.1.
 * 168(Record 저장 시트)·169(Library "+새 컬렉션")에서 재사용된다 — isOpen/onClose/onCreated로 제어되는
 * 순수 controlled 컴포넌트이며(139의 CreateCollectionDialog처럼 전역 Context를 갖지 않는다), 책등 색상은
 * 고정 브랜드 색상(pin-navy)만 쓰고 선택 UI는 두지 않는다(색상별 책 이미지 확장은 범위 밖).
 */
export function NewCollectionModal({ isOpen, onClose, onCreated }: NewCollectionModalProps) {
  const [title, setTitle] = useState('');
  const [selectedRecordIds, setSelectedRecordIds] = useState<number[]>([]);

  const recordListQuery = useMyRecordListQuery(isOpen);
  const createCollectionMutation = useCreateCollectionMutation();

  if (!isOpen) {
    return null;
  }

  const resetState = () => {
    setTitle('');
    setSelectedRecordIds([]);
    createCollectionMutation.reset();
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

  const trimmedTitle = title.trim();
  const canSubmit =
    trimmedTitle.length > 0 && selectedRecordIds.length > 0 && !createCollectionMutation.isPending;

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }
    createCollectionMutation.mutate(
      { title: trimmedTitle, recordIds: selectedRecordIds },
      {
        onSuccess: (data: CreateCollectionResponse) => {
          onCreated?.({ collectionId: data.collectionId, title: data.title });
          resetState();
          onClose();
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pin-navy/40 p-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-lg bg-white p-6">
        <h2 className="text-sm font-bold text-pin-navy">새 컬렉션 만들기</h2>

        <div className="mt-4 flex flex-none gap-3">
          <div className="h-20 w-14 flex-none rounded-sm bg-pin-navy" aria-hidden="true" />
          <div className="flex flex-col justify-center gap-1">
            <p className="text-xs text-ink-gray-light">책등 미리보기</p>
            <p className="line-clamp-2 text-sm font-bold text-pin-navy">
              {trimmedTitle || '컬렉션 제목을 입력해 주세요'}
            </p>
          </div>
        </div>

        <label htmlFor="new-collection-title" className="sr-only">
          컬렉션 제목
        </label>
        <input
          id="new-collection-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={TITLE_MAX_LENGTH}
          placeholder="컬렉션 제목을 입력해 주세요"
          disabled={createCollectionMutation.isPending}
          className="mt-4 h-11 flex-none rounded-lg border border-pin-navy/15 bg-white px-3 text-sm text-pin-navy outline-none placeholder:text-ink-gray-light focus:border-log-mint focus:ring-2 focus:ring-log-mint/20 disabled:opacity-40"
        />
        <p className="mt-1 flex-none text-right text-[11px] text-ink-gray-light">
          {title.length}/{TITLE_MAX_LENGTH}
        </p>

        <p className="mt-3 flex-none text-xs font-bold text-pin-navy">
          담을 장소 선택 ({selectedRecordIds.length}개 선택됨)
        </p>

        <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-lg border border-line-card">
          {recordListQuery.isPending && <p className="p-4 text-sm text-ink-gray">불러오는 중…</p>}

          {recordListQuery.isError && (
            <div className="p-4">
              <ErrorState
                title="장소 목록을 불러오지 못했어요"
                description="잠시 후 다시 시도해 주세요."
              />
            </div>
          )}

          {recordListQuery.isSuccess && recordListQuery.data.items.length === 0 && (
            <p className="p-4 text-sm text-ink-gray">저장한 장소가 없어요.</p>
          )}

          {recordListQuery.isSuccess && recordListQuery.data.items.length > 0 && (
            <ul>
              {recordListQuery.data.items.map((item) => (
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

        {createCollectionMutation.isError && (
          <p className="mt-2 flex-none text-xs text-red-600">
            {createCollectionMutation.error.message}
          </p>
        )}

        <div className="mt-4 flex flex-none gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={createCollectionMutation.isPending}
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
            {createCollectionMutation.isPending ? '만드는 중…' : '만들기'}
          </button>
        </div>
      </div>
    </div>
  );
}
