import { useInfiniteQuery } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { getMyCollections, type MyCollectionsPage } from '../api/getMyCollections';

// 141/144 공통 쿼리 키: 139(생성)·140(삭제) mutation의 invalidateQueries가 이 키를 참조한다 — 변경 시 함께 맞춘다.
export const myCollectionsQueryKey = ['collections', 'list'] as const;

const PAGE_SIZE = 10;

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
// props 없이 내부에서 직접 호출하는 형태로 둔다 — MyShelfList가 144(Library)에서도 그대로 재사용할 수 있도록.
export function useMyCollectionsQuery() {
  return useInfiniteQuery<MyCollectionsPage, ApiError>({
    queryKey: myCollectionsQueryKey,
    queryFn: ({ pageParam }) =>
      getMyCollections({ cursor: pageParam as string | undefined, size: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? (lastPage.nextCursor ?? undefined) : undefined,
  });
}
