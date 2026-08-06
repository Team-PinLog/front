import { useNavigate } from '@tanstack/react-router';
import { getIsLoggedIn } from '@/features/auth/lib/getIsLoggedIn';
import { savePreLoginPath } from '@/features/auth/lib/preLoginPath';
import { handleShelfScrollFetchNext } from '@/shared/lib/handleShelfScrollFetchNext';
import {
  chunkIntoShelfRows,
  getEmptyTierPadding,
  SHELF_DEFAULT_VISIBLE_ROW_COUNT,
  SHELF_SCROLL_BOTTOM_PADDING_PX,
  SHELF_SCROLL_SIDE_PADDING_PX,
  SHELF_SCROLL_TOP_PADDING_PX,
} from '@/shared/lib/shelfSpine';
import {
  ShelfBookSpine,
  ShelfCabinet,
  ShelfColumn,
  ShelfColumnGrid,
  ShelfLabel,
  ShelfTier,
} from '@/shared/ui/Shelf';
import { useShelfExploreQuery } from '../hooks/useShelfExploreQuery';
import { useFollowMutation } from '@/features/follows/hooks/useFollowMutation';
import { useUnfollowMutation } from '@/features/follows/hooks/useUnfollowMutation';

// 332: 행별 권수(getRowCapacity) seed의 화면 구분용 salt. MyShelfList(900_000)·FollowedShelfCard
// (100_000 + slot × 400_000 → 100_000/500_000)와 절대 겹치지 않는 범위를 쓴다 — 기존 규약 그대로다.
const SHELF_EXPLORE_SEED_SALT = 1_300_000;

interface ShelfExploreSectionProps {
  collectionId: number;
  /** 좁은 화면의 서랍에서 책을 고르면 서랍을 닫기 위해 호출부가 넘긴다. */
  onSelectCollection?: () => void;
}

/**
 * 공개 Collection 상세에서 작성자의 다른 공개 Collection을 탐색하고 책장을 Follow/Unfollow하는 섹션.
 * 근거: Jira S15P11A705-143, docs/reference/08_API_명세.md 8장.
 * 노출 조건은 호출부(CollectionDetailView)가 정한다.
 * 클릭 시 이동은 142에서 쓴 것과 동일한 /collections/$collectionId 경로를 재사용한다 — Feed 이벤트 대상이
 * 아니므로 feedRequestId/feedPosition search param은 붙이지 않는다(FeedList.tsx와 달리 MyShelfList.tsx와 동일 패턴).
 *
 * 332 디자인 피드백: 화면 **아래** 카드 목록에서 화면 **오른쪽** 책장(Library의 1열 캐비닛과 동일한
 * 디자인)으로 바뀌었다. 데이터 경로(useShelfExploreQuery)·Follow 로직·이동 경로는 그대로고 표현만
 * 바꿨다 — 이 경로가 collectionId를 진입점으로 쓰는 것이 privacy-rules.md의 "member.id 미사용"을
 * 만족시키는 근거라, 새 데이터 경로를 만들지 않는다. 표시하는 값(title·recordCount)도 그대로다.
 * 캐비닛은 shared/ui/Shelf의 프리미티브를 import해 Library와 완전히 같은 디자인을 쓴다(복제 아님).
 * ⚠️ ShelfTier/ShelfBookSpine은 scalePx()가 참조하는 --shelf-scale에 의존하고 그 변수는 ShelfCabinet이
 * 선언한다 — 이 둘은 반드시 ShelfCabinet 안에서만 쓴다(LibraryPage와 동일한 중첩 구조를 따른 이유).
 */
