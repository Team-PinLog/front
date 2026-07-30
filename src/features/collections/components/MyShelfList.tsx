import { useNavigate } from '@tanstack/react-router';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useMyCollectionsQuery } from '../hooks/useMyCollectionsQuery';

/**
 * 내 책장(Shelf) 목록: 내가 만든 Collection 목록 조회.
 * 근거: Jira S15P11A705-141, docs/reference/08_API_명세.md 7.2/9.1.
 * props 없이 내부에서 useMyCollectionsQuery를 직접 호출한다 — 144(Library) "내 책장" 섹션에서 그대로 재사용하기 위함.
 */
export function MyShelfList() {
  const navigate = useNavigate();
  const myCollectionsQuery = useMyCollectionsQuery();

  if (myCollectionsQuery.isPending) {
    return <p className="p-8 text-sm text-ink-gray">불러오는 중…</p>;
  }

  if (myCollectionsQuery.isError) {
    return (
      <div className="p-8">
        <ErrorState title="컬렉션을 불러오지 못했어요" description="잠시 후 다시 시도해 주세요." />
      </div>
    );
  }

  const pages = myCollectionsQuery.data.pages;
  const collections = pages.flatMap((page) => page.items);
  const hasNext = pages[pages.length - 1].hasNext;

  if (collections.length === 0) {
    return <p className="p-8 text-sm text-ink-gray">아직 만든 컬렉션이 없어요.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        {collections.map((collection) => (
          <button
            key={collection.collectionId}
            type="button"
            onClick={() =>
              void navigate({
                to: '/collections/$collectionId',
                params: { collectionId: collection.collectionId },
              })
            }
            className="flex flex-col gap-2 rounded-lg border border-line-card bg-white p-4 text-left"
          >
            <div className="flex items-start justify-between gap-4">
              <p className="text-base font-bold text-pin-navy">{collection.title}</p>
              <p className="flex-none text-xs font-semibold text-log-mint">
                {collection.recordCount}개
              </p>
            </div>

            {collection.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {collection.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-log-mint/10 px-3 py-1.5 text-xs font-bold text-log-mint"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}

            <p className="text-xs text-ink-gray">{collection.createdAt}</p>
          </button>
        ))}
      </section>

      {hasNext && (
        <button
          type="button"
          onClick={() => void myCollectionsQuery.fetchNextPage()}
          disabled={myCollectionsQuery.isFetchingNextPage}
          className="h-11 rounded-lg border border-pin-navy/15 text-sm font-bold text-pin-navy disabled:opacity-40"
        >
          {myCollectionsQuery.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
        </button>
      )}
    </div>
  );
}
