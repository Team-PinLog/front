import { useParams } from '@tanstack/react-router';
import { RecordDetailView } from '@/features/records/components/RecordDetailView';

export function RecordDetailPage() {
  const { recordId } = useParams({ from: '/records/$recordId' });
  return <RecordDetailView recordId={recordId} />;
}