export function ShelfExploreSection({
  collectionId,
  onSelectCollection,
}: ShelfExploreSectionProps) {
  const navigate = useNavigate();
  const shelfExploreQuery = useShelfExploreQuery(collectionId);
  const followMutation = useFollowMutation();
  const unfollowMutation = useUnfollowMutation();

  // 332 피드백 2번: 다른 Collection으로 넘어가면 이 책장도 쿼리 키가 바뀌어 pending이 된다. 그때
  // 한 줄짜리 텍스트만 반환하면 캐비닛이 사라졌다 다시 나타나 화면이 번쩍인다 — 캐비닛 골격(라벨 +
  // 빈 선반)은 그대로 두고 책만 비운다. 선반이 이미 깔려 있으니 "책이 꽂히는 중"으로 읽힌다.
  if (shelfExploreQuery.isPending || shelfExploreQuery.isError) {
    const message = shelfExploreQuery.isError ? '책장을 불러오지 못했어요.' : '불러오는 중…';
    return (
      <section className="flex h-full min-h-0 flex-col gap-3">
        <div className="flex h-10 flex-none items-center px-1">
          <h2 className="text-sm font-bold text-pin-navy">이 작성자의 다른 컬렉션</h2>
        </div>
        <div className="min-h-0 flex-1">
          <ShelfCabinet>
            <ShelfColumnGrid columns={1}>
              <ShelfColumn>
                <ShelfLabel>다른 컬렉션</ShelfLabel>
                <p
                  className={`text-xs ${shelfExploreQuery.isError ? 'text-red-600' : 'text-ink-gray'}`}
                >
                  {message}
                </p>
                <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                  {Array.from({ length: SHELF_DEFAULT_VISIBLE_ROW_COUNT }, (_, emptyIndex) => (
                    <ShelfTier key={`skeleton-${emptyIndex}`}>{null}</ShelfTier>
                  ))}
                </div>
              </ShelfColumn>
            </ShelfColumnGrid>
          </ShelfCabinet>
        </div>
      </section>
    );
  }

  const pages = shelfExploreQuery.data.pages;
  // follow(followed/followId/alias)는 페이지네이션 대상이 아니다(08_API_명세 8.1) — 첫 페이지에서만 꺼내 쓴다.
  const { follow } = pages[0];
  const otherCollections = pages.flatMap((page) => page.collections.items);
  const hasNext = pages[pages.length - 1].collections.hasNext;

  const isFollowPending = followMutation.isPending || unfollowMutation.isPending;
  // logged_in 쿠키 기반 UI 힌트(149/150/141과 동일한 판단 로직) — 실제 인가 판단이 아니라 버튼 문구·동작
  // 분기에만 쓴다. Shelf 탐색(GET /feed/collections/{id}/shelf)은 비로그인도 조회 가능한 공개 진입점이라
  // follow.followed는 비로그인이면 항상 false로 온다.
  const isLoggedIn = getIsLoggedIn();

  const handleLoginRedirect = () => {
    savePreLoginPath();
    void navigate({ to: '/login' });
  };

  const handleFollowToggle = () => {
    if (follow.followed) {
      if (follow.followId === null) {
        return;
      }
      unfollowMutation.mutate({ followId: follow.followId, sourceCollectionId: collectionId });
    } else {
      followMutation.mutate(collectionId);
    }
  };

  const followError = followMutation.error ?? unfollowMutation.error;

  // 행 구성이 새로고침해도 흔들리지 않도록 첫 컬렉션 id를 seed로 쓴다(MyShelfColumn과 같은 방식).
  const seedId = SHELF_EXPLORE_SEED_SALT + (otherCollections[0]?.collectionId ?? 0);
  const collectionRows = chunkIntoShelfRows(otherCollections, seedId);
  const emptyTierCount = getEmptyTierPadding(
    collectionRows.length,
    SHELF_DEFAULT_VISIBLE_ROW_COUNT,
  );

  return (
    <section className="flex h-full min-h-0 flex-col gap-3">
      {/* 팔로우 진입점은 캐비닛 위에 둔다(332 확정) — 캐비닛 안은 책이 꽂히는 자리이고, 팔로우는
          "이 책장 전체"를 대상으로 하는 동작이라 책장 바깥에 있어야 대상이 분명하다. */}
      <div className="flex flex-none items-center justify-between gap-3 px-1">
        <h2 className="text-sm font-bold text-pin-navy">이 작성자의 다른 컬렉션</h2>
        {isLoggedIn ? (
          <button
            type="button"
            onClick={handleFollowToggle}
            disabled={isFollowPending}
            className={
              follow.followed
                ? 'h-10 flex-none rounded-xl border border-line-card bg-snow-white px-4 text-sm font-bold text-pin-navy shadow-sm disabled:opacity-40'
                : 'h-10 flex-none rounded-xl bg-log-mint px-4 text-sm font-bold text-pin-navy shadow-sm disabled:opacity-40'
            }
          >
            {isFollowPending ? '처리 중…' : follow.followed ? '팔로우 해제' : '팔로우'}
          </button>
        ) : (
          // 비로그인은 API 호출 없이 로그인 화면으로 보낸다 — 401을 받은 뒤 처리하는 게 아니라 애초에 호출하지 않는다.
          <button
            type="button"
            onClick={handleLoginRedirect}
            className="h-10 flex-none rounded-xl bg-log-mint px-4 text-sm font-bold text-pin-navy shadow-sm"
          >
            로그인하고 팔로우
          </button>
        )}
      </div>

      {followError && <p className="flex-none px-1 text-xs text-red-600">{followError.message}</p>}

      <div className="min-h-0 flex-1">
        <ShelfCabinet>
          <ShelfColumnGrid columns={1}>
            <ShelfColumn>
              <ShelfLabel>다른 컬렉션</ShelfLabel>

              {otherCollections.length === 0 && (
                <p className="text-xs text-ink-gray">다른 컬렉션이 없습니다</p>
              )}

              {/* 스크롤 여백(top/side/bottom)은 MyShelfColumn과 같은 상수를 쓴다 — 맨 윗줄 책의 호버
                  translateY(-10px)와 기울어진 책등이 overflow 경계에 잘리지 않게 하는 여유다.
                  기존 "더 보기" 버튼은 스크롤 자동 로드로 바꿨다(287-18과 같은 판단) — 책장 안에서
                  버튼이 놓일 자리가 선반 위밖에 없어 책과 뒤섞이기 때문이다. */}
              <div
                style={{
                  paddingTop: SHELF_SCROLL_TOP_PADDING_PX,
                  paddingBottom: SHELF_SCROLL_BOTTOM_PADDING_PX,
                  paddingLeft: SHELF_SCROLL_SIDE_PADDING_PX,
                  paddingRight: SHELF_SCROLL_SIDE_PADDING_PX,
                }}
                onScroll={(event) =>
                  handleShelfScrollFetchNext(event, {
                    hasNext,
                    isFetchingNextPage: shelfExploreQuery.isFetchingNextPage,
                    fetchNextPage: () => void shelfExploreQuery.fetchNextPage(),
                  })
                }
                className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto"
              >
                {collectionRows.map((row, rowIndex) => (
                  <ShelfTier key={rowIndex}>
                    {row.items.map((collection, indexInRow) => (
                      <ShelfBookSpine
                        key={collection.collectionId}
                        index={row.startIndex + indexInRow}
                        collectionId={collection.collectionId}
                        title={collection.title}
                        recordCount={collection.recordCount}
                        onClick={() => {
                          onSelectCollection?.();
                          void navigate({
                            to: '/collections/$collectionId',
                            params: { collectionId: collection.collectionId },
                            // shelfContext: 책장에서 책장으로 넘어가는 동안 오른쪽 책장이 유지되게
                            // 하는 마커(router.tsx HistoryState 주석 참고). Feed 이벤트 값
                            // (feedRequestId/feedPosition)은 절대 물려주지 않는다 — 그 값은 Feed
                            // 응답에 귀속된 것이라 재사용하면 SAVE 이벤트가 엉뚱한 슬롯에 붙는다.
                            state: { collectionOverlay: true, shelfContext: true },
                            // replace: 책장에서 책을 갈아 끼우는 동작은 "새 화면으로 들어가기"가
                            // 아니라 "지금 펼친 책을 바꾸기"다. push하면 책을 볼수록 히스토리가
                            // 쌓여, 닫기(history.back)가 Feed가 아니라 직전에 보던 책으로 되돌아가
                            // 책이 안 닫힌 것처럼 보인다(332 피드백). replace면 항상 책을 열기 직전
                            // 화면(Feed·책장)으로 한 번에 닫힌다.
                            replace: true,
                          });
                        }}
                      />
                    ))}
                  </ShelfTier>
                ))}

                {/* 실제 행이 기본 표시 행 수보다 적으면 빈 선반으로 채운다 — 선반 판이 항상 같은
                    위치에 깔려 캐비닛이 반쯤 빈 상자로 보이지 않게 한다(MyShelfColumn과 동일). */}
                {Array.from({ length: emptyTierCount }, (_, emptyIndex) => (
                  <ShelfTier key={`empty-${emptyIndex}`}>{null}</ShelfTier>
                ))}

                {shelfExploreQuery.isFetchingNextPage && (
                  <p className="flex-none py-1 text-center text-xs text-ink-gray">불러오는 중…</p>
                )}
              </div>
            </ShelfColumn>
          </ShelfColumnGrid>
        </ShelfCabinet>
      </div>
    </section>
  );
}
