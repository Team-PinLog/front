import { useState } from 'react';
import { useAddToCollection } from '@/contexts/useAddToCollection';
import { useMyCollectionsQuery } from '../hooks/useMyCollectionsQuery';
import { useAddRecordsToCollectionMutation } from '../hooks/useAddRecordsToCollectionMutation';
import { useCreateCollectionMutation } from '../hooks/useCreateCollectionMutation';

const TITLE_MAX_LENGTH = 20;

interface AddToCollectionDialogProps {
  recordId: number;
}

interface ExistingOutcome {
  collectionId: number;
  title: string;
  status: 'success' | 'error';
}

interface CreateOutcome {
  title: string;
  status: 'success' | 'error';
}

/**
 * Record 상세에서 여는 "컬렉션에 담기" 다이얼로그.
 * 근거: Jira S15P11A705-216, docs/reference/09_유저플로우.md 6장 "기록을 담는 진입점은 양방향입니다".
 * 기존 컬렉션에 담기(다중 선택)와 새 컬렉션 만들기를 한 화면에서 처리한다 — "담기" 제출 시 선택된 기존
 * 컬렉션 추가 + 새 컬렉션 생성을 병렬로 호출한다(PlaceRecordSheet.handleSave와 동일 패턴).
 * 이 Record가 이미 담긴 컬렉션을 가려낼 방법이 없어(GET /records/{recordId} 응답에 소속 컬렉션 정보가
 * 없다 — 11.1 RecordDetail의 addedToCollectionAt은 Collection 상세 조회 쪽에서만 채워지는 필드다)
 * 목록을 필터링하거나 "이미 담김"으로 표시하지 않는다 — 중복 담기는 서버가 멱등 처리한다(08_API_명세 7.5).
 * 부분 실패 시 성공한 기존 컬렉션 선택은 해제하고(재제출해도 멱등이라 안전) 실패한 항목만 남겨 재시도를
 * 유도하며, 새 컬렉션 생성이 성공했다면 제목을 비워 재제출 시 중복 생성되지 않게 한다.
 */
