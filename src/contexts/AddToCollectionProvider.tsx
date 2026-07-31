import { useMemo, useState, type ReactNode } from 'react';
import {
  AddToCollectionContext,
  initialAddToCollectionState,
  type AddToCollectionState,
  type AddToCollectionValue,
} from './AddToCollectionContext';

export function AddToCollectionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AddToCollectionState>(initialAddToCollectionState);

  const contextValue = useMemo<AddToCollectionValue>(
    () => ({
      ...state,
      open: () => setState({ isOpen: true }),
      close: () => setState(initialAddToCollectionState),
    }),
    [state],
  );

  return (
    <AddToCollectionContext.Provider value={contextValue}>
      {children}
    </AddToCollectionContext.Provider>
  );
}
