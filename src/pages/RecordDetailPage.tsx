import { useParams } from '@tanstack/react-router';
import { RecordDetailContent } from '@/features/records/components/RecordDetailContent';

export function RecordDetailPage() {
  const { recordId } = useParams({ from: '/records/$recordId' });
  return <RecordDetailContent recordId={recordId} />;
}
