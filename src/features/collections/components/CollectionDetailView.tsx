import { useEditCollectionTitle } from '@/contexts/useEditCollectionTitle';
import { useCollectionDeleteConfirm } from '@/contexts/useCollectionDeleteConfirm';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useCollectionDetailQuery } from '../hooks/useCollectionDetailQuery';
import { RecordRemoveButton } from './RecordRemoveButton';

interface CollectionDetailViewProps {
  collectionId: number;
}

/**
 * Collection 상세: 제목·Record 목록 조회 + 소유자 전용 제목 수정·삭제·Record 제거.
 * 근거: Jira S15P11A705-140, docs/reference/08_API_명세.md 7.3~7.6.
 * ownedByMe로 소유자/타인을 구분한다(privacy-rules.md 1장) — 타인 조회는 contexts가 null이라 렌더링하지 않는다.
 */
export function CollectionDetailView({ collectionId }: CollectionDetailViewProps) {
  const detailQuery = useCollectionDetailQuery(collectionId);
  const editTitleState = useEditCollectionTitle();
  const deleteConfirm = useCollectionDeleteConfirm();

  if (detailQuery.isPending) {
    return <p className="p-8 text-sm text-ink-gray">불러오는 중…</p>;
  }

  if (detailQuery.isError) {
    // 08_API_명세: 존재하지 않거나 비공개인 Collection은 404 RESOURCE_NOT_FOUND로 응답한다(소유 여부 은닉).
    const isNotFound = detailQuery.error.code === 'RESOURCE_NOT_FOUND';
    return (
      <div className="p-8">
        <ErrorState
          title={isNotFound ? '컬렉션을 찾을 수 없어요' : '컬렉션을 불러오지 못했어요'}
          description={
            isNotFound ? '삭제되었거나 접근할 수 없는 컬렉션이에요.' : '잠시 후 다시 시도해 주세요.'
          }
        />
      </div>
    );
  }

  const pages = detailQuery.data.pages;
  const { title, ownedByMe } = pages[0];
  const records = pages.flatMap((page) => page.records.items);
  const hasNext = pages[pages.length - 1].records.hasNext;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <header className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-pin-navy">{title}</h1>

        {ownedByMe && (
          <div className="flex flex-none gap-2">
            <button
              type="button"
              onClick={editTitleState.open}
              className="h-11 rounded-lg border border-pin-navy/15 px-4 text-sm font-bold text-pin-navy"
            >
              제목 수정
            </button>
            <button
              type="button"
              onClick={() => deleteConfirm.open('direct')}
              className="h-11 rounded-lg border border-red-600/30 px-4 text-sm font-bold text-red-600"
            >
              삭제
            </button>
          </div>
        )}
      </header>

      <section className="flex flex-col gap-3">
        {records.map((record) => (
          <div
            key={record.recordId}
            className="flex flex-col gap-2 rounded-lg border border-line-card bg-white p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-bold text-pin-navy">{record.place.name}</p>
                <p className="text-xs font-semibold text-log-mint">{record.place.address}</p>
              </div>
              {ownedByMe && (
                <RecordRemoveButton collectionId={collectionId} recordId={record.recordId} />
              )}
            </div>

            {record.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {record.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-log-mint/10 px-3 py-1.5 text-xs font-bold text-log-mint"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}

            {/* contexts는 ownedByMe일 때만 배열이고 타인 조회는 null이다(privacy-rules.md 1장) — null이면 그리지 않는다. */}
            {record.contexts?.map((context) => (
              <p
                key={context.contextId}
                className="whitespace-pre-wrap text-sm leading-relaxed text-ink-gray"
              >
                {context.body}
              </p>
            ))}
          </div>
        ))}
      </section>

      {hasNext && (
        <button
          type="button"
          onClick={() => void detailQuery.fetchNextPage()}
          disabled={detailQuery.isFetchingNextPage}
          className="h-11 rounded-lg border border-pin-navy/15 text-sm font-bold text-pin-navy disabled:opacity-40"
        >
          {detailQuery.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
        </button>
      )}
    </main>
  );
}
