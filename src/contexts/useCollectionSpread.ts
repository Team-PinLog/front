import { useContext } from 'react';
import { CollectionSpreadContext, type CollectionSpreadValue } from './CollectionSpreadContext';

export function useCollectionSpread(): CollectionSpreadValue {
  const ctx = useContext(CollectionSpreadContext);
  if (!ctx) {
    throw new Error('useCollectionSpread은 CollectionSpreadProvider 내부에서만 사용할 수 있다.');
  }
  return ctx;
}
