import { useMemo, useState, type ReactNode } from 'react';
import {
  WithdrawConfirmContext,
  initialWithdrawConfirmState,
  type WithdrawConfirmState,
  type WithdrawConfirmValue,
} from './WithdrawConfirmContext';

export function WithdrawConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WithdrawConfirmState>(initialWithdrawConfirmState);

  const contextValue = useMemo<WithdrawConfirmValue>(
    () => ({
      ...state,
      open: () => setState({ isOpen: true }),
      close: () => setState(initialWithdrawConfirmState),
    }),
    [state],
  );

  return (
    <WithdrawConfirmContext.Provider value={contextValue}>
      {children}
    </WithdrawConfirmContext.Provider>
  );
}
