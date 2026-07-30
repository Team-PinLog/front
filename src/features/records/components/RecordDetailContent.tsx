import { DeleteConfirmProvider } from '@/contexts/DeleteConfirmProvider';
import { CreateCollectionProvider } from '@/contexts/CreateCollectionProvider';
import { RecordDetailView } from './RecordDetailView';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { CreateCollectionDialog } from '@/features/collections/components/CreateCollectionDialog';

interface RecordDetailContentProps {
  recordId: number;
  onRecordDeleted?: () => void;
}

/**
 * RecordDetailPage(라우트)와 RecordDetailOverlay(홈 모달) 양쪽이 공유하는 조합.
 * Provider·View·Dialog 구성만 담당하고, 바깥 레이아웃(페이지 vs 모달 셸)은 호출부가 정한다.
 * onRecordDeleted는 DeleteConfirmDialog로 그대로 전달한다(165 보완 — 홈 오버레이 자동 닫힘용).
 */
export function RecordDetailContent({ recordId, onRecordDeleted }: RecordDetailContentProps) {
  return (
    <DeleteConfirmProvider>
      <CreateCollectionProvider>
        <RecordDetailView recordId={recordId} />
        <DeleteConfirmDialog recordId={recordId} onRecordDeleted={onRecordDeleted} />
        <CreateCollectionDialog recordId={recordId} />
      </CreateCollectionProvider>
    </DeleteConfirmProvider>
  );
}
