import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import {
  createRecord,
  type CreateRecordRequest,
  type CreateRecordResponse,
} from '../api/createRecord';

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
export function useCreateRecordMutation() {
  return useMutation<CreateRecordResponse, ApiError, CreateRecordRequest>({
    mutationFn: createRecord,
  });
}
