import { useNavigate } from '@tanstack/react-router';
import { getIsLoggedIn } from '@/features/auth/lib/getIsLoggedIn';
import { savePreLoginPath } from '@/features/auth/lib/preLoginPath';
import { formatDate } from '@/shared/lib/formatDate';
import { markCollectionOverlayIntent } from '@/features/collections/lib/collectionOverlayIntent';
import { useShelfExploreQuery } from '../hooks/useShelfExploreQuery';
import { useFollowMutation } from '@/features/follows/hooks/useFollowMutation';
import { useUnfollowMutation } from '@/features/follows/hooks/useUnfollowMutation';

interface ShelfExploreSectionProps {
  collectionId: number;
}

/**
 * 공개 Collection 상세에서 작성자의 다른 공개 Collection을 탐색하고 책장을 Follow/Unfollow하는 섹션.
 * 근거: Jira S15P11A705-143, docs/reference/08_API_명세.md 8장.
 * ownedByMe: false일 때만 노출해야 하며, 그 판단은 호출부(CollectionDetailView)가 한다.
 * 클릭 시 이동은 142에서 쓴 것과 동일한 /collections/$collectionId 경로를 재사용한다 — Feed 이벤트 대상이
 * 아니므로 feedRequestId/feedPosition search param은 붙이지 않는다(FeedList.tsx와 달리 MyShelfList.tsx와 동일 패턴).
 */
export function ShelfExploreSection({ collectionId }: ShelfExploreSectionProps) {
  const navigate = useNavigate();
  const shelfExploreQuery = useShelfExploreQuery(collectionId);
  const followMutation = useFollowMutation();
  const unfollowMutation = useUnfollowMutation();

  if (shelfExploreQuery.isPending) {
    return <p className="text-sm text-ink-gray">불러오는 중…</p>;
  }

  if (shelfExploreQuery.isError) {
    return <p className="text-sm text-red-600">책장을 불러오지 못했어요.</p>;
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

  return (
    <section className="flex flex-col gap-4 border-t border-line-card pt-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-bold text-pin-navy">이 작성자의 다른 컬렉션</h2>
        {isLoggedIn ? (
          <button
            type="button"
            onClick={handleFollowToggle}
            disabled={isFollowPending}
            className={
              follow.followed
                ? 'h-9 flex-none rounded-lg border border-pin-navy/15 px-3 text-xs font-bold text-pin-navy disabled:opacity-40'
                : 'h-9 flex-none rounded-lg bg-log-mint px-3 text-xs font-bold text-pin-navy disabled:opacity-40'
            }
          >
            {isFollowPending ? '처리 중…' : follow.followed ? '팔로우 해제' : '팔로우'}
          </button>
        ) : (
          // 비로그인은 API 호출 없이 로그인 화면으로 보낸다 — 401을 받은 뒤 처리하는 게 아니라 애초에 호출하지 않는다.
          <button
            type="button"
            onClick={handleLoginRedirect}
            className="h-9 flex-none rounded-lg bg-log-mint px-3 text-xs font-bold text-pin-navy"
          >
            로그인하고 팔로우하기
          </button>
        )}
      </div>

      {followError && <p className="text-xs text-red-600">{followError.message}</p>}

      {otherCollections.length === 0 ? (
        <p className="text-sm text-ink-gray">다른 컬렉션이 없습니다</p>
      ) : (
        <div className="flex flex-col gap-3">
          {otherCollections.map((collection) => (
            <button
              key={collection.collectionId}
              type="button"
              onClick={() => {
                markCollectionOverlayIntent();
                void navigate({
                  to: '/collections/$collectionId',
                  params: { collectionId: collection.collectionId },
                  state: { collectionOverlay: true },
                });
              }}
              className="flex h-[116px] flex-col gap-2 rounded-lg border border-line-card bg-white p-4 text-left"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="min-w-0 flex-1 truncate text-base font-bold text-pin-navy">
                  {collection.title}
                </p>
                <p className="flex-none text-xs font-semibold text-log-mint">
                  {collection.recordCount}개
                </p>
              </div>

              {/* keywords: []는 AI 미완료 상태의 정상 응답이다(architecture.md 5장) — 비워도 이 영역의
                  높이(h-7)는 그대로 유지해 카드 전체 높이가 키워드 유무와 무관하게 고정되도록 한다. */}
              <div className="flex h-7 items-center gap-2 overflow-x-auto">
                {collection.keywords.length > 0 ? (
                  collection.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="flex-none rounded-full bg-log-mint/10 px-3 py-1.5 text-xs font-bold text-log-mint"
                    >
                      {keyword}
                    </span>
                  ))
                ) : (
                  <p className="truncate text-xs text-ink-gray-light">
                    AI가 키워드를 분석 중이에요
                  </p>
                )}
              </div>

              <p className="text-xs text-ink-gray">{formatDate(collection.createdAt)}</p>
            </button>
          ))}
        </div>
      )}

      {hasNext && (
        <button
          type="button"
          onClick={() => void shelfExploreQuery.fetchNextPage()}
          disabled={shelfExploreQuery.isFetchingNextPage}
          className="h-11 rounded-lg border border-pin-navy/15 text-sm font-bold text-pin-navy disabled:opacity-40"
        >
          {shelfExploreQuery.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
        </button>
      )}
    </section>
  );
}
