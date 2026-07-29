import { createContext } from 'react';
import type { KakaoPlace } from '@/features/places/api/searchKakaoPlaces';

/**
 * Place 검색·선택 시트(구 목업 homeAdd)의 UI 상태.
 * 근거: docs/architecture.md 3장 — 서버와 무관한 화면 상태(검색어 입력, 지도 선택)는 Context로 관리한다.
 * 카카오 검색 결과·Record 생성 응답 같은 서버 상태는 여기서 들고 있지 않는다(각 Query/Mutation Hook 소유).
 */
export interface PlaceRecordSheetState {
  isOpen: boolean;
  searchQuery: string;
  selectedPlace: KakaoPlace | null;
  contextBody: string;
}

export interface PlaceRecordSheetValue extends PlaceRecordSheetState {
  open(): void;
  close(): void;
  setSearchQuery(query: string): void;
  selectPlace(place: KakaoPlace | null): void;
  setContextBody(body: string): void;
}

export const initialPlaceRecordSheetState: PlaceRecordSheetState = {
  isOpen: false,
  searchQuery: '',
  selectedPlace: null,
  contextBody: '',
};

export const PlaceRecordSheetContext = createContext<PlaceRecordSheetValue | null>(null);
