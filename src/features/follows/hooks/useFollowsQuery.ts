import { useInfiniteQuery } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { getFollows, type FollowListPage } from '../api/getFollows';

// Library(144)의 "팔로우 책장" 섹션 이동 단위 쿼리 키. 별칭 수정(useUpdateFollowAliasMutation)·언팔로우
// (useUnfollowMutation)의 onSuccess가 이 키를 invalidate한다 — 변경 시 함께 맞춘다.
export const followsListQueryKey = ['follows', 'list'] as const;

// 295 반응형 재설계(요구사항 B): breakpoint별로 동시 노출 책장 수(1/2/3)가 달라지고, sm·mdlg
// 구간에서는 "내 책장 + 팔로우한 책장"을 하나의 가상 시퀀스로 좌우 버튼 넘김(LibraryPage.tsx 참고)해야
// 해서, "한 페이지에 몇 개"가 더 이상 고정 2가 아니다. 네트워크에서 얼마나 가져올지(이 배치 크기)와
// 화면에 몇 개씩 보여줄지(LibraryPage의 virtualPageIndex 슬라이싱)를 분리한다 — 넉넉히 한 번에
// 가져와 로컬에서 잘라 쓰고, 다음 가상 페이지에 필요한 만큼 데이터가 모자라면 그때 fetchNextPage로
// 이어 받는다(useMyCollectionsQuery/useFollowShelfCollectionsQuery와 동일한 무한 누적 패턴).
const FOLLOWS_FETCH_BATCH_SIZE = 6;

/**
 * 근거: Jira S15P11A705-144/250/295. 250에서는 "한 번에 한 페이지만" 보여주는 이전/다음 버튼 방식이라
 * useQuery + cursor 파라미터를 썼으나, 295에서 breakpoint별 가변 페이지 크기·"내 책장 포함 가상
 * 시퀀스" 슬라이싱이 필요해지며 useMyCollectionsQuery와 동일한 무한 누적(useInfiniteQuery) 패턴으로
 * 바꿨다 — 화면에 보여줄 개수는 LibraryPage가 pages.flatMap한 배열을 직접 슬라이싱해서 결정한다.
 * ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
 * TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
 * 이 커서는 "팔로우 목록" 커서다 — 책장별 Collection 커서(useFollowShelfCollectionsQuery)와 절대 혼용하지 않는다.
 */
export function useFollowsQuery() {
  return useInfiniteQuery<FollowListPage, ApiError>({
    queryKey: followsListQueryKey,
    queryFn: ({ pageParam }) =>
      getFollows({ cursor: pageParam as string | undefined, size: FOLLOWS_FETCH_BATCH_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? (lastPage.nextCursor ?? undefined) : undefined,
  });
}
