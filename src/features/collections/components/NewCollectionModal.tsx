import { useState } from 'react';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useMyRecordListQuery } from '@/features/map/hooks/useMyRecordListQuery';
import { useCreateCollectionMutation } from '../hooks/useCreateCollectionMutation';
import { useCoverGeneration } from '../hooks/useCoverGeneration';
import { CoverStylePicker } from './CoverStylePicker';
import type { CreateCollectionResponse } from '../api/createCollection';

const TITLE_MAX_LENGTH = 20;

type NewCollectionModalMode = 'library' | 'fromNewRecord';

interface NewCollectionModalProps {
  isOpen: boolean;
  mode?: NewCollectionModalMode;
  onClose: () => void;
  onCreated?: (collection: { collectionId: number; title: string }) => void;
  onTitleStaged?: (title: string) => void;
}

/**
 * 새 컬렉션 생성 모달.
 * 근거: Jira S15P11A705-167·178, docs/reference/08_API_명세.md 7.1.
 * 169(Library "+새 컬렉션")는 기본값인 mode="library"를 쓴다 — 내 Record 다중 선택 후 "만들기" 시
 * 즉시 createCollection을 호출하는 기존 동작 그대로다.
 * 168(Record 저장 시트)은 mode="fromNewRecord"를 쓴다 — 저장 대상 record가 아직 서버에 없어(생성 전)
 * record 선택 목록 자체가 성립하지 않으므로, 목록 조회(useMyRecordListQuery)를 건너뛰고 제목만 받아
 * onTitleStaged로 돌려준다. API 호출은 record 저장 성공 이후 호출부(PlaceRecordSheet)가 담당한다.
 * isOpen/onClose로 제어되는 순수 controlled 컴포넌트다(216의 AddToCollectionDialog처럼 전역 Context를
 * 갖지 않는다). 책등 색상은 고정 브랜드 색상(pin-navy)만 쓰고 선택 UI는 두지 않는다(색상별 책 이미지
 * 확장은 범위 밖).
 *
 * 317(표지 생성): mode="library"에서만 "만들기" 성공 후 **모달을 닫지 않고 표지 화풍 선택 단계로
 * 넘어간다.** 컬렉션은 그 시점에 이미 만들어져 있고(표지를 기다리지 않는다 — api-contract.md
 * § Collection 표지 이미지), 사용자가 화풍을 고르지 않고 닫아도 표지 없는 정상 상태로 남는다.
 * mode="fromNewRecord"에는 붙이지 않는다 — 그 경로는 모달이 컬렉션을 만들지 않고(제목만 상위로
 * 넘긴다) 실제 생성은 Record 저장 뒤 PlaceRecordSheet가 하며, 제목을 여러 개 쌓아 한 번에 여러
 * 컬렉션을 만들 수 있어 "표지를 몇 번 고르게 할 것인가"가 별도 UX 결정이 된다.
 */
export function NewCollectionModal({
  isOpen,
  mode = 'library',
  onClose,
  onCreated,
  onTitleStaged,
}: NewCollectionModalProps) {
  const [title, setTitle] = useState('');
  const [selectedRecordIds, setSelectedRecordIds] = useState<number[]>([]);
  // 표지 단계로 넘어간 뒤에도 제목·컬렉션 id가 필요하다(표지 요청 payload). 생성 응답을 그대로 쥔다.
  const [createdCollection, setCreatedCollection] = useState<CreateCollectionResponse | null>(null);

  const isLibraryMode = mode === 'library';
  const recordListQuery = useMyRecordListQuery(isOpen && isLibraryMode);
  const createCollectionMutation = useCreateCollectionMutation();
  const cover = useCoverGeneration();

  if (!isOpen) {
    return null;
  }

  const isCoverStep = createdCollection !== null;

  const resetState = () => {
    setTitle('');
    setSelectedRecordIds([]);
    setCreatedCollection(null);
    createCollectionMutation.reset();
    cover.reset();
  };

  const handleClose = () => {
    // 표지 단계에서 닫아도 컬렉션은 이미 만들어져 있다 — 취소가 아니라 "표지는 나중에"다.
    // 폴링은 이 컴포넌트가 사라지면서 함께 멈춘다(구독자가 없어지면 refetchInterval도 멈춘다).
    resetState();
    onClose();
  };

  const toggleRecord = (recordId: number) => {
    setSelectedRecordIds((prev) =>
      prev.includes(recordId) ? prev.filter((id) => id !== recordId) : [...prev, recordId],
    );
  };

  const trimmedTitle = title.trim();
  const canSubmit = isLibraryMode
    ? trimmedTitle.length > 0 && selectedRecordIds.length > 0 && !createCollectionMutation.isPending
    : trimmedTitle.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    if (!isLibraryMode) {
      onTitleStaged?.(trimmedTitle);
      resetState();
      onClose();
      return;
    }

    createCollectionMutation.mutate(
      { title: trimmedTitle, recordIds: selectedRecordIds },
      {
        onSuccess: (data: CreateCollectionResponse) => {
          // 317: 컬렉션 생성은 여기서 이미 끝났다. 호출부(책장 갱신 등)에 먼저 알리고, 모달은
          // 닫지 않은 채 표지 단계로 넘어간다 — 표지를 기다리느라 생성 완료를 늦추지 않는다.
          onCreated?.({ collectionId: data.collectionId, title: data.title });
          setCreatedCollection(data);
          cover.start({ collectionId: data.collectionId, title: data.title });
        },
      },
    );
  };

  const handleFinishCoverStep = () => {
    // 318에서 이 자리에 PATCH /collections/{id} { coverImageUrl }가 들어간다. 지금은 최종본 URL을
    // 상위로 넘길 준비까지가 범위다(Jira S15P11A705-317).
    resetState();
    onClose();
  };

  if (isCoverStep) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-pin-navy/40 p-4">
        <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-lg bg-white p-6">
          <h2 className="flex-none text-sm font-bold text-pin-navy">
            &lsquo;{createdCollection.title}&rsquo; 표지 만들기
          </h2>

          <div className="mt-4 flex min-h-0 flex-1 flex-col">
            <CoverStylePicker
              cover={cover}
              onRetry={() =>
                cover.start({
                  collectionId: createdCollection.collectionId,
                  title: createdCollection.title,
                })
              }
            />
          </div>

          <div className="mt-4 flex flex-none gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="h-11 flex-1 rounded-lg border border-pin-navy/15 text-sm font-bold text-pin-navy"
            >
              나중에 하기
            </button>
            <button
              type="button"
              onClick={handleFinishCoverStep}
              disabled={!cover.isSettled}
              className="h-11 flex-1 rounded-lg bg-log-mint text-sm font-bold text-pin-navy disabled:opacity-40"
            >
              {cover.phase === 'finalizing' && !cover.isSettled ? '표지 만드는 중…' : '완료'}
            </button>
          </div>
        </div>
      </div>
    );
  }

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

        {isLibraryMode && (
          <>
            <p className="mt-3 flex-none text-xs font-bold text-pin-navy">
              담을 장소 선택 ({selectedRecordIds.length}개 선택됨)
            </p>

            <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-lg border border-line-card">
              {recordListQuery.isPending && (
                <p className="p-4 text-sm text-ink-gray">불러오는 중…</p>
              )}

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
          </>
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
