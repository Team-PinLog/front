import { DeleteConfirmProvider } from '@/contexts/DeleteConfirmProvider';
import { AddToCollectionProvider } from '@/contexts/AddToCollectionProvider';
import { RecordDetailView } from './RecordDetailView';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { AddToCollectionDialog } from '@/features/collections/components/AddToCollectionDialog';

interface RecordDetailContentProps {
  recordId: number;
  onRecordDeleted?: () => void;
  /** 노트 페이지 우상단 ✕(373). 홈 오버레이만 넘긴다 — 딥링크 페이지에는 닫기가 없다. */
  onClose?: () => void;
}

/**
 * RecordDetailPage(라우트)와 RecordDetailOverlay(홈 모달) 양쪽이 공유하는 조합.
 * Provider·View·Dialog 구성만 담당하고, 바깥 레이아웃(페이지 vs 모달 셸)은 호출부가 정한다.
 * onRecordDeleted는 DeleteConfirmDialog로 그대로 전달한다(165 보완 — 홈 오버레이 자동 닫힘용).
 */
export function RecordDetailContent({
  recordId,
  onRecordDeleted,
  onClose,
}: RecordDetailContentProps) {
  return (
    <DeleteConfirmProvider>
      <AddToCollectionProvider>
        <RecordDetailView recordId={recordId} onClose={onClose} />
        <DeleteConfirmDialog recordId={recordId} onRecordDeleted={onRecordDeleted} />
        <AddToCollectionDialog recordId={recordId} />
      </AddToCollectionProvider>
    </DeleteConfirmProvider>
  );
}