export function AddToCollectionDialog({ recordId }: AddToCollectionDialogProps) {
  const addToCollectionState = useAddToCollection();
  const myCollectionsQuery = useMyCollectionsQuery(addToCollectionState.isOpen);
  const addToCollectionMutation = useAddRecordsToCollectionMutation();
  const createCollectionMutation = useCreateCollectionMutation();

  const [selectedCollectionIds, setSelectedCollectionIds] = useState<number[]>([]);
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingOutcomes, setExistingOutcomes] = useState<ExistingOutcome[] | null>(null);
  const [createOutcome, setCreateOutcome] = useState<CreateOutcome | null>(null);

  if (!addToCollectionState.isOpen) {
    return null;
  }

  const resetState = () => {
    setSelectedCollectionIds([]);
    setTitle('');
    setExistingOutcomes(null);
    setCreateOutcome(null);
  };

  const handleClose = () => {
    resetState();
    addToCollectionState.close();
  };

  const toggleCollection = (collectionId: number) => {
    setSelectedCollectionIds((prev) =>
      prev.includes(collectionId)
        ? prev.filter((id) => id !== collectionId)
        : [...prev, collectionId],
    );
  };

  const myCollections = myCollectionsQuery.isSuccess
    ? myCollectionsQuery.data.pages.flatMap((page) => page.items)
    : [];
  const hasNextPage = myCollectionsQuery.data?.pages.at(-1)?.hasNext ?? false;

  const trimmedTitle = title.trim();
  const canSubmit = (selectedCollectionIds.length > 0 || trimmedTitle.length > 0) && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    const collectionTitleById = new Map(myCollections.map((c) => [c.collectionId, c.title]));

    setIsSubmitting(true);
    const [addResults, createResults] = await Promise.all([
      Promise.allSettled(
        selectedCollectionIds.map((collectionId) =>
          addToCollectionMutation.mutateAsync({ collectionId, recordId }),
        ),
      ),
      Promise.allSettled(
        (trimmedTitle ? [trimmedTitle] : []).map((titleToCreate) =>
          createCollectionMutation.mutateAsync({ title: titleToCreate, recordIds: [recordId] }),
        ),
      ),
    ]);
    setIsSubmitting(false);

    const nextExistingOutcomes: ExistingOutcome[] = addResults.map((result, index) => {
      const collectionId = selectedCollectionIds[index];
      return {
        collectionId,
        title: collectionTitleById.get(collectionId) ?? '컬렉션',
        status: result.status === 'fulfilled' ? 'success' : 'error',
      };
    });
    setExistingOutcomes(nextExistingOutcomes);

    const createSucceeded = !trimmedTitle || createResults[0]?.status === 'fulfilled';
    setCreateOutcome(
      trimmedTitle ? { title: trimmedTitle, status: createSucceeded ? 'success' : 'error' } : null,
    );

    const failedCollectionIds = nextExistingOutcomes
      .filter((outcome) => outcome.status === 'error')
      .map((outcome) => outcome.collectionId);

    if (failedCollectionIds.length === 0 && createSucceeded) {
      handleClose();
      return;
    }

    setSelectedCollectionIds(failedCollectionIds);
    if (createSucceeded) {
      setTitle('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pin-navy/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-sm flex-col rounded-lg bg-white p-6">
        <h2 className="flex-none text-sm font-bold text-pin-navy">컬렉션에 담기</h2>

        <p className="mt-4 flex-none text-[11px] font-bold tracking-[0.08em] text-log-mint">
          기존 컬렉션에 담기
        </p>

        <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-lg border border-line-card">
          {myCollectionsQuery.isPending && (
            <p className="p-4 text-sm text-ink-gray">불러오는 중…</p>
          )}

          {myCollectionsQuery.isError && (
            <p className="p-4 text-xs text-red-600">컬렉션을 불러오지 못했어요.</p>
          )}

          {myCollectionsQuery.isSuccess && myCollections.length === 0 && (
            <p className="p-4 text-sm text-ink-gray">아직 만든 컬렉션이 없어요.</p>
          )}

          {myCollections.length > 0 && (
            <ul>
              {myCollections.map((collection) => (
                <li
                  key={collection.collectionId}
                  className="border-b border-line-subtle last:border-b-0"
                >
                  <label className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-pin-navy">
                    <input
                      type="checkbox"
                      checked={selectedCollectionIds.includes(collection.collectionId)}
                      onChange={() => toggleCollection(collection.collectionId)}
                      className="h-4 w-4 flex-none accent-log-mint"
                    />
                    {collection.title}
                  </label>
                </li>
              ))}
            </ul>
          )}

          {hasNextPage && (
            <button
              type="button"
              onClick={() => void myCollectionsQuery.fetchNextPage()}
              disabled={myCollectionsQuery.isFetchingNextPage}
              className="w-full py-2 text-xs font-bold text-log-mint disabled:opacity-40"
            >
              {myCollectionsQuery.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
            </button>
          )}
        </div>

        <label
          htmlFor="add-to-collection-title"
          className="mt-4 flex-none text-[11px] font-bold tracking-[0.08em] text-log-mint"
        >
          새 컬렉션 만들기 · 선택 사항
        </label>
        <input
          id="add-to-collection-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={TITLE_MAX_LENGTH}
          placeholder="컬렉션 제목을 입력해 주세요"
          disabled={isSubmitting}
          className="mt-2 h-11 flex-none rounded-lg border border-pin-navy/15 bg-white px-3 text-sm text-pin-navy outline-none placeholder:text-ink-gray-light focus:border-log-mint focus:ring-2 focus:ring-log-mint/20 disabled:opacity-40"
        />
        <p className="mt-1 flex-none text-right text-[11px] text-ink-gray-light">
          {title.length}/{TITLE_MAX_LENGTH}
        </p>

        {existingOutcomes && existingOutcomes.some((outcome) => outcome.status === 'error') && (
          <p className="mt-2 flex-none text-xs text-red-600">
            {existingOutcomes
              .filter((outcome) => outcome.status === 'error')
              .map((outcome) => outcome.title)
              .join(', ')}{' '}
            추가에 실패했어요. 다시 시도해 주세요.
          </p>
        )}

        {createOutcome?.status === 'error' && (
          <p className="mt-2 flex-none text-xs text-red-600">
            {createOutcome.title} 생성에 실패했어요. 다시 시도해 주세요.
          </p>
        )}

        <div className="mt-4 flex flex-none gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="h-11 flex-1 rounded-lg border border-pin-navy/15 text-sm font-bold text-pin-navy disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="h-11 flex-1 rounded-lg bg-log-mint text-sm font-bold text-pin-navy disabled:opacity-40"
          >
            {isSubmitting ? '담는 중…' : '담기'}
          </button>
        </div>
      </div>
    </div>
  );
}
