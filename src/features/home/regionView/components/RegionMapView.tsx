import { useMemo, useState } from 'react';
import type { RecordMapItem } from '@/features/map/api/getRecordMapMarkers';
import {
  getGeoBounds,
  getProjectionSize,
  getRegionLabel,
  getRegionPathData,
  REGION_BOUNDARIES,
} from '../lib/regionBoundaries';
import {
  getRegionFillOpacity,
  getRegionShadeLevel,
  groupRecordsByRegion,
} from '../lib/regionRecords';
import { RegionRecordCard } from './RegionRecordCard';

/** SVG 좌표계의 높이. 화면 크기와 무관한 내부 단위이고, viewBox가 실제 크기로 늘려 준다. */
const MAP_VIEW_HEIGHT = 600;

/** 호버한 지역에서 한 번에 펼쳐 보여 줄 카드 수. 넘치면 "+N"으로 알린다. */
const MAX_SCATTERED_CARDS = 5;

interface RegionMapViewProps {
  items: RecordMapItem[];
  onSelectRecord: (recordId: number) => void;
  /**
   * 컨테이너 위쪽이 히어로 오버레이에 가려지는 높이(px). 그만큼 안쪽 여백을 줘 지도가 흐려진 구간
   * 아래에서 시작하게 한다. RecordMapView가 같은 이름의 prop으로 fitBounds 여유를 조정하는 것과
   * 같은 개념이다(HomeMapSection).
   */
  topObstructionPx?: number;
}

/**
 * 시·군·구 색칠 지도. 근거: Jira S15P11A705-376.
 *
 * 기록이 있는 지역만 브랜드 색으로 채우고(개수에 따라 농담 4단계), 지역에 마우스를 올리면 그 지역에
 * 저장한 기록들이 폴라로이드 카드로 흩어져 나온다.
 *
 * 카카오맵을 쓰지 않는다 — 여기서 필요한 것은 "어디를 다녀왔나"를 한눈에 보는 도형이지 실제 지도가
 * 아니다. 번들한 경계 데이터로 SVG를 그리면 타일 요청도, SDK 로드도, 지도 API 제약도 없다.
 */
