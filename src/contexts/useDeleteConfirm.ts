import { useContext } from 'react';
import { DeleteConfirmContext, type DeleteConfirmValue } from './DeleteConfirmContext';

export function useDeleteConfirm(): DeleteConfirmValue {
  const ctx = useContext(DeleteConfirmContext);
  if (!ctx) {
    throw new Error('useDeleteConfirm은 DeleteConfirmProvider 내부에서만 사용할 수 있다.');
  }
  return ctx;
}
