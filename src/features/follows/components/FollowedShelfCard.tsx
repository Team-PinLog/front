import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useFollowShelfCollectionsQuery } from '../hooks/useFollowShelfCollectionsQuery';
import { useUpdateFollowAliasMutation } from '../hooks/useUpdateFollowAliasMutation';
import { useUnfollowMutation } from '../hooks/useUnfollowMutation';

const ALIAS_MAX_LENGTH = 20;

interface FollowedShelfCardProps {
  followId: number;
  alias: string | null;
}

/**
 * 팔로우한 책장 하나를 카드로 렌더링한다. 근거: Jira S15P11A705-144, docs/reference/08_API_명세.md 9.3/8.3/8.4.
 * 이 카드가 쓰는 Collection 목록 커서는 이 followId 전용이다(useFollowShelfCollectionsQuery) — 다른
 * 카드나 팔로우 목록(useFollowsQuery) 커서와 절대 혼용하지 않는다.
 * Library 컨텍스트의 언팔로우이므로 useUnfollowMutation에 sourceCollectionId를 넘기지 않는다.
 */
export function FollowedShelfCard({ followId, alias }: FollowedShelfCardProps) {
  const navigate = useNavigate();
  const collectionsQuery = useFollowShelfCollectionsQuery(followId);
  const updateAliasMutation = useUpdateFollowAliasMutation();
  const unfollowMutation = useUnfollowMutation();

  const [isEditingAlias, setIsEditingAlias] = useState(false);
  const [aliasInput, setAliasInput] = useState(alias ?? '');

  const handleStartEdit = () => {
    setAliasInput(alias ?? '');
    setIsEditingAlias(true);
  };

  const handleCancelEdit = () => {
    setIsEditingAlias(false);
  };

  const handleSaveAlias = () => {
    const trimmed = aliasInput.trim();
    updateAliasMutation.mutate(
      { followId, alias: trimmed === '' ? null : trimmed },
      { onSuccess: () => setIsEditingAlias(false) },
    );
  };

  const handleUnfollow = () => {
    unfollowMutation.mutate({ followId });
  };

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line-card bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        {isEditingAlias ? (
          <div className="flex flex-1 items-center gap-2">
            <label htmlFor={`follow-alias-${followId}`} className="sr-only">
              책장 별칭
            </label>
            <input
              id={`follow-alias-${followId}`}
              type="text"
              maxLength={ALIAS_MAX_LENGTH}
              value={aliasInput}
              onChange={(event) => setAliasInput(event.target.value)}
              disabled={updateAliasMutation.isPending}
              placeholder="별칭을 입력해 주세요"
              className="h-9 flex-1 rounded-lg border border-pin-navy/15 bg-white px-3 text-sm text-pin-navy outline-none placeholder:text-ink-gray-light focus:border-log-mint focus:ring-2 focus:ring-log-mint/20 disabled:opacity-40"
            />
            <button
              type="button"
              onClick={handleSaveAlias}
              disabled={updateAliasMutation.isPending}
              className="h-9 flex-none rounded-lg bg-log-mint px-3 text-xs font-bold text-pin-navy disabled:opacity-40"
            >
              {updateAliasMutation.isPending ? '저장 중…' : '저장'}
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={updateAliasMutation.isPending}
              className="h-9 flex-none rounded-lg border border-pin-navy/15 px-3 text-xs font-bold text-pin-navy disabled:opacity-40"
            >
              취소
            </button>
          </div>
        ) : (
          <div className="flex flex-1 items-center gap-2">
            <h2 className="text-sm font-bold text-pin-navy">{alias ?? '이름 없는 책장'}</h2>
            <button
              type="button"
              onClick={handleStartEdit}
              className="text-xs font-bold text-ink-gray underline"
            >
              별칭 수정
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleUnfollow}
          disabled={unfollowMutation.isPending}
          className="h-9 flex-none rounded-lg border border-pin-navy/15 px-3 text-xs font-bold text-pin-navy disabled:opacity-40"
        >
          {unfollowMutation.isPending ? '처리 중…' : '팔로우 해제'}
        </button>
      </div>

      {updateAliasMutation.isError && (
        <p className="text-xs text-red-600">{updateAliasMutation.error.message}</p>
      )}
      {unfollowMutation.isError && (
        <p className="text-xs text-red-600">{unfollowMutation.error.message}</p>
      )}

      {collectionsQuery.isPending ? (
        <p className="text-sm text-ink-gray">불러오는 중…</p>
      ) : collectionsQuery.isError ? (
        <p className="text-sm text-red-600">책장을 불러오지 못했어요.</p>
      ) : (
        <FollowedShelfCollections
          followId={followId}
          collectionsQuery={collectionsQuery}
          onSelectCollection={(collectionId) =>
            void navigate({ to: '/collections/$collectionId', params: { collectionId } })
          }
        />
      )}
    </section>
  );
}

interface FollowedShelfCollectionsProps {
  followId: number;
  collectionsQuery: ReturnType<typeof useFollowShelfCollectionsQuery>;
  onSelectCollection: (collectionId: number) => void;
}

function FollowedShelfCollections({
  collectionsQuery,
  onSelectCollection,
}: FollowedShelfCollectionsProps) {
  const pages = collectionsQuery.data?.pages ?? [];
  const collections = pages.flatMap((page) => page.items);
  const hasNext = pages.length > 0 && pages[pages.length - 1].hasNext;

  if (collections.length === 0) {
    return <p className="text-sm text-ink-gray">공개된 컬렉션이 없습니다</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {collections.map((collection) => (
        <button
          key={collection.collectionId}
          type="button"
          onClick={() => onSelectCollection(collection.collectionId)}
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

      {hasNext && (
        <button
          type="button"
          onClick={() => void collectionsQuery.fetchNextPage()}
          disabled={collectionsQuery.isFetchingNextPage}
          className="h-11 rounded-lg border border-pin-navy/15 text-sm font-bold text-pin-navy disabled:opacity-40"
        >
          {collectionsQuery.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
        </button>
      )}
    </div>
  );
}
