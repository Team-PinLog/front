import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { getFollows, type FollowListPage } from '../api/getFollows';

// Library(144)의 "팔로우 책장" 섹션 이동 단위 쿼리 키. 별칭 수정(useUpdateFollowAliasMutation)·언팔로우
// (useUnfollowMutation)의 onSuccess가 이 키를 invalidate한다 — 변경 시 함께 맞춘다. 아래 useFollowsQuery의
// 실제 queryKey는 이 뒤에 cursor를 붙인 것이라 exact:false 기본 invalidate로도 전체 커서 캐시가 무효화된다.
export const followsListQueryKey = ['follows', 'list'] as const;

// 250: 2열×1행씩 이전/다음 버튼으로 넘기므로 페이지당 2개만 받는다.
const PAGE_SIZE = 2;

/**
 * 근거: Jira S15P11A705-250. useFeedCollectionsQuery(249)와 동일하게 무한스크롤 대신 "한 번에 한 페이지만"
 * 보여주는 이전/다음 버튼 방식이라 useInfiniteQuery 대신 useQuery + cursor 파라미터를 쓴다. cursor를
 * queryKey에 넣어 페이지별로 캐시하므로 이미 방문한 페이지로 "이전" 이동 시 재요청하지 않는다.
 * ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
 * TError를 ApiError로 명시한다 — httpClient가 던지는 에러는 Error 인스턴스가 아니라 ApiError 객체다.
 * 이 커서는 "팔로우 목록" 커서다 — 책장별 Collection 커서(useFollowShelfCollectionsQuery)와 절대 혼용하지 않는다.
 */
export function useFollowsQuery(cursor: string | undefined) {
  return useQuery<FollowListPage, ApiError>({
    queryKey: [...followsListQueryKey, cursor ?? null],
    queryFn: () => getFollows({ cursor, size: PAGE_SIZE }),
  });
}
