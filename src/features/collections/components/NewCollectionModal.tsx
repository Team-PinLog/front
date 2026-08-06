import { useState } from 'react';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useMyRecordListQuery } from '@/features/map/hooks/useMyRecordListQuery';
import { useCreateCollectionMutation } from '../hooks/useCreateCollectionMutation';
import { CollectionCoverModal } from './CollectionCoverModal';
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
 * 363: 그래서 제목 입력 위에 있던 "책등 미리보기"(남색 사각형 + 제목)를 없앴다. 고를 것이 없으니
 * 미리보기가 보여줄 변화도 없었고 — 제목은 바로 아래 입력란에 이미 그대로 보인다 — 실제 책장의
 * 책등과도 닮지 않았다(높이·기울기·색이 collectionId로 정해진다, shelfSpine.ts). 화면에서 정말
 * 궁금한 미리보기는 표지이고, 그건 생성 직후 표지 단계(CollectionCoverModal)가 보여준다.
 *
 * 317(표지 생성): mode="library"에서만 "만들기" 성공 후 **모달을 닫지 않고 표지 화풍 선택 단계로
 * 넘어간다.** 컬렉션은 그 시점에 이미 만들어져 있고(표지를 기다리지 않는다 — api-contract.md
 * § Collection 표지 이미지), 사용자가 화풍을 고르지 않고 닫아도 표지 없는 정상 상태로 남는다.
 * 화풍이 정해지는 순간 모달은 닫히고, 그 뒤(인쇄본 완성 → PATCH 저장)는 CoverJobProvider가
 * 백그라운드에서 이어받는다(326).
 *
 * 327: 그 표지 단계는 CollectionCoverModal로 떼어냈다. mode="fromNewRecord"는 여전히 여기서
 * 표지를 다루지 않는다 — 그 경로는 이 모달이 컬렉션을 만들지 않고(제목만 상위로 넘긴다) 실제
 * 생성은 Record 저장 뒤 PlaceRecordSheet가 하므로, 표지 단계도 그쪽이 저장 성공 후에 띄운다.
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

  const resetState = () => {
    setTitle('');
    setSelectedRecordIds([]);
    setCreatedCollection(null);
    createCollectionMutation.reset();
  };

  const handleClose = () => {
    // 표지 단계에서 닫아도 컬렉션은 이미 만들어져 있다 — 취소가 아니라 표지만 없는 상태다.
    // 표지 요청·폴링은 CollectionCoverModal이 언마운트되면서 함께 정리된다.
    resetState();
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  const isCoverStep = createdCollection !== null;

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
          // 표지 요청 자체는 표지 모달이 뜨면서 시작한다(CollectionCoverModal).
          onCreated?.({ collectionId: data.collectionId, title: data.title });
          setCreatedCollection(data);
        },
      },
    );
  };

  if (isCoverStep) {
    // 327: 표지 단계는 CollectionCoverModal로 떼어냈다(장소 추가 흐름과 공유). 이 자리에서
    // 폼 대신 그대로 반환하므로 라이브러리에서 보이는 화면·순서는 그대로다.
    return <CollectionCoverModal collection={createdCollection} onClose={handleClose} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pin-navy/40 p-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-lg bg-white p-6">
        <h2 className="text-sm font-bold text-pin-navy">새 컬렉션 만들기</h2>

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
