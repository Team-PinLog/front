import type { RecordMapItem } from '@/features/map/api/getRecordMapMarkers';
import { getRecentStackCardLayout } from '@/features/home/lib/recentRecordStack';

interface RegionRecordCardProps {
  item: RecordMapItem;
  /** 흩뿌림 깊이. 0이 맨 앞이고, 뒤로 갈수록 기울고 밀린다. */
  offset: number;
  onSelect: (recordId: number) => void;
}

/**
 * 지역 뷰에서 호버한 지역의 기록 한 장. 근거: Jira S15P11A705-376.
 *
 * 371의 `getRecentStackCardLayout`(각도·오프셋 순수 함수)을 그대로 재사용해 두 화면의 카드가 같은
 * 리듬으로 겹치게 한다.
 *
 * ⚠️ 371의 `RecentRecordCard` 컴포넌트 자체는 재사용하지 않는다. 그 컴포넌트는
 * `RecentRecordCardItem`(사진·키워드·저장 시각)을 받는데, 지역 뷰가 가진 것은 지도 마커 응답
 * (`GET /records/map`: recordId·장소명·좌표)뿐이라 키워드나 날짜를 채울 방법이 없다. 없는 값을
 * 빈 배열이나 오늘 날짜로 지어내 넘기면 화면이 사실과 다른 것을 말하게 된다. 그래서 **모양은 같은
 * 계열로 두되 가진 정보만 그리는** 작은 카드를 따로 둔다(지역별 상세를 지연 호출하면 지역 하나에
 * N번 요청이 나가므로 그것도 하지 않는다).
 */
export function RegionRecordCard({ item, offset, onSelect }: RegionRecordCardProps) {
  const layout = getRecentStackCardLayout(offset);

  return (
    <button
      type="button"
      onClick={() => onSelect(item.recordId)}
      className="absolute left-0 top-0 w-32 origin-bottom-left rounded-[3px] bg-white p-2 pb-3 text-left shadow-[0_10px_24px_-12px_rgba(4,33,66,0.5)] transition-transform duration-200 ease-out hover:!scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-log-mint motion-reduce:transition-none"
      style={{
        transform: `translate(${layout.translateXPx * 2.2}px, ${layout.translateYPx * 1.4}px) rotate(${layout.rotateDeg * 1.6}deg) scale(${layout.scale})`,
        zIndex: layout.zIndex,
      }}
    >
      {/* 사진 칸. 지도 마커 응답에는 썸네일이 없어 항상 색면이다 — 371 카드의 폴백과 같은 자리다. */}
      <div className="mb-1.5 aspect-[4/3] w-full bg-log-mint/10" aria-hidden="true" />
      <p className="truncate text-[11px] font-bold text-pin-navy">{item.name}</p>
    </button>
  );
}
