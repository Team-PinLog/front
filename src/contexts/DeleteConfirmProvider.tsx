import { useMemo, useState, type ReactNode } from 'react';
import {
  DeleteConfirmContext,
  initialDeleteConfirmState,
  type DeleteConfirmImpact,
  type DeleteConfirmState,
  type DeleteConfirmValue,
} from './DeleteConfirmContext';

export function DeleteConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DeleteConfirmState>(initialDeleteConfirmState);

  const contextValue = useMemo<DeleteConfirmValue>(
    () => ({
      ...state,
      open: (targetContextId: number, impact: DeleteConfirmImpact) =>
        setState({ isOpen: true, impact, targetContextId }),
      close: () => setState(initialDeleteConfirmState),
    }),
    [state],
  );

  return (
    <DeleteConfirmContext.Provider value={contextValue}>{children}</DeleteConfirmContext.Provider>
  );
}
