import { useQueries } from '@tanstack/react-query';
import {
  getCollectionDetail,
  type CollectionDetail,
} from '@/features/collections/api/getCollectionDetail';
import { collectionDetailQueryKey } from '@/features/collections/hooks/useCollectionDetailQuery';
import { FEED_SESSION_GC_TIME_MS } from './useFeedCollectionsQuery';
import type { PinnedFeedCollectionItem } from '../lib/feedItems';

/**
 * ⚠️ **임시(프론트엔드 전용) 고정 노출이다.** Feed 1페이지 맨 앞에 지정 Collection을 항상 보여준다
 * (PR #177, 시연용 임시 조치로 조건부 머지). 서버 추천 알고리즘·Feed Session과 무관한 별도 출처라
 * 이 카드의 클릭은 feedRequestId/feedPosition을 물리지 않고 CLICK 이벤트도 큐잉하지 않는다
 * (ShelfExploreSection.tsx의 "Feed 응답에 귀속되지 않은 카드" 패턴 — 재사용하면 SAVE 이벤트가
 * 엉뚱한 슬롯에 붙는다).
 *
 * **제거 조건(S15P11A705-412)**: 고정 노출이 필요 없어지는 시점에 이 파일과 FeedList의 고정 분기를
 * 통째로 되돌린다 — `usePinnedFeedCollectionsQuery` 호출과 `mergePinnedFeedItems`/`feedRequestSize`
 * 보정만 걷어내면 Feed는 서버 목록만 그대로 그린다.
 *
 * ⚠️ 아래 id는 **특정 환경 DB의 값**이라 다른 환경에서는 404가 난다(그때는 그 카드만 빠지고 서버
 * 목록만 나온다 — 아래 isError 폴백). env(VITE_*)로 빼려면 `src/vite-env.d.ts`·`src/config/constants.ts`·
 * `.env.example`를 함께 손봐야 해서 이 티켓 범위(features/feed) 밖이다 — 값의 단일 출처를 이
 * 모듈 상수 하나로 두고, 바꿀 곳을 여기로 고정한다.
 */
const PINNED_FEED_COLLECTION_IDS: readonly number[] = [11, 12];

/** 고정 노출 카드 수 — FeedList가 서버 요청 크기를 그만큼 줄여 슬롯 예산을 맞춘다. */
export const PINNED_FEED_COLLECTION_COUNT = PINNED_FEED_COLLECTION_IDS.length;

// 7.3 상세 응답엔 총 저장 수가 없다 — recordSize를 최댓값(CursorPage.MAX_SIZE=100)으로 요청해 받은
// records.items 길이로 갈음한다(고정 노출용 Collection은 100개를 넘지 않는다고 가정). 총 저장 수
// 필드는 계약 협의 항목이다(PR #177 리뷰 Minor 8).
const PINNED_RECORD_SIZE = 100;

function toPinnedFeedItem(detail: CollectionDetail): PinnedFeedCollectionItem {
  return {
    pinned: true,
    collectionId: detail.collectionId,
    title: detail.title,
    recordCount: detail.records.items.length,
    // 7.3 상세 응답엔 Collection 단위 대표 키워드가 없다(Record별 키워드만 있음). keywords: []는
    // AI 미완료 상태의 정상 응답으로 이미 처리되는 값이라 표지가 깨지지 않는다.
    keywords: [],
    coverImageUrl: detail.coverImageUrl ?? null,
    createdAt: detail.createdAt,
  };
}

export interface PinnedFeedCollectionsResult {
  items: PinnedFeedCollectionItem[];
  /** 아직 한 건이라도 결과가 안 나온 상태. 호출부는 이 동안 스켈레톤을 유지해 카드 밀림을 막는다. */
  isPending: boolean;
  /** 한 건이라도 실패. 실패한 카드는 items에서 빠지고 서버 목록만 그려진다(폴백). */
  isError: boolean;
}

/**
 * ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·httpClient를 직접 부르지 않는다
 * (412 — PR #177은 FeedList에서 getCollectionDetail을 직접 불렀다).
 *
 * queryKey는 표준 `collectionDetailQueryKey(id)`를 **접두사로 그대로 유지**하고 뒤에 'feedPin'만
 * 붙인다. 두 가지를 동시에 만족해야 하기 때문이다:
 * - 표지·제목을 고친 뒤의 `invalidateQueries({ queryKey: collectionDetailQueryKey(id) })`(및
 *   `collectionDetailQueryKeyPrefix()`)에 걸려야 한다. TanStack Query의 무효화는 접두사 일치라
 *   'feedPin' 접미사가 붙어 있어도 잡힌다. PR #177의 `['collections', id, 'detail', 'feedPin']`은
 *   순서가 달라 어떤 무효화에도 걸리지 않았다.
 * - 그렇다고 키를 완전히 같게 둘 수는 없다 — `useCollectionDetailQuery`는 useInfiniteQuery라
 *   캐시 데이터 모양이 `{ pages, pageParams }`로 다르다. 접미사가 그 충돌을 막는다.
 *
 * staleTime은 전역 기본값(30초)을 쓴다 — PR #177의 `staleTime: Infinity`는 위 무효화 누락과 겹쳐
 * "표지를 고쳐도 탭 수명 내내 옛 카드가 남는" 상태를 만들었다. 이 쿼리는 Feed Session처럼 이어지는
 * cursor 체인이 아니라 단순 상세 조회라, 세션 일관성 때문에 Infinity를 둘 이유가 없다.
 * gcTime만 Feed 세션과 같은 값을 공유한다 — 책을 열었다 닫고 돌아왔을 때 캐시가 살아 있어 고정
 * 카드만 다시 스켈레톤으로 깜빡이지 않게 한다(값 복제 대신 export 공유).
 */
export function usePinnedFeedCollectionsQuery(enabled: boolean): PinnedFeedCollectionsResult {
  return useQueries({
    queries: PINNED_FEED_COLLECTION_IDS.map((collectionId) => ({
      queryKey: [...collectionDetailQueryKey(collectionId), 'feedPin'] as const,
      queryFn: () => getCollectionDetail(collectionId, { recordSize: PINNED_RECORD_SIZE }),
      enabled,
      gcTime: FEED_SESSION_GC_TIME_MS,
    })),
    combine: (results) => ({
      // 단언(as CollectionDetail) 없이 좁힌다 — data가 없는 결과는 그대로 떨어뜨린다.
      // ⚠️ enabled: false여도 캐시에 남은 data는 그대로 돌아온다(요청만 멈출 뿐이다) — 1페이지를
      // 보고 2페이지로 넘어간 뒤에도 고정 카드가 딸려 나오지 않도록 여기서 비운다.
      items: enabled
        ? results.flatMap((result) => (result.data ? [toPinnedFeedItem(result.data)] : []))
        : [],
      // enabled: false인 쿼리도 status는 'pending'이다(fetchStatus만 idle) — 1페이지가 아닐 때
      // 화면이 영원히 스켈레톤이 되지 않도록 enabled를 함께 본다.
      isPending: enabled && results.some((result) => result.isPending),
      isError: results.some((result) => result.isError),
    }),
  });
}
