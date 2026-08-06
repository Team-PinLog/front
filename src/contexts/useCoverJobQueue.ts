import { useContext } from 'react';
import { CoverJobContext, type CoverJobQueueValue } from './CoverJobContext';

export function useCoverJobQueue(): CoverJobQueueValue {
  const ctx = useContext(CoverJobContext);
  if (!ctx) {
    throw new Error('useCoverJobQueue는 CoverJobProvider 내부에서만 사용할 수 있다.');
  }
  return ctx;
}
