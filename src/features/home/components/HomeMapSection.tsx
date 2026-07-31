import { RecordMapView } from '@/features/map/components/RecordMapView';

interface HomeMapSectionProps {
  /** 마커 클릭 시 RecordDetailOverlay를 열도록 HomePage가 주입하는 콜백. 근거: Jira S15P11A705-166. */
  onMarkerClick: (recordId: number) => void;
}

/**
 * 검색 결과가 없을 때(idle·pending·error·빈 결과) 노출하는 홈 지도 섹션.
 * 근거: Jira S15P11A705-165, mockup(PinLog.responsive.dc.html) home-idle-layout(1106~1116행).
 * 마커 클릭 시 /records/$recordId로 이동하는 대신 RecordDetailOverlay를 열도록
 * onMarkerClick을 RecordMapView에 그대로 전달한다(Jira S15P11A705-166).
 */
export function HomeMapSection({ onMarkerClick }: HomeMapSectionProps) {
  return (
    <div className="h-[520px] w-full overflow-hidden rounded-2xl border border-pin-navy/10 shadow-sm">
      <RecordMapView onMarkerClick={onMarkerClick} />
    </div>
  );
}
