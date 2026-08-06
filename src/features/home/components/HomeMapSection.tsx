import { RecordMapView } from '@/features/map/components/RecordMapView';

interface HomeMapSectionProps {
  /** 마커 클릭 시 RecordDetailOverlay를 열도록 HomePage가 주입하는 콜백. 근거: Jira S15P11A705-166. */
  onMarkerClick: (recordId: number) => void;
  /** 히어로 오버레이가 배경 지도를 덮는 높이(px). 근거: Jira S15P11A705-325. */
  topObstructionPx: number;
  /** 저장 직후 이 Record로 지도를 옮긴다. 이동을 마치면 onFocusRecordHandled로 알린다. */
  focusRecordId: number | null;
  onFocusRecordHandled: () => void;
}

/**
 * 홈 화면 배경 지도. 항상 떠 있는 풀블리드 배경 레이어라 카드 스타일(라운드·테두리·그림자·고정
 * 높이)을 갖지 않는다 — HomePage가 이 컴포넌트를 절대 위치(absolute inset-0) 레이어에 넣어 실제
 * 크기를 정해준다. 마커 클릭 시 /records/$recordId로 이동하는 대신 RecordDetailOverlay를 열도록
 * onMarkerClick을 RecordMapView에 그대로 전달한다(Jira S15P11A705-166).
 * 근거: Jira S15P11A705-307(배경 레이어 재구성 — 이전엔 rounded-2xl 카드 컨테이너였다).
 */
export function HomeMapSection({
  onMarkerClick,
  topObstructionPx,
  focusRecordId,
  onFocusRecordHandled,
}: HomeMapSectionProps) {
  return (
    <div className="h-full w-full">
      <RecordMapView
        onMarkerClick={onMarkerClick}
        topObstructionPx={topObstructionPx}
        focusRecordId={focusRecordId}
        onFocusRecordHandled={onFocusRecordHandled}
      />
    </div>
  );
}
