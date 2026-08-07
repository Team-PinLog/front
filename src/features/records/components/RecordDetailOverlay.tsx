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
    // 415: 스크림을 남색에서 따뜻한 잉크로 바꿨다 — 뒤가 파랗게 물들면 크림·베이지 종이가
    // 차갑게 읽혀 다이어리 인상이 깨진다.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#3a332c]/45 p-6"
      onClick={onClose}
      role="presentation"
    >
      {/* 373: 흰 라운드 패널·별도 ✕는 노트 페이지(RecordNotebookPage)가 대신한다. 셸은 배경과 폭만
          맡는다. 배경 클릭·✕로 닫는 기존 정책은 그대로다(324 선례 — ESC 핸들러는 원래 없었다). */}
      <div
        className="relative w-[min(1000px,calc(100vw-48px))]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="기록 상세"
      >
        <RecordDetailContent recordId={recordId} onRecordDeleted={onClose} onClose={onClose} />
      </div>
    </div>
  );
}
