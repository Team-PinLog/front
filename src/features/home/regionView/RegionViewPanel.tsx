import { useRecordMapMarkersQuery } from '@/features/map/hooks/useRecordMapMarkersQuery';
import { RegionMapView } from './components/RegionMapView';

interface RegionViewPanelProps {
  onSelectRecord: (recordId: number) => void;
  /** 히어로 오버레이가 위쪽을 덮는 높이(px). HomeMapSection과 같은 값을 받는다. */
  topObstructionPx?: number;
  /** 지도 오른쪽 끝을 그라데이션으로 지우는 폭(px). 지도 뷰와 같은 값을 써야 두 탭이 같아 보인다. */
  rightFadePx?: number;
}

/**
 * 지역 뷰의 유일한 진입점. 근거: Jira S15P11A705-376.
 *
 * ## 롤백 안내 (사용자 명시: "팀원 피드백으로 롤백할 수 있다")
 * 이 기능은 `src/features/home/regionView/` **한 폴더에 격리돼 있다.** 되돌리려면
 *   ① HomePage에서 토글 블록과 이 컴포넌트의 lazy import를 지우고
 *   ② 이 폴더를 통째로 삭제하면 끝이다.
 * 바깥 코드에 남기는 흔적은 그 두 곳뿐이고, 기존 지도(RecordMapView)·검색 코드는 한 줄도 바뀌지
 * 않았다. 반대로 이 폴더는 바깥의 것을 **읽기만** 한다(지도 마커 쿼리, 371의 카드 배치 순수 함수).
 */
export function RegionViewPanel({
  onSelectRecord,
  topObstructionPx,
  rightFadePx,
}: RegionViewPanelProps) {
  const { data, isLoading, isError } = useRecordMapMarkersQuery();

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-ink-gray">
        지역을 그리는 중입니다…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-ink-gray">
        기록을 불러오지 못했습니다.
      </div>
    );
  }

  const items = data?.items ?? [];

  // items: []는 오류가 아니라 정상 응답이다(AGENTS.md 절대 금지 4와 같은 취급 원칙).
  // 이때도 지도는 그린다 — 전부 무채색인 화면 자체가 "아직 아무 데도 안 갔다"는 안내가 된다.
  return (
    <div className="relative h-full w-full">
      <RegionMapView
        items={items}
        onSelectRecord={onSelectRecord}
        topObstructionPx={topObstructionPx}
        rightFadePx={rightFadePx}
      />
      {items.length === 0 && (
        <p className="pointer-events-none absolute inset-x-0 bottom-8 text-center text-sm text-ink-gray">
          아직 저장한 기록이 없어요. 장소를 기록하면 다녀온 지역이 색으로 채워집니다.
        </p>
      )}
    </div>
  );
}
