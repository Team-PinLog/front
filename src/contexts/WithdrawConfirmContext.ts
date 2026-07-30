import { createContext } from 'react';

/**
 * 회원 탈퇴 확인 다이얼로그의 UI 상태.
 * 근거: docs/architecture.md 3장 — 서버와 무관한 화면 상태는 Context로 관리한다.
 * 근거: Jira S15P11A705-162, docs/reference/08_API_명세.md 3.6.
 * 탈퇴 자체의 성공/실패(서버 상태)는 useDeleteAccountMutation(TanStack Query)이 소유한다.
 */
export interface WithdrawConfirmState {
  isOpen: boolean;
}

export interface WithdrawConfirmValue extends WithdrawConfirmState {
  open(): void;
  close(): void;
}

export const initialWithdrawConfirmState: WithdrawConfirmState = {
  isOpen: false,
};

export const WithdrawConfirmContext = createContext<WithdrawConfirmValue | null>(null);
