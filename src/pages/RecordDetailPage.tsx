import { useParams } from '@tanstack/react-router';
import { DeleteConfirmProvider } from '@/contexts/DeleteConfirmProvider';
import { RecordDetailView } from '@/features/records/components/RecordDetailView';
import { DeleteConfirmDialog } from '@/features/records/components/DeleteConfirmDialog';

export function RecordDetailPage() {
  const { recordId } = useParams({ from: '/records/$recordId' });
  return (
    <DeleteConfirmProvider>
      <RecordDetailView recordId={recordId} />
      <DeleteConfirmDialog recordId={recordId} />
    </DeleteConfirmProvider>
  );
}
