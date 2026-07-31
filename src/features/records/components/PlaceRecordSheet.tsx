import { useState, type MouseEvent } from 'react';
import { usePlaceRecordSheet } from '@/contexts/usePlaceRecordSheet';
import { useKakaoPlaceSearch } from '@/features/places/hooks/useKakaoPlaceSearch';
import { KakaoPlaceMap } from '@/features/places/components/KakaoPlaceMap';
import type { KakaoPlace } from '@/features/places/api/searchKakaoPlaces';
import { useMyCollectionsQuery } from '@/features/collections/hooks/useMyCollectionsQuery';
import { useAddRecordsToCollectionMutation } from '@/features/collections/hooks/useAddRecordsToCollectionMutation';
import { useCreateCollectionMutation } from '@/features/collections/hooks/useCreateCollectionMutation';
import { NewCollectionModal } from '@/features/collections/components/NewCollectionModal';
import { useCreateRecordMutation } from '../hooks/useCreateRecordMutation';
import type { CreateRecordResponse } from '../api/createRecord';
import {
  PlaceRecordResult,
  type CollectionCreationOutcome,
  type ExistingCollectionAddOutcome,
} from './PlaceRecordResult';

const CONTEXT_BODY_MAX_LENGTH = 500;

function stopClick(event: MouseEvent) {
  event.stopPropagation();
}

function searchErrorMessage(error: Error): string {
  if (error.message === 'KAKAO_REST_KEY_MISSING') {
    return '카카오 REST 키가 설정되지 않았습니다.';
  }
  return '장소 검색 중 오류가 발생했습니다.';
}

/**
 * Place 검색·선택·저장 시트. 목업(Team-PinLog/mockup PinLog.responsive.dc.html homeAdd)의
 * 레이아웃만 참고하고, 상태 구조·mock 데이터·카카오 SDK 직접 호출 코드는 새로 작성했다.
 * 근거: Jira S15P11A705-136, docs/reference/08_API_명세.md 4.1·5.1.
 */
