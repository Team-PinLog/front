import { createContext } from 'react';

/**
 * Collection 삭제 확인 모달의 UI 상태.
 * 근거: docs/architecture.md 3장 — 서버와 무관한 화면 상태는 Context로 관리한다.
 * 근거: Jira S15P11A705-140, docs/reference/08_API_명세.md 7.6.
 * 두 진입 경로를 trigger로 구분한다.
 * - 'direct': 상세 화면의 삭제 버튼.
 * - 'lastRecordRemoval': 마지막 Record 제거 시도(409 DELETE_CONFIRMATION_REQUIRED).
 * 어느 쪽이든 확인 시 호출하는 API(DELETE /collections/{collectionId})는 동일해 targetCollectionId는 두지 않는다
 * — 이 모달이 마운트된 화면(CollectionDetailPage)에 collectionId가 이미 고정돼 있다(AddToCollectionContext의
 * recordId와 동일한 이유). 삭제 자체의 성공/실패(서버 상태)는 useDeleteCollectionMutation(TanStack Query)이 소유한다.
 */
export type CollectionDeleteConfirmTrigger = 'direct' | 'lastRecordRemoval';

export interface CollectionDeleteConfirmState {
  isOpen: boolean;
  trigger: CollectionDeleteConfirmTrigger | null;
}

export interface CollectionDeleteConfirmValue extends CollectionDeleteConfirmState {
  open(trigger: CollectionDeleteConfirmTrigger): void;
  close(): void;
}

export const initialCollectionDeleteConfirmState: CollectionDeleteConfirmState = {
  isOpen: false,
  trigger: null,
};

export const CollectionDeleteConfirmContext = createContext<CollectionDeleteConfirmValue | null>(
  null,
);
