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
  // 178: "+ 컬렉션 생성"으로 입력만 받아둔 제목들 — 아직 서버에 없는 record 대상이라 서버 상태가 아닌
  // 이 시트 전용 UI 상태다. record 저장 성공 후 호출부가 각 제목으로 createCollection을 호출한다.
  stagedCollectionTitles: string[];
}

export interface PlaceRecordSheetValue extends PlaceRecordSheetState {
  open(): void;
  close(): void;
  setSearchQuery(query: string): void;
  selectPlace(place: KakaoPlace | null): void;
  setContextBody(body: string): void;
  stageCollectionTitle(title: string): void;
  unstageCollectionTitle(index: number): void;
}

export const initialPlaceRecordSheetState: PlaceRecordSheetState = {
  isOpen: false,
  searchQuery: '',
  selectedPlace: null,
  contextBody: '',
  stagedCollectionTitles: [],
};

export const PlaceRecordSheetContext = createContext<PlaceRecordSheetValue | null>(null);
