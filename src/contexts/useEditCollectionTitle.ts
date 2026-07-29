import { useContext } from 'react';
import {
  EditCollectionTitleContext,
  type EditCollectionTitleValue,
} from './EditCollectionTitleContext';

export function useEditCollectionTitle(): EditCollectionTitleValue {
  const ctx = useContext(EditCollectionTitleContext);
  if (!ctx) {
    throw new Error(
      'useEditCollectionTitle은 EditCollectionTitleProvider 내부에서만 사용할 수 있다.',
    );
  }
  return ctx;
}
