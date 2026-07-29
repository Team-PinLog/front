import { useMemo, useState, type ReactNode } from 'react';
import {
  EditCollectionTitleContext,
  initialEditCollectionTitleState,
  type EditCollectionTitleState,
  type EditCollectionTitleValue,
} from './EditCollectionTitleContext';

export function EditCollectionTitleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EditCollectionTitleState>(initialEditCollectionTitleState);

  const contextValue = useMemo<EditCollectionTitleValue>(
    () => ({
      ...state,
      open: () => setState({ isOpen: true }),
      close: () => setState(initialEditCollectionTitleState),
    }),
    [state],
  );

  return (
    <EditCollectionTitleContext.Provider value={contextValue}>
      {children}
    </EditCollectionTitleContext.Provider>
  );
}
