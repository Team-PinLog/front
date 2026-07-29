import type { MouseEvent } from 'react';
import { usePlaceRecordSheet } from '@/contexts/usePlaceRecordSheet';
import { useKakaoPlaceSearch } from '@/features/places/hooks/useKakaoPlaceSearch';
import { KakaoPlaceMap } from '@/features/places/components/KakaoPlaceMap';
import type { KakaoPlace } from '@/features/places/api/searchKakaoPlaces';
import { useCreateRecordMutation } from '../hooks/useCreateRecordMutation';
import { PlaceRecordResult } from './PlaceRecordResult';

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

  if (!sheet.isOpen) {
    return null;
  }

  const handleClose = () => {
    sheet.close();
    searchMutation.reset();
    createMutation.reset();
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

  const handleSave = () => {
    const place = sheet.selectedPlace;
    const contextBody = sheet.contextBody.trim();
    if (!place || !contextBody) {
      return;
    }
    createMutation.mutate({ place, contextBody });
  };

  const searchResults = searchMutation.data ?? [];
  const showResults = searchMutation.isSuccess && !sheet.selectedPlace && searchResults.length > 0;
  const showEmptyResult =
    searchMutation.isSuccess && !sheet.selectedPlace && searchResults.length === 0;
  const savedRecord = createMutation.isSuccess ? createMutation.data : null;

  return (
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
          {savedRecord ? (
            <PlaceRecordResult data={savedRecord} onClose={handleClose} />
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

                {showEmptyResult && <p className="text-xs text-ink-gray">검색 결과가 없습니다.</p>}
                {searchMutation.isError && (
                  <p className="text-xs text-red-600">{searchErrorMessage(searchMutation.error)}</p>
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

                {createMutation.isError && (
                  <p className="text-xs text-red-600">{createMutation.error.message}</p>
                )}

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={
                    !sheet.selectedPlace || !sheet.contextBody.trim() || createMutation.isPending
                  }
                  className="h-12 flex-none rounded-lg bg-log-mint text-sm font-bold text-pin-navy disabled:opacity-40"
                >
                  {createMutation.isPending ? '저장 중…' : '저장'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
