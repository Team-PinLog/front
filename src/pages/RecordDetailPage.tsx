import { useParams } from '@tanstack/react-router';
import { DeleteConfirmProvider } from '@/contexts/DeleteConfirmProvider';
import { CreateCollectionProvider } from '@/contexts/CreateCollectionProvider';
import { RecordDetailView } from '@/features/records/components/RecordDetailView';
import { DeleteConfirmDialog } from '@/features/records/components/DeleteConfirmDialog';
import { CreateCollectionDialog } from '@/features/collections/components/CreateCollectionDialog';

export function RecordDetailPage() {
  const { recordId } = useParams({ from: '/records/$recordId' });
  return (
    <DeleteConfirmProvider>
      <CreateCollectionProvider>
        <RecordDetailView recordId={recordId} />
        <DeleteConfirmDialog recordId={recordId} />
        <CreateCollectionDialog recordId={recordId} />
      </CreateCollectionProvider>
    </DeleteConfirmProvider>
  );
}
