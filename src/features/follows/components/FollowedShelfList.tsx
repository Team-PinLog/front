import { ErrorState } from '@/shared/ui/ErrorState';
import { ShelfCabinet } from '@/shared/ui/Shelf';
import { useFollowsQuery } from '../hooks/useFollowsQuery';
import { FollowedShelfCard } from './FollowedShelfCard';

/**
 * 팔로우한 책장 목록. 근거: Jira S15P11A705-144, docs/reference/08_API_명세.md 9.2.
 * 이 목록이 쓰는 커서는 "팔로우 목록" 커서(useFollowsQuery)다 — 각 FollowedShelfCard가 쓰는 책장별
 * Collection 커서와는 독립적이며 절대 혼용하지 않는다.
 */
export function FollowedShelfList() {
  const followsQuery = useFollowsQuery();

  if (followsQuery.isPending) {
    return (
      <>
        <h2 className="text-sm font-bold text-ink-gray">팔로우한 책장</h2>
        <p className="p-8 text-sm text-ink-gray">불러오는 중…</p>
      </>
    );
  }

  if (followsQuery.isError) {
    return (
      <>
        <h2 className="text-sm font-bold text-ink-gray">팔로우한 책장</h2>
        <div className="p-8">
          <ErrorState
            title="팔로우 목록을 불러오지 못했어요"
            description="잠시 후 다시 시도해 주세요."
          />
        </div>
      </>
    );
  }

  const pages = followsQuery.data.pages;
  const follows = pages.flatMap((page) => page.items);
  const hasNext = pages[pages.length - 1].hasNext;

  if (follows.length === 0) {
    return (
      <ShelfCabinet headerTitle="팔로우한 책장">
        <p className="text-xs text-white/50">아직 팔로우한 책장이 없어요</p>
      </ShelfCabinet>
    );
  }

  return (
    <>
      <h2 className="text-sm font-bold text-ink-gray">팔로우한 책장</h2>
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-6">
          {follows.map((follow) => (
            <FollowedShelfCard
              key={follow.followId}
              followId={follow.followId}
              alias={follow.alias}
            />
          ))}
        </section>

        {hasNext && (
          <button
            type="button"
            onClick={() => void followsQuery.fetchNextPage()}
            disabled={followsQuery.isFetchingNextPage}
            className="h-11 rounded-lg border border-pin-navy/15 text-sm font-bold text-pin-navy disabled:opacity-40"
          >
            {followsQuery.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
          </button>
        )}
      </div>
    </>
  );
}
