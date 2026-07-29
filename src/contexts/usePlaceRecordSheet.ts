import { useContext } from 'react';
import { PlaceRecordSheetContext, type PlaceRecordSheetValue } from './PlaceRecordSheetContext';

export function usePlaceRecordSheet(): PlaceRecordSheetValue {
  const ctx = useContext(PlaceRecordSheetContext);
  if (!ctx) {
    throw new Error('usePlaceRecordSheet는 PlaceRecordSheetProvider 내부에서만 사용할 수 있다.');
  }
  return ctx;
}
