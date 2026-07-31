import { useContext } from 'react';
import { AddToCollectionContext, type AddToCollectionValue } from './AddToCollectionContext';

export function useAddToCollection(): AddToCollectionValue {
  const ctx = useContext(AddToCollectionContext);
  if (!ctx) {
    throw new Error('useAddToCollection은 AddToCollectionProvider 내부에서만 사용할 수 있다.');
  }
  return ctx;
}
