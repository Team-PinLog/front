import { useMemo, useState, type ReactNode } from 'react';
import {
  CollectionSpreadContext,
  initialCollectionSpreadState,
  type CollectionSpreadState,
  type CollectionSpreadValue,
} from './CollectionSpreadContext';

export function CollectionSpreadProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CollectionSpreadState>(initialCollectionSpreadState);

  const contextValue = useMemo<CollectionSpreadValue>(
    () => ({
      ...state,
      goToNext: () => setState((prev) => ({ spreadIndex: prev.spreadIndex + 1 })),
      goToPrevious: () => setState((prev) => ({ spreadIndex: Math.max(0, prev.spreadIndex - 1) })),
    }),
    [state],
  );

  return (
    <CollectionSpreadContext.Provider value={contextValue}>
      {children}
    </CollectionSpreadContext.Provider>
  );
}
