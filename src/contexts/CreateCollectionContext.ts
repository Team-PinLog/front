import { createContext } from 'react';

/**
 * Record 상세에서 여는 Collection 생성 모달의 UI 상태.
 * 근거: docs/architecture.md 3장 — 서버와 무관한 화면 상태는 Context로 관리한다.
 * recordId는 이 모달이 마운트된 화면에 이미 고정된 값이라 Context에 넣지 않고 컴포넌트 prop으로 전달한다
 * (DeleteConfirmContext의 targetContextId와 달리, 여기서는 상태로 복제할 필요가 없다).
 * 생성 성공/실패 같은 서버 상태는 useCreateCollectionMutation(TanStack Query)이 소유한다.
 */
export interface CreateCollectionState {
  isOpen: boolean;
}

export interface CreateCollectionValue extends CreateCollectionState {
  open(): void;
  close(): void;
}

export const initialCreateCollectionState: CreateCollectionState = {
  isOpen: false,
};

export const CreateCollectionContext = createContext<CreateCollectionValue | null>(null);
