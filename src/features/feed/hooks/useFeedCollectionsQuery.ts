import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { getFeedCollections, type FeedCollectionsPage } from '../api/getFeedCollections';

/**
 * 근거: Jira S15P11A705-249/295. 이전엔 useInfiniteQuery로 무한스크롤을 구현했으나, 이번 티켓에서
 * 이전/다음 버튼 방식으로 바뀌면서 "한 번에 한 페이지만" 보여주는 게 맞아 일반 useQuery로 바꿨다.
 * cursor를 queryKey에 그대로 넣어 페이지별로 캐시하므로, 이미 방문한 cursor로 "이전" 이동할 때는
 * 캐시를 그대로 쓰고 네트워크 요청도, 서버 IMPRESSION 재기록도 발생하지 않는다(호출부가 cursor 스택을
 * 직접 관리해 재요청하는 방식보다 간단하다).
 * ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다.
 *
 * 279 추가 수정: placeholderData: keepPreviousData가 없으면 아직 캐시에 없는 cursor(처음 방문하는
 * 다음 페이지)로 넘어갈 때 isPending이 다시 true가 되어 FeedList가 카드 그리드를 통째로 스켈레톤으로
 * 갈아치웠다가 로딩이 끝나면 다시 채우는 깜빡임이 있었다 — 이전 페이지 데이터를 유지한 채 배경에서
 * 새 데이터로 교체되도록 한다.
 *
 * 295 반응형 재설계: size가 더 이상 고정 10이 아니다 — breakpoint/orientation별 그리드 칸 수
 * (FEED_GRID_BY_KEY, shelfCabinetLayout.ts)에 맞춰 호출부(FeedList)가 매 렌더 계산해 넘긴다.
 * queryKey에 size를 포함해, 리사이즈로 tier가 바뀐 직후 같은 cursor라도 이전 tier의 size로 받은
 * 캐시를 새 tier에 잘못 재사용하지 않게 한다.
 *
 * 354: 책을 펼치는 것은 시각적으로만 오버레이이고 실제로는 라우트 이동이라 FeedPage가 언마운트된다 —
 * 닫고 돌아오면 이 쿼리가 다시 마운트되면서 전역 staleTime(30초)을 넘긴 캐시를 배경에서 재요청했다.
 * 그 응답은 **새 Feed Session**이라 requestId가 바뀌고 추천 순서도 다시 뽑힌다. 화면에는 "책들이
 * 처음부터 다시 로딩되는" 것으로 보였다(FeedList의 카드 key가 requestId를 물고 있어 카드가 전부
 * 재마운트되고, 표지 <img>도 함께 다시 그려진다).
 *
 * staleTime을 Infinity로 두는 것은 시연용 임시 조치가 아니라 이 API의 세션 의미와 맞다 — cursor는
 * 특정 Feed Session에 묶인 opaque 값이고, "다음 페이지는 직전 페이지의 nextCursor로 이어받는다"
 * (08_API_명세 10.1). 페이지 0을 조용히 새 세션으로 갈아끼우면 호출부(FeedList)가 들고 있는 cursor
 * 체인이 다른 세션의 것이 되어버린다. 즉 이 쿼리는 "탭이 살아 있는 동안 유지되는 하나의 세션"이고,
 * 새 추천을 받는 경로는 새로고침(또는 명시적 invalidate)이다.
 * gcTime도 함께 늘린다 — 기본 5분이면 책을 오래 보다가 닫았을 때 캐시가 수거돼 스켈레톤이 다시
 * 뜬다. 페이지당 수십 KB짜리 목록이라 30분을 들고 있어도 메모리 부담은 없다.
 *
 * 412: 고정 노출 카드(usePinnedFeedCollectionsQuery)도 같은 수명을 써야 해서 export한다 — 값을 두
 * 군데 복제하면 한쪽만 바뀌었을 때 고정 카드만 캐시가 먼저 수거돼 깜빡인다.
 */
export const FEED_SESSION_GC_TIME_MS = 30 * 60 * 1000;

export function useFeedCollectionsQuery(cursor: string | undefined, size: number) {
  return useQuery<FeedCollectionsPage, ApiError>({
    queryKey: ['feed', 'collections', cursor ?? null, size],
    queryFn: () => getFeedCollections({ cursor, size }),
    placeholderData: keepPreviousData,
    staleTime: Infinity,
    gcTime: FEED_SESSION_GC_TIME_MS,
  });
}
