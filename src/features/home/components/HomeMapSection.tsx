import { RecordMapView } from '@/features/map/components/RecordMapView';

/**
 * 검색 결과가 없을 때(idle·pending·error·빈 결과) 노출하는 홈 지도 섹션.
 * 근거: Jira S15P11A705-165, mockup(PinLog.responsive.dc.html) home-idle-layout(1106~1116행).
 * RecordMapView(150)는 자체적으로 마커 조회·클릭 시 /records/$recordId 이동을 처리하므로
 * 여기서는 높이를 잡아주는 얇은 래퍼 역할만 한다 — 마커 클릭 동작은 변경하지 않는다(166에서 처리).
 */
export function HomeMapSection() {
  return (
    <div className="h-[520px] w-full overflow-hidden rounded-2xl border border-pin-navy/10 shadow-sm">
      <RecordMapView />
    </div>
  );
}
