import { useContext } from 'react';
import { CreateCollectionContext, type CreateCollectionValue } from './CreateCollectionContext';

export function useCreateCollection(): CreateCollectionValue {
  const ctx = useContext(CreateCollectionContext);
  if (!ctx) {
    throw new Error('useCreateCollection은 CreateCollectionProvider 내부에서만 사용할 수 있다.');
  }
  return ctx;
}
