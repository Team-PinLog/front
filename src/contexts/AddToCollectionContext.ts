import { createContext } from 'react';

/**
 * Record 상세에서 여는 "컬렉션에 담기" 다이얼로그의 UI 상태.
 * 근거: docs/architecture.md 3장 — 서버와 무관한 화면 상태는 Context로 관리한다.
 * 이 다이얼로그는 기존 컬렉션에 담기 + 새 컬렉션 만들기를 한 화면에서 처리한다(S15P11A705-216,
 * 09_유저플로우.md 6장 "기록을 담는 진입점은 양방향입니다").
 * recordId는 이 다이얼로그가 마운트된 화면에 이미 고정된 값이라 Context에 넣지 않고 컴포넌트 prop으로 전달한다
 * (DeleteConfirmContext의 targetContextId와 달리, 여기서는 상태로 복제할 필요가 없다).
 * 담기/생성 성공·실패 같은 서버 상태는 useAddRecordsToCollectionMutation·useCreateCollectionMutation
 * (TanStack Query)이 소유한다.
 */
export interface AddToCollectionState {
  isOpen: boolean;
}

export interface AddToCollectionValue extends AddToCollectionState {
  open(): void;
  close(): void;
}

export const initialAddToCollectionState: AddToCollectionState = {
  isOpen: false,
};

export const AddToCollectionContext = createContext<AddToCollectionValue | null>(null);
