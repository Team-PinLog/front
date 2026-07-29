import { createContext } from 'react';

/**
 * Collection 상세에서 여는 제목 수정 모달의 UI 상태.
 * 근거: docs/architecture.md 3장 — 서버와 무관한 화면 상태는 Context로 관리한다.
 * 근거: Jira S15P11A705-140, docs/reference/08_API_명세.md 7.4.
 * collectionId는 이 모달이 마운트된 화면(CollectionDetailPage)에 이미 고정된 값이라 Context에 넣지 않고
 * 컴포넌트 prop으로 전달한다(CreateCollectionContext의 recordId와 동일한 이유).
 * 수정 성공/실패 같은 서버 상태는 useUpdateCollectionTitleMutation(TanStack Query)이 소유한다.
 */
export interface EditCollectionTitleState {
  isOpen: boolean;
}

export interface EditCollectionTitleValue extends EditCollectionTitleState {
  open(): void;
  close(): void;
}

export const initialEditCollectionTitleState: EditCollectionTitleState = {
  isOpen: false,
};

export const EditCollectionTitleContext = createContext<EditCollectionTitleValue | null>(null);
