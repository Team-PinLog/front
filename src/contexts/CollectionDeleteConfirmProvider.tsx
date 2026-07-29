import { useMemo, useState, type ReactNode } from 'react';
import {
  CollectionDeleteConfirmContext,
  initialCollectionDeleteConfirmState,
  type CollectionDeleteConfirmState,
  type CollectionDeleteConfirmTrigger,
  type CollectionDeleteConfirmValue,
} from './CollectionDeleteConfirmContext';

export function CollectionDeleteConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CollectionDeleteConfirmState>(
    initialCollectionDeleteConfirmState,
  );

  const contextValue = useMemo<CollectionDeleteConfirmValue>(
    () => ({
      ...state,
      open: (trigger: CollectionDeleteConfirmTrigger) => setState({ isOpen: true, trigger }),
      close: () => setState(initialCollectionDeleteConfirmState),
    }),
    [state],
  );

  return (
    <CollectionDeleteConfirmContext.Provider value={contextValue}>
      {children}
    </CollectionDeleteConfirmContext.Provider>
  );
}
