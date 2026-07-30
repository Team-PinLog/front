import { useInfiniteQuery } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { getMyCollections, type MyCollectionsPage } from '../api/getMyCollections';

// 141/144 공통 쿼리 키: 139(생성)·140(삭제) mutation의 invalidateQueries가 이 키를 참조한다 — 변경 시 함께 맞춘다.
export const myCollectionsQueryKey = ['collections', 'list'] as const;

const PAGE_SIZE = 10;

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
// enabled 기본값 true로 둔다 — MyShelfList(144)처럼 항상 보이는 화면은 인자 없이 그대로 쓰고,
// 168(PlaceRecordSheet)처럼 시트가 닫혀 있어도 항상 마운트된 컴포넌트는 sheet.isOpen을 넘겨 불필요한
// 요청을 막는다(useMyRecordListQuery.ts와 동일 패턴).
export function useMyCollectionsQuery(enabled = true) {
  return useInfiniteQuery<MyCollectionsPage, ApiError>({
    queryKey: myCollectionsQueryKey,
    queryFn: ({ pageParam }) =>
      getMyCollections({ cursor: pageParam as string | undefined, size: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? (lastPage.nextCursor ?? undefined) : undefined,
    enabled,
  });
}
