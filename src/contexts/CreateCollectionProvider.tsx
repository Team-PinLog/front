import { useMemo, useState, type ReactNode } from 'react';
import {
  CreateCollectionContext,
  initialCreateCollectionState,
  type CreateCollectionState,
  type CreateCollectionValue,
} from './CreateCollectionContext';

export function CreateCollectionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CreateCollectionState>(initialCreateCollectionState);

  const contextValue = useMemo<CreateCollectionValue>(
    () => ({
      ...state,
      open: () => setState({ isOpen: true }),
      close: () => setState(initialCreateCollectionState),
    }),
    [state],
  );

  return (
    <CreateCollectionContext.Provider value={contextValue}>
      {children}
    </CreateCollectionContext.Provider>
  );
}
