import { useInfiniteQuery } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { getCollectionDetail, type CollectionDetail } from '../api/getCollectionDetail';

// collectionId 없이 "모든 Collection 상세 쿼리"를 가리키는 접두사. TanStack Query의 invalidateQueries는
// 기본적으로 접두사 일치(exact:false)라, 이 키만으로 마운트된 모든 collectionDetailQueryKey(...)를
// 무효화할 수 있다 — Context를 어느 Collection이 보여주고 있는지 모르는 records 도메인 훅
// (useUpdateContextMutation·useDeleteContextMutation)이 이 접두사를 가져다 쓴다.
export function collectionDetailQueryKeyPrefix() {
  return ['collections', 'detail'] as const;
}

export function collectionDetailQueryKey(collectionId: number) {
  return [...collectionDetailQueryKeyPrefix(), collectionId] as const;
}

// PC 웹 펼침 UX: recordSize 기본값(1)은 모바일 책 넘김 기준이라, 웹은 2를 명시해서 요청한다
// (docs/api-contract.md Collection: "모바일 = 1, 웹 펼침 = 2로 명시해서 요청한다").
const RECORD_PAGE_SIZE = 2;

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
// TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
// 페이지마다 전체 CollectionDetail DTO가 오므로(7.3), title·ownedByMe 등은 pages[0]에서, Record 목록은
// pages를 flatMap해서 읽는다 — 호출부(CollectionDetailView)의 책임이다.
export function useCollectionDetailQuery(collectionId: number) {
  return useInfiniteQuery<CollectionDetail, ApiError>({
    queryKey: collectionDetailQueryKey(collectionId),
    // TQueryFnData·TError만 명시하면 TPageParam은 추론되지 않고 기본값 unknown이 된다(명시적 타입 인자는
    // 나머지 인자의 추론을 막는 TS 동작) — pageParam이 string|undefined라는 건 initialPageParam·getNextPageParam
    // 구현으로 보장되므로 여기서만 좁혀서 쓴다.
    queryFn: ({ pageParam }) =>
      getCollectionDetail(collectionId, {
        recordCursor: pageParam as string | undefined,
        recordSize: RECORD_PAGE_SIZE,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.records.hasNext ? (lastPage.records.nextCursor ?? undefined) : undefined,
  });
}
