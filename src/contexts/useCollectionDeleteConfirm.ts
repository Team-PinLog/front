import { useContext } from 'react';
import {
  CollectionDeleteConfirmContext,
  type CollectionDeleteConfirmValue,
} from './CollectionDeleteConfirmContext';

export function useCollectionDeleteConfirm(): CollectionDeleteConfirmValue {
  const ctx = useContext(CollectionDeleteConfirmContext);
  if (!ctx) {
    throw new Error(
      'useCollectionDeleteConfirm은 CollectionDeleteConfirmProvider 내부에서만 사용할 수 있다.',
    );
  }
  return ctx;
}
