import { useParams, useSearch } from '@tanstack/react-router';
import { CollectionDeleteConfirmProvider } from '@/contexts/CollectionDeleteConfirmProvider';
import { EditCollectionTitleProvider } from '@/contexts/EditCollectionTitleProvider';
import { CollectionDetailView } from '@/features/collections/components/CollectionDetailView';
import { CollectionDeleteConfirmDialog } from '@/features/collections/components/CollectionDeleteConfirmDialog';
import { EditCollectionTitleDialog } from '@/features/collections/components/EditCollectionTitleDialog';

export function CollectionDetailPage() {
  const { collectionId } = useParams({ from: '/collections/$collectionId' });
  const { feedRequestId, feedPosition } = useSearch({ from: '/collections/$collectionId' });
  return (
    <CollectionDeleteConfirmProvider>
      <EditCollectionTitleProvider>
        <CollectionDetailView
          collectionId={collectionId}
          feedRequestId={feedRequestId}
          feedPosition={feedPosition}
        />
        <CollectionDeleteConfirmDialog collectionId={collectionId} />
        <EditCollectionTitleDialog collectionId={collectionId} />
      </EditCollectionTitleProvider>
    </CollectionDeleteConfirmProvider>
  );
}
