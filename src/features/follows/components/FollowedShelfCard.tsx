import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  ShelfBoard,
  ShelfBookSpine,
  ShelfCabinet,
  ShelfIconButton,
  ShelfLabel,
  ShelfMoreButton,
  ShelfRow,
} from '@/shared/ui/Shelf';
import { useFollowShelfCollectionsQuery } from '../hooks/useFollowShelfCollectionsQuery';
import { useUpdateFollowAliasMutation } from '../hooks/useUpdateFollowAliasMutation';
import { useUnfollowMutation } from '../hooks/useUnfollowMutation';

const ALIAS_MAX_LENGTH = 20;

interface FollowedShelfCardProps {
  followId: number;
  alias: string | null;
}

/**
 * 팔로우한 책장 하나를 목업의 책장(cabinet-shell) 비주얼로 렌더링한다.
 * 근거: Jira S15P11A705-144/169, docs/reference/08_API_명세.md 9.3/8.3/8.4.
 * 이 카드가 쓰는 Collection 목록 커서는 이 followId 전용이다(useFollowShelfCollectionsQuery) — 다른
 * 카드나 팔로우 목록(useFollowsQuery) 커서와 절대 혼용하지 않는다.
 * Library 컨텍스트의 언팔로우이므로 useUnfollowMutation에 sourceCollectionId를 넘기지 않는다.
 * 헤더의 연필 아이콘은 목업의 shelf-edit-button/shelf-column-menu를 옮긴 것으로, 기존 별칭 수정·언팔로우
 * 로직을 여는 진입점 역할만 한다 — 두 mutation 자체는 그대로다.
 */
export function FollowedShelfCard({ followId, alias }: FollowedShelfCardProps) {
  const navigate = useNavigate();
  const collectionsQuery = useFollowShelfCollectionsQuery(followId);
  const updateAliasMutation = useUpdateFollowAliasMutation();
  const unfollowMutation = useUnfollowMutation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingAlias, setIsEditingAlias] = useState(false);
  const [aliasInput, setAliasInput] = useState(alias ?? '');

  const handleStartEdit = () => {
    setAliasInput(alias ?? '');
    setIsEditingAlias(true);
    setIsMenuOpen(false);
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
    setIsMenuOpen(false);
    unfollowMutation.mutate({ followId });
  };

  return (
    <div className="flex flex-col gap-2">
      <ShelfCabinet
        headerTitle={alias ?? '이름 없는 책장'}
        headerRight={
          <div className="relative">
            <ShelfIconButton label="책장 관리" onClick={() => setIsMenuOpen((open) => !open)}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                stroke="currentColor"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </ShelfIconButton>

            {isMenuOpen && (
              <div className="absolute right-0 top-9 z-10 w-36 rounded-lg border border-line-card bg-white p-1.5 shadow-[0_14px_30px_rgba(0,0,0,.28)]">
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="h-9 w-full rounded-md px-2.5 text-left text-xs font-bold text-pin-navy hover:bg-log-mint/10"
                >
                  별칭 수정
                </button>
                <button
                  type="button"
                  onClick={handleUnfollow}
                  disabled={unfollowMutation.isPending}
                  className="h-9 w-full rounded-md px-2.5 text-left text-xs font-bold text-pin-navy hover:bg-log-mint/10 disabled:opacity-40"
                >
                  {unfollowMutation.isPending ? '처리 중…' : '팔로우 해제'}
                </button>
              </div>
            )}
          </div>
        }
      >
        {isEditingAlias ? (
          <div className="flex items-center gap-2">
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
              className="h-9 flex-1 rounded-lg border border-log-mint bg-white/10 px-3 text-sm text-white outline-none placeholder:text-white/40 disabled:opacity-40"
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
              className="h-9 flex-none rounded-lg border border-white/20 px-3 text-xs font-bold text-white disabled:opacity-40"
            >
              취소
            </button>
          </div>
        ) : (
          <ShelfLabel>공개 컬렉션</ShelfLabel>
        )}

        {updateAliasMutation.isError && (
          <p className="text-xs text-red-400">{updateAliasMutation.error.message}</p>
        )}
        {unfollowMutation.isError && (
          <p className="text-xs text-red-400">{unfollowMutation.error.message}</p>
        )}

        {collectionsQuery.isPending ? (
          <p className="text-sm text-white/50">불러오는 중…</p>
        ) : collectionsQuery.isError ? (
          <p className="text-sm text-red-400">책장을 불러오지 못했어요.</p>
        ) : (
          <FollowedShelfCollections
            collectionsQuery={collectionsQuery}
            onSelectCollection={(collectionId) =>
              void navigate({ to: '/collections/$collectionId', params: { collectionId } })
            }
          />
        )}
      </ShelfCabinet>
    </div>
  );
}

interface FollowedShelfCollectionsProps {
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
    return <p className="text-sm text-white/50">공개된 컬렉션이 없습니다</p>;
  }

  return (
    <>
      <ShelfRow>
        {collections.map((collection, index) => (
          <ShelfBookSpine
            key={collection.collectionId}
            index={index}
            title={collection.title}
            recordCount={collection.recordCount}
            onClick={() => onSelectCollection(collection.collectionId)}
          />
        ))}
      </ShelfRow>

      <ShelfBoard />

      {hasNext && (
        <ShelfMoreButton
          onClick={() => void collectionsQuery.fetchNextPage()}
          disabled={collectionsQuery.isFetchingNextPage}
        >
          {collectionsQuery.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
        </ShelfMoreButton>
      )}
    </>
  );
}
