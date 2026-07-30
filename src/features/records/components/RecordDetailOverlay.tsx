import { RecordDetailContent } from './RecordDetailContent';

interface RecordDetailOverlayProps {
  recordId: number;
  onClose: () => void;
}

/**
 * 홈 화면(검색 결과 갤러리·지도)에서 Record 상세를 라우트 이동 없이 보여주는 모달 셸.
 * 근거: Jira S15P11A705-165. 내용 조합은 RecordDetailPage와 RecordDetailContent를 공유한다.
 * /records/$recordId 라우트는 딥링크용으로 그대로 유지된다(제거하지 않음).
 */
export function RecordDetailOverlay({ recordId, onClose }: RecordDetailOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-pin-navy/40 p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative max-h-[calc(100dvh-48px)] w-[min(720px,calc(100vw-48px))] overflow-y-auto rounded-2xl bg-paper-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-pin-navy/10 text-pin-navy"
        >
          ×
        </button>
        <RecordDetailContent recordId={recordId} onRecordDeleted={onClose} />
      </div>
    </div>
  );
}
