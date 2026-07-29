import { createContext } from 'react';
import type { ApiError } from '@/shared/http/types';

/**
 * Record 강제 삭제 확인 모달의 UI 상태.
 * 근거: docs/architecture.md 3장 — 서버와 무관한 화면 상태는 Context로 관리한다.
 * impact는 409(DELETE_CONFIRMATION_REQUIRED) 응답 그대로이며, 강제 삭제 자체의 성공/실패(서버 상태)는
 * useForceDeleteRecordMutation(TanStack Query)이 소유한다 — 여기서 들고 있지 않는다.
 */
export type DeleteConfirmImpact = NonNullable<ApiError['impact']>;

export interface DeleteConfirmState {
  isOpen: boolean;
  impact: DeleteConfirmImpact | null;
  targetContextId: number | null;
}

export interface DeleteConfirmValue extends DeleteConfirmState {
  open(targetContextId: number, impact: DeleteConfirmImpact): void;
  close(): void;
}

export const initialDeleteConfirmState: DeleteConfirmState = {
  isOpen: false,
  impact: null,
  targetContextId: null,
};

export const DeleteConfirmContext = createContext<DeleteConfirmValue | null>(null);
