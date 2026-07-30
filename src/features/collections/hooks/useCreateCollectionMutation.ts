import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import {
  createCollection,
  type CreateCollectionRequest,
  type CreateCollectionResponse,
} from '../api/createCollection';
import { myCollectionsQueryKey } from './useMyCollectionsQuery';

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
// 성공 콜백(모달 닫기 등)은 컴포넌트가 mutate()의 onSuccess로 처리한다 — 이 Hook은 부수효과를 최소화한다.
export function useCreateCollectionMutation() {
  const queryClient = useQueryClient();

  return useMutation<CreateCollectionResponse, ApiError, CreateCollectionRequest>({
    mutationFn: createCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myCollectionsQueryKey });
    },
  });
}