export function RegionMapView({ items, onSelectRecord, topObstructionPx = 0 }: RegionMapViewProps) {
  // 좌표 → 지역 판정은 마커 수 x 지역 수라 목록이 바뀔 때만 돌린다.
  const groups = useMemo(() => groupRecordsByRegion(REGION_BOUNDARIES, items), [items]);

  const geometry = useMemo(() => {
    const bounds = getGeoBounds(REGION_BOUNDARIES);
    const size = getProjectionSize(bounds, MAP_VIEW_HEIGHT);
    return {
      size,
      paths: REGION_BOUNDARIES.map((region) => ({
        region,
        d: getRegionPathData(region, bounds, size),
      })),
    };
  }, []);

  /**
   * 두 상태를 나눈 이유: 호버는 스쳐 지나가는 값이고, 고정(클릭)은 사용자가 남겨 둔 선택이다.
   * 고정이 있으면 호버가 덮어쓰지 않는다 — 카드를 누르려고 마우스를 옮기는 동안 카드가 사라지면
   * 아무것도 누를 수 없다. 터치 기기에서 호버가 없다는 문제도 이 클릭 경로가 함께 해결한다.
   */
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [pinnedCode, setPinnedCode] = useState<string | null>(null);
  const activeCode = pinnedCode ?? hoveredCode;

  const activeRegion = activeCode
    ? REGION_BOUNDARIES.find((region) => region.code === activeCode)
    : undefined;
  const activeItems = activeCode ? (groups.byCode.get(activeCode) ?? []) : [];

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden p-4"
      style={{ paddingTop: topObstructionPx + 16 }}
    >
      <svg
        viewBox={`0 0 ${geometry.size.width} ${geometry.size.height}`}
        className="h-full max-h-full w-auto max-w-full"
        role="img"
        aria-label="시군구별 기록 지도"
      >
        {geometry.paths.map(({ region, d }) => {
          const count = groups.byCode.get(region.code)?.length ?? 0;
          const level = getRegionShadeLevel(count, groups.maxCount);
          const isActive = region.code === activeCode;
          return (
            <path
              key={region.code}
              d={d}
              // 색은 currentColor로 받는다 — 브랜드 토큰을 그대로 쓰면서 새 색 토큰을 만들지 않기
              // 위해서다(tailwind.config는 공유 파일이라 손대지 않는다).
              className={count > 0 ? 'text-log-mint' : 'text-pin-navy'}
              fill="currentColor"
              fillOpacity={count > 0 ? getRegionFillOpacity(level) : 0.04}
              stroke="currentColor"
              strokeOpacity={isActive ? 0.9 : 0.18}
              strokeWidth={isActive ? 1.6 : 0.5}
              // 기록이 없는 지역은 눌러도 보여 줄 것이 없어 포인터·포커스 대상에서 뺀다.
              style={{ cursor: count > 0 ? 'pointer' : 'default' }}
              tabIndex={count > 0 ? 0 : undefined}
              role={count > 0 ? 'button' : undefined}
              aria-label={count > 0 ? `${getRegionLabel(region)} 기록 ${count}개` : undefined}
              onMouseEnter={() => count > 0 && setHoveredCode(region.code)}
              onMouseLeave={() => setHoveredCode(null)}
              onFocus={() => count > 0 && setHoveredCode(region.code)}
              onBlur={() => setHoveredCode(null)}
              onClick={() =>
                count > 0 &&
                setPinnedCode((current) => (current === region.code ? null : region.code))
              }
            />
          );
        })}
      </svg>

      {/* 범례. 색칠이 "많이 간 곳일수록 진하다"는 뜻임을 알려 준다. */}
      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full border border-line-card bg-snow-white/90 px-3 py-1.5 text-[11px] font-semibold text-ink-gray backdrop-blur">
        <span>적게</span>
        <span className="flex gap-0.5 text-log-mint">
          {[1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className="h-2.5 w-2.5 rounded-[2px] bg-current"
              style={{ opacity: getRegionFillOpacity(level) }}
            />
          ))}
        </span>
        <span>많이</span>
      </div>

      {/* 어느 시군구에도 들어가지 않은 기록(바다 위 좌표·해외, 단순화로 잘려 나간 작은 섬 등)을
          조용히 버리지 않고 알린다. 이 수가 크면 데이터나 단순화 강도를 의심해야 한다. */}
      {groups.unassignedCount > 0 && (
        <p className="pointer-events-none absolute right-4 top-4 rounded-full border border-line-card bg-snow-white/90 px-3 py-1.5 text-[11px] font-semibold text-ink-gray backdrop-blur">
          지역 밖 기록 {groups.unassignedCount}개
        </p>
      )}

      {/* 호버·고정된 지역의 기록 카드. 검색 패널(가운데 위)·최근 기록 스택(오른쪽)과 겹치지 않게
          왼쪽 아래에 둔다. */}
      {activeRegion && activeItems.length > 0 && (
        <div className="absolute bottom-6 left-6 w-[19rem]">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-xs font-bold text-pin-navy">{getRegionLabel(activeRegion)}</p>
            <span className="text-[11px] font-semibold text-ink-gray">
              기록 {activeItems.length}개
            </span>
            {pinnedCode && (
              <button
                type="button"
                onClick={() => setPinnedCode(null)}
                className="text-[11px] font-bold text-log-mint underline"
              >
                고정 해제
              </button>
            )}
          </div>
          {/* 카드가 전부 absolute라 높이를 내용에서 얻을 수 없다 — 자리를 잡아 주는 고정 높이다. */}
          <div className="relative h-[9.5rem]">
            {activeItems.slice(0, MAX_SCATTERED_CARDS).map((item, index) => (
              <RegionRecordCard
                key={item.recordId}
                item={item}
                offset={index}
                onSelect={onSelectRecord}
              />
            ))}
          </div>
          {activeItems.length > MAX_SCATTERED_CARDS && (
            <p className="mt-1 text-[11px] font-semibold text-ink-gray">
              외 {activeItems.length - MAX_SCATTERED_CARDS}개
            </p>
          )}
        </div>
      )}
    </div>
  );
}
