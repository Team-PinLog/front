import { useContext } from 'react';
import { WithdrawConfirmContext, type WithdrawConfirmValue } from './WithdrawConfirmContext';

export function useWithdrawConfirm(): WithdrawConfirmValue {
  const ctx = useContext(WithdrawConfirmContext);
  if (!ctx) {
    throw new Error('useWithdrawConfirm은 WithdrawConfirmProvider 내부에서만 사용할 수 있다.');
  }
  return ctx;
}
