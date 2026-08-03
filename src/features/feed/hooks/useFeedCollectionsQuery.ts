import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { getFeedCollections, type FeedCollectionsPage } from '../api/getFeedCollections';

// FeedList의 5x2 책장 슬롯 수와 반드시 일치해야 한다.
export const PAGE_SIZE = 10;

/**
 * 근거: Jira S15P11A705-249. 이전엔 useInfiniteQuery로 무한스크롤을 구현했으나, 이번 티켓에서
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
 */
export function useFeedCollectionsQuery(cursor: string | undefined) {
  return useQuery<FeedCollectionsPage, ApiError>({
    queryKey: ['feed', 'collections', cursor ?? null],
    queryFn: () => getFeedCollections({ cursor, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
}
