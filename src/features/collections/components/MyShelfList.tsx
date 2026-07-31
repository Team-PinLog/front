import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ErrorState } from '@/shared/ui/ErrorState';
import { markCollectionOverlayIntent } from '@/features/collections/lib/collectionOverlayIntent';
import {
  ShelfAddSlot,
  ShelfBoard,
  ShelfBookSpine,
  ShelfCabinet,
  ShelfLabel,
  ShelfMoreButton,
  ShelfRow,
} from '@/shared/ui/Shelf';
import { useMyCollectionsQuery } from '../hooks/useMyCollectionsQuery';
import { NewCollectionModal } from './NewCollectionModal';

/**
 * 내 책장(Shelf) 목록: 내가 만든 Collection 목록 조회.
 * 근거: Jira S15P11A705-141/169, docs/reference/08_API_명세.md 7.2/9.1.
 * props 없이 내부에서 useMyCollectionsQuery를 직접 호출한다 — 144(Library) "내 책장" 섹션에서 그대로 재사용하기 위함.
 * 새 컬렉션 생성(167의 NewCollectionModal)은 useCreateCollectionMutation의 onSuccess가 이미
 * myCollectionsQueryKey를 invalidate하므로, 이 컴포넌트는 모달 열림 상태만 들고 있으면 된다.
 */
export function MyShelfList() {
  const navigate = useNavigate();
  const myCollectionsQuery = useMyCollectionsQuery();
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] = useState(false);

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

  return (
    <div className="flex flex-col gap-4">
      <ShelfCabinet headerTitle="내 책장">
        <ShelfLabel>내 컬렉션</ShelfLabel>

        {collections.length === 0 && (
          <p className="text-xs text-white/50">아직 만든 컬렉션이 없어요.</p>
        )}

        <ShelfRow>
          {collections.map((collection, index) => (
            <ShelfBookSpine
              key={collection.collectionId}
              index={index}
              title={collection.title}
              recordCount={collection.recordCount}
              onClick={() => {
                markCollectionOverlayIntent();
                void navigate({
                  to: '/collections/$collectionId',
                  params: { collectionId: collection.collectionId },
                  state: { collectionOverlay: true },
                });
              }}
            />
          ))}
          <ShelfAddSlot onClick={() => setIsNewCollectionModalOpen(true)} />
        </ShelfRow>

        <ShelfBoard />

        {hasNext && (
          <ShelfMoreButton
            onClick={() => void myCollectionsQuery.fetchNextPage()}
            disabled={myCollectionsQuery.isFetchingNextPage}
          >
            {myCollectionsQuery.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
          </ShelfMoreButton>
        )}
      </ShelfCabinet>

      <NewCollectionModal
        isOpen={isNewCollectionModalOpen}
        onClose={() => setIsNewCollectionModalOpen(false)}
      />
    </div>
  );
}
