import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { collectionDetailQueryKeyPrefix } from '@/features/collections/hooks/useCollectionDetailQuery';
import { updateRecordContext, type UpdateRecordContextResponse } from '../api/updateRecordContext';
import { recordDetailQueryKey } from './useRecordDetailQuery';

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
// recordId를 Hook 인자가 아니라 mutate 변수로 받는다 — 호출부(ContextStickyNoteCard)가 여러 Record의
// 카드를 동시에 다룰 수 있는 화면(165 홈 등)에서도 인스턴스를 다시 만들 필요 없이 재사용할 수 있게 한다.
// 응답의 새 contextId로 캐시를 직접 patch하지 않고 Record 상세 쿼리를 invalidate해 서버 재조회로 받는다
// (05-1_파트간_요구사항.md 1.1 — 구 contextId를 재사용하지 않는다. useDeleteContextMutation과 동일 패턴).
export interface UpdateContextVariables {
  recordId: number;
  contextId: number;
  body: string;
}

export function useUpdateContextMutation() {
  const queryClient = useQueryClient();

  return useMutation<UpdateRecordContextResponse, ApiError, UpdateContextVariables>({
    mutationFn: ({ recordId, contextId, body }) =>
      updateRecordContext({ recordId, contextId, body }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: recordDetailQueryKey(variables.recordId) });
      // 이 Context를 Collection 상세(우측 페이지)가 보여주고 있을 수도 있다 — 그 화면은 별도의
      // collectionDetailQueryKey(무한 쿼리) 캐시를 읽으므로 위 recordDetailQueryKey 무효화만으로는
      // 갱신되지 않는다. 어느 Collection인지 이 훅은 알 수 없어(레코드가 여러 Collection에 속할 수
      // 있음) collectionId 없이 접두사로 무효화한다 — invalidateQueries는 기본이 접두사 일치
      // (exact:false)라 마운트된 collectionDetailQueryKey(...)를 전부 잡고, 매칭되는 마운트 쿼리가
      // 없으면 안전하게 no-op이다(collectionDetailQueryKeyPrefix.test.ts로 확인).
      queryClient.invalidateQueries({ queryKey: collectionDetailQueryKeyPrefix() });
    },
  });
}