export function PlaceRecordSheet() {
  const sheet = usePlaceRecordSheet();
  const searchMutation = useKakaoPlaceSearch();
  const createMutation = useCreateRecordMutation();
  const myCollectionsQuery = useMyCollectionsQuery(sheet.isOpen);
  const addToCollectionMutation = useAddRecordsToCollectionMutation();
  const createCollectionMutation = useCreateCollectionMutation();

  // 168: 저장 시 함께 담을 기존 Collection — 서버 상태가 아닌 이 시트에서만 쓰는 UI 상태라 Context가 아닌 로컬 state로 둔다.
  // 178: 새로 만들 Collection 제목(sheet.stagedCollectionTitles)은 record가 아직 없어 함께 선택할 수 없으므로
  // 별도 흐름으로 분리했다 — PlaceRecordSheetContext에서 관리한다(sheet.close()에서 자동 리셋).
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<number[]>([]);
  const [selectedCollectionTitles, setSelectedCollectionTitles] = useState<Record<number, string>>(
    {},
  );
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] = useState(false);
  const [isAddingToCollections, setIsAddingToCollections] = useState(false);
  const [existingCollectionAddResults, setExistingCollectionAddResults] = useState<
    ExistingCollectionAddOutcome[] | null
  >(null);
  const [collectionCreationResults, setCollectionCreationResults] = useState<
    CollectionCreationOutcome[] | null
  >(null);

  if (!sheet.isOpen) {
    return null;
  }

  const handleClose = () => {
    sheet.close();
    searchMutation.reset();
    createMutation.reset();
    setSelectedCollectionIds([]);
    setSelectedCollectionTitles({});
    setIsNewCollectionModalOpen(false);
    setIsAddingToCollections(false);
    setExistingCollectionAddResults(null);
    setCollectionCreationResults(null);
  };

  const toggleCollection = (collectionId: number, title: string) => {
    setSelectedCollectionIds((prev) =>
      prev.includes(collectionId)
        ? prev.filter((id) => id !== collectionId)
        : [...prev, collectionId],
    );
    setSelectedCollectionTitles((prev) => ({ ...prev, [collectionId]: title }));
  };

  const handleSearch = () => {
    const query = sheet.searchQuery.trim();
    if (!query) {
      return;
    }
    searchMutation.mutate(query);
  };

  const handleSelect = (place: KakaoPlace) => {
    sheet.selectPlace(place);
    searchMutation.reset();
  };

  const handleSave = async () => {
    const place = sheet.selectedPlace;
    const contextBody = sheet.contextBody.trim();
    if (!place || !contextBody) {
      return;
    }

    let created: CreateRecordResponse;
    try {
      created = await createMutation.mutateAsync({ place, contextBody });
    } catch {
      return;
    }

    // 178: stagedCollectionTitles가 비어있으면 map이 빈 배열이라 mutateAsync가 전혀 호출되지 않는다
    // (컬렉션 생성 API 호출 없음). 기록 저장은 이미 성공했으므로 아래 컬렉션 작업의 성패와 무관하게 롤백하지 않는다.
    const stagedTitles = sheet.stagedCollectionTitles;

    setIsAddingToCollections(true);
    const [addResults, createResults] = await Promise.all([
      Promise.allSettled(
        selectedCollectionIds.map((collectionId) =>
          addToCollectionMutation.mutateAsync({ collectionId, recordIds: [created.recordId] }),
        ),
      ),
      Promise.allSettled(
        stagedTitles.map((title) =>
          createCollectionMutation.mutateAsync({ title, recordIds: [created.recordId] }),
        ),
      ),
    ]);
    setIsAddingToCollections(false);

    setExistingCollectionAddResults(
      addResults.map((result, index) => {
        const collectionId = selectedCollectionIds[index];
        return {
          collectionId,
          title: selectedCollectionTitles[collectionId] ?? '컬렉션',
          status: result.status === 'fulfilled' ? 'success' : 'error',
        };
      }),
    );

    setCollectionCreationResults(
      createResults.map((result, index) => ({
        title: stagedTitles[index],
        status: result.status === 'fulfilled' ? 'success' : 'error',
      })),
    );
  };

  const searchResults = searchMutation.data ?? [];
  const showResults = searchMutation.isSuccess && !sheet.selectedPlace && searchResults.length > 0;
  const showEmptyResult =
    searchMutation.isSuccess && !sheet.selectedPlace && searchResults.length === 0;
  const savedRecord =
    createMutation.isSuccess && existingCollectionAddResults && collectionCreationResults
      ? createMutation.data
      : null;
  const isSaving = createMutation.isPending || isAddingToCollections;
  const myCollections = myCollectionsQuery.isSuccess
    ? myCollectionsQuery.data.pages.flatMap((page) => page.items)
    : [];

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-pin-navy/40 p-6 backdrop-blur-sm"
        onClick={handleClose}
        role="presentation"
      >
        <div
          className="flex h-[min(560px,calc(100dvh-88px))] w-[min(1024px,calc(100vw-48px))] items-stretch gap-6"
          onClick={stopClick}
        >
          <div className="hidden flex-1 md:block">
            <KakaoPlaceMap place={sheet.selectedPlace} />
          </div>

          <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-line-card bg-paper-white shadow-xl md:w-[420px] md:flex-none">
            {savedRecord && existingCollectionAddResults && collectionCreationResults ? (
              <PlaceRecordResult
                data={savedRecord}
                existingCollectionAddResults={existingCollectionAddResults}
                collectionCreationResults={collectionCreationResults}
                onClose={handleClose}
              />
            ) : (
              <>
                <div className="flex items-center justify-between gap-4 border-b border-line-subtle px-6 py-5">
                  <div>
                    <div className="text-[11px] font-bold tracking-[0.12em] text-log-mint">
                      PLACE RECORD
                    </div>
                    <div className="mt-1 text-xl font-bold text-pin-navy">장소 기록</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label="장소 기록 닫기"
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-pin-navy/10 text-pin-navy"
                  >
                    ×
                  </button>
                </div>

                <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-5">
                  <label
                    htmlFor="place-search-input"
                    className="text-[11px] font-bold tracking-[0.12em] text-log-mint"
                  >
                    장소 검색
                  </label>
                  <div className="relative flex gap-2">
                    <input
                      id="place-search-input"
                      type="text"
                      value={sheet.searchQuery}
                      onChange={(event) => sheet.setSearchQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleSearch();
                        }
                      }}
                      placeholder="장소명 또는 지역을 입력하세요"
                      autoComplete="off"
                      className="h-12 flex-1 rounded-lg border border-pin-navy/15 bg-white px-3 text-sm text-pin-navy outline-none placeholder:text-ink-gray-light focus:border-log-mint focus:ring-2 focus:ring-log-mint/20"
                    />
                    <button
                      type="button"
                      onClick={handleSearch}
                      disabled={!sheet.searchQuery.trim() || searchMutation.isPending}
                      className="h-12 flex-none rounded-lg bg-pin-navy px-4 text-sm font-bold text-white disabled:opacity-40"
                    >
                      {searchMutation.isPending ? '검색 중…' : '검색'}
                    </button>

                    {showResults && (
                      <div className="absolute left-0 right-0 top-[54px] z-10 max-h-40 overflow-y-auto rounded-lg border border-pin-navy/10 bg-white shadow-lg">
                        {searchResults.map((place) => (
                          <button
                            key={place.kakaoPlaceId}
                            type="button"
                            onClick={() => handleSelect(place)}
                            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-log-mint/5"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-pin-navy">
                                {place.name}
                              </span>
                              <span className="block truncate text-xs text-ink-gray">
                                📍 {place.roadAddress || place.address}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {showEmptyResult && (
                    <p className="text-xs text-ink-gray">검색 결과가 없습니다.</p>
                  )}
                  {searchMutation.isError && (
                    <p className="text-xs text-red-600">
                      {searchErrorMessage(searchMutation.error)}
                    </p>
                  )}
                  {sheet.selectedPlace && (
                    <p className="text-xs font-semibold text-log-mint">
                      📍 {sheet.selectedPlace.name} ·{' '}
                      {sheet.selectedPlace.roadAddress || sheet.selectedPlace.address}
                    </p>
                  )}

                  <label
                    htmlFor="place-context-body"
                    className="text-[11px] font-bold tracking-[0.12em] text-log-mint"
                  >
                    기록할 내용
                  </label>
                  <textarea
                    id="place-context-body"
                    value={sheet.contextBody}
                    onChange={(event) => sheet.setContextBody(event.target.value)}
                    maxLength={CONTEXT_BODY_MAX_LENGTH}
                    placeholder="이 장소에서 기억하고 싶은 맥락을 적어보세요"
                    className="min-h-[140px] flex-1 resize-none rounded-lg border border-pin-navy/15 bg-white p-3 text-sm leading-relaxed text-pin-navy outline-none placeholder:text-ink-gray-light focus:border-log-mint focus:ring-2 focus:ring-log-mint/20"
                  />
                  <p className="text-right text-[11px] text-ink-gray-light">
                    {sheet.contextBody.length}/{CONTEXT_BODY_MAX_LENGTH}
                  </p>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold tracking-[0.12em] text-log-mint">
                      추가할 컬렉션 · 선택 사항
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsNewCollectionModalOpen(true)}
                      className="text-xs font-bold text-log-mint"
                    >
                      + 컬렉션 생성
                    </button>
                  </div>

                  {sheet.stagedCollectionTitles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {sheet.stagedCollectionTitles.map((title, index) => (
                        <span
                          key={`${title}-${index}`}
                          className="flex items-center gap-1.5 rounded-full border border-dashed border-log-mint px-3 py-1.5 text-xs font-bold text-log-mint"
                        >
                          {title}
                          <button
                            type="button"
                            onClick={() => sheet.unstageCollectionTitle(index)}
                            aria-label={`${title} 컬렉션 생성 취소`}
                            className="text-log-mint/70 hover:text-log-mint"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {myCollectionsQuery.isPending && (
                    <p className="text-xs text-ink-gray">컬렉션을 불러오는 중…</p>
                  )}
                  {myCollectionsQuery.isError && (
                    <p className="text-xs text-red-600">컬렉션을 불러오지 못했어요.</p>
                  )}
                  {myCollectionsQuery.isSuccess && myCollections.length === 0 && (
                    <p className="text-xs text-ink-gray">아직 만든 컬렉션이 없어요.</p>
                  )}
                  {myCollections.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {myCollections.map((collection) => {
                        const isSelected = selectedCollectionIds.includes(collection.collectionId);
                        return (
                          <button
                            key={collection.collectionId}
                            type="button"
                            onClick={() =>
                              toggleCollection(collection.collectionId, collection.title)
                            }
                            aria-pressed={isSelected}
                            className={
                              isSelected
                                ? 'rounded-full border border-log-mint bg-log-mint/10 px-3 py-1.5 text-xs font-bold text-log-mint'
                                : 'rounded-full border border-pin-navy/15 px-3 py-1.5 text-xs font-bold text-pin-navy'
                            }
                          >
                            {collection.title}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {createMutation.isError && (
                    <p className="text-xs text-red-600">{createMutation.error.message}</p>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      void handleSave();
                    }}
                    disabled={!sheet.selectedPlace || !sheet.contextBody.trim() || isSaving}
                    className="h-12 flex-none rounded-lg bg-log-mint text-sm font-bold text-pin-navy disabled:opacity-40"
                  >
                    {isSaving ? '저장 중…' : '저장'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <NewCollectionModal
        isOpen={isNewCollectionModalOpen}
        mode="fromNewRecord"
        onClose={() => setIsNewCollectionModalOpen(false)}
        onTitleStaged={(title) => sheet.stageCollectionTitle(title)}
      />
    </>
  );
}
