import { useParams, useSearch } from '@tanstack/react-router';
import { CollectionDeleteConfirmProvider } from '@/contexts/CollectionDeleteConfirmProvider';
import { EditCollectionTitleProvider } from '@/contexts/EditCollectionTitleProvider';
import { CollectionSpreadProvider } from '@/contexts/CollectionSpreadProvider';
import { DeleteConfirmProvider } from '@/contexts/DeleteConfirmProvider';
import { CollectionDetailView } from '@/features/collections/components/CollectionDetailView';
import { CollectionDeleteConfirmDialog } from '@/features/collections/components/CollectionDeleteConfirmDialog';
import { EditCollectionTitleDialog } from '@/features/collections/components/EditCollectionTitleDialog';

export function CollectionDetailPage() {
  const { collectionId } = useParams({ from: '/collections/$collectionId' });
  const { feedRequestId, feedPosition } = useSearch({ from: '/collections/$collectionId' });
  return (
    <CollectionDeleteConfirmProvider>
      <EditCollectionTitleProvider>
        {/* collectionId로 key를 걸어 다른 Collection으로 이동(예: ShelfExploreSection 클릭)할 때 스프레드
            인덱스를 0으로 리셋한다 — 이 라우트는 params만 바뀌고 컴포넌트가 재마운트되지 않는다. */}
        <CollectionSpreadProvider key={collectionId}>
          {/* ContextCard(소유 Collection의 record 안)가 useDeleteContextMutation → useDeleteConfirm을
              쓰므로 DeleteConfirmProvider가 필요하다. 짝이 되는 DeleteConfirmDialog(Record 강제 삭제
              확인 모달)는 recordId로 스프레드 상태의 currentRecord가 필요해 여기가 아니라
              CollectionDetailView 내부(그 값이 이미 계산되는 지점)에서 렌더링한다. */}
          <DeleteConfirmProvider>
            <CollectionDetailView
              collectionId={collectionId}
              feedRequestId={feedRequestId}
              feedPosition={feedPosition}
            />
          </DeleteConfirmProvider>
        </CollectionSpreadProvider>
        <CollectionDeleteConfirmDialog collectionId={collectionId} />
        <EditCollectionTitleDialog collectionId={collectionId} />
      </EditCollectionTitleProvider>
    </CollectionDeleteConfirmProvider>
  );
}
