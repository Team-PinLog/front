import { useMemo, useState, type ReactNode } from 'react';
import {
  PlaceRecordSheetContext,
  initialPlaceRecordSheetState,
  type PlaceRecordSheetState,
  type PlaceRecordSheetValue,
} from './PlaceRecordSheetContext';

export function PlaceRecordSheetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlaceRecordSheetState>(initialPlaceRecordSheetState);

  const contextValue = useMemo<PlaceRecordSheetValue>(
    () => ({
      ...state,
      open: () => setState((prev) => ({ ...prev, isOpen: true })),
      close: () => setState(initialPlaceRecordSheetState),
      setSearchQuery: (query) =>
        // 검색어를 새로 입력하면 이전 검색 결과 기준으로 골랐던 선택은 더 이상 유효하지 않다.
        setState((prev) => ({ ...prev, searchQuery: query, selectedPlace: null })),
      selectPlace: (place) =>
        setState((prev) => ({
          ...prev,
          selectedPlace: place,
          searchQuery: place ? place.name : prev.searchQuery,
        })),
      setContextBody: (body) => setState((prev) => ({ ...prev, contextBody: body })),
      stageCollectionTitle: (title) =>
        setState((prev) => ({
          ...prev,
          stagedCollectionTitles: [...prev.stagedCollectionTitles, title],
        })),
      unstageCollectionTitle: (index) =>
        setState((prev) => ({
          ...prev,
          stagedCollectionTitles: prev.stagedCollectionTitles.filter((_, i) => i !== index),
        })),
    }),
    [state],
  );

  return (
    <PlaceRecordSheetContext.Provider value={contextValue}>
      {children}
    </PlaceRecordSheetContext.Provider>
  );
}
