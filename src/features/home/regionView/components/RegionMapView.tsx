import { useEffect, useMemo, useRef, useState } from 'react';
import type { RecordMapItem } from '@/features/map/api/getRecordMapMarkers';
import { PinStanding } from '@/shared/ui/PinSymbols';
import { getMapToneRightFadeMask } from '@/features/map/lib/mapToneMask';
import {
  getGeoBounds,
  getProjectionSize,
  getRegionCenter,
  getRegionLabel,
  getProjectionSizeByWidth,
  getRegionPathData,
  isJejuRegion,
  projectPoint,
  REGION_BOUNDARIES,
} from '../lib/regionBoundaries';
import {
  getRegionFillOpacity,
  getRegionShadeLevel,
  groupRecordsByRegion,
} from '../lib/regionRecords';
import {
  clampBurstOrigin,
  getRadialBurstPositions,
  pullOriginTowardCenter,
} from '../lib/radialBurst';

/** SVG 좌표계의 높이. 화면 크기와 무관한 내부 단위이고, viewBox가 실제 크기로 늘려 준다. */
const MAP_VIEW_HEIGHT = 600;

/**
 * 기록이 있는 지역에 놓는 **보이지 않는 클릭 원**의 반지름(SVG 단위, 화면 px과 거의 1:1).
 *
 * 377에서 이 기능이 "동작하지 않는다"고 보고된 원인이 여기 있다 — 이전에는 시·군·구 도형 자체가
 * 유일한 대상이었는데, 전국 축척에서 서울 중구는 약 6x3px이라 마우스를 올리는 것 자체가 사실상
 * 불가능했다. 손가락·커서가 확실히 닿는 크기로 대상을 따로 만든다.
 */
const REGION_HIT_RADIUS = 11;

/** 한 번에 띄우는 최대 칩 수. 넘치면 마지막 칩이 "+N"이 된다. */
const MAX_BURST_ITEMS = 12;

/**
 * 팝업 칩의 크기·글자 — **취향 조정 지점**이다. 존재감이 약하면 여기서 `text-[11px]`와 `px-3 py-1.5`,
 * `max-w-[11rem]`를 키운다(퍼지는 거리·간격은 lib/radialBurst.ts의 상수들이다).
 * ⚠️ Tailwind는 소스를 원시 텍스트로 스캔하므로 이 문자열은 **완성된 리터럴**이어야 한다 —
 * 조각을 조립하면 클래스가 산출되지 않는다(conventions 2장).
 */
const REGION_BURST_CHIP_CLASS =
  'absolute z-20 flex max-w-[11rem] animate-pin-pop-in items-center gap-1.5 rounded-full border border-line-card bg-snow-white px-3 py-1.5 text-[11px] font-bold text-pin-navy shadow-lg transition-colors hover:border-log-mint hover:text-log-mint motion-reduce:animate-none';

/**
 * 제주 인셋 박스가 본토 지도 폭에서 차지하는 비율과 여백(SVG 단위).
 *
 * 제주를 인셋으로 뺀 이유(사용자 허용, 한국 지도의 관례):
 * 제주까지 한 화면에 담으면 세로 범위가 위도 33.19~38.61(5.42도)인데, 제주를 빼면 34.30~38.61
 * (4.31도)로 **20% 줄어든다**. 지역 뷰는 위쪽 히어로에 가려지는 높이를 뺀 나머지에 지도를 넣어야
 * 해서 세로가 늘 부족한데, 같은 높이에서 본토를 그만큼 크게 그릴 수 있다(폭 기준 566 → 711 단위,
 * 약 1.26배). 시군구가 커지면 클릭도 그만큼 쉬워진다 — 이 화면의 가장 큰 약점이 도심 자치구가
 * 몇 px이라는 점이었다.
 */
/**
 * 383: 인셋을 **마스크가 걸린 <svg> 밖으로 꺼내** 별도 요소로 그린다.
 *
 * 이전에는 본토 <svg> 안 우하단에 두었는데, 그 <svg>에는 오른쪽 페이드 마스크가 걸려 있어 인셋이
 * 그대로 잘렸다("여전히 그라데이션에 잘린다"). 같은 <svg> 안에 있는 한 위치를 옮겨 봤자 본토
 * 위로 겹치거나(경남·부산 자리) 다시 페이드에 닿는다 — 마스크 밖으로 꺼내는 것이 유일한 해법이다.
 *
 * 크기도 함께 줄였다(사용자 지시). 폭을 본토 비율이 아니라 **px 고정**으로 두는 이유는, 이제 인셋이
 * <svg> 좌표계가 아니라 컨테이너 위에 놓이기 때문이다 — 화면에서 보이는 크기를 직접 정하는 편이
 * 조정하기 쉽다.
 */
const JEJU_INSET_WIDTH_PX = 108;
/** 컨테이너 오른쪽에서 떨어뜨릴 거리(px). 페이드 폭보다 커야 인셋이 그 영향권 밖에 놓인다. */
const JEJU_INSET_RIGHT_PX = 24;
const JEJU_INSET_BOTTOM_PX = 20;
const JEJU_INSET_PADDING = 8;

interface RegionMapViewProps {
  items: RecordMapItem[];
  onSelectRecord: (recordId: number) => void;
  /**
   * 컨테이너 위쪽이 히어로 오버레이에 가려지는 높이(px). 그만큼 안쪽 여백을 줘 지도가 흐려진 구간
   * 아래에서 시작하게 한다. RecordMapView가 같은 이름의 prop으로 fitBounds 여유를 조정하는 것과
   * 같은 개념이다(HomeMapSection).
   */
  topObstructionPx?: number;
  /**
   * 지도 오른쪽 끝을 그라데이션으로 지우는 폭(px). 지도 뷰(RecordMapView)와 같은 값을 받아야 두 탭의
   * 오른쪽 경계가 같아 보인다. **마스크는 <svg>에만 건다** — 범례·칩까지 지워지면 안 된다.
   */
  rightFadePx?: number;
}

interface RegionBurst {
  regionCode: string;
  /** 컨테이너 기준 클릭 지점(px). */
  originXPx: number;
  originYPx: number;
}

/**
 * 시·군·구 색칠 지도. 근거: Jira S15P11A705-376, 377(코멘트 — flower-menu 방식 재설계).
 *
 * 기록이 있는 지역만 브랜드 색으로 채우고(개수에 따라 농담 4단계), **지역을 누르면 그 지역에 저장한
 * 장소들이 누른 자리 주변으로 방사형으로 하나씩 떠오른다**.
 *
 * 376의 "호버 → 좌하단 카드 패널"은 폐기했다. 두 가지가 문제였다:
 * ① 대상이 시·군·구 도형 자체라 도심 자치구는 몇 px이라 호버가 되지 않았다(위 REGION_HIT_RADIUS).
 * ② 카드가 지도 반대편(좌하단)에 떠서, 어느 지역을 가리키는 것인지 시선이 이어지지 않았다.
 * 지금은 누른 자리에서 바로 퍼지므로 둘 다 성립하지 않는다.
 */
export function RegionMapView({
  items,
  onSelectRecord,
  topObstructionPx = 0,
  rightFadePx = 0,
}: RegionMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [burst, setBurst] = useState<RegionBurst | null>(null);

  // 좌표 → 지역 판정은 마커 수 x 지역 수라 목록이 바뀔 때만 돌린다.
  const groups = useMemo(() => groupRecordsByRegion(REGION_BOUNDARIES, items), [items]);

  const geometry = useMemo(() => {
    // 본토와 제주를 **따로 투영한다.** 하나로 묶으면 제주까지의 빈 바다가 세로를 다 먹는다.
    const mainlandRegions = REGION_BOUNDARIES.filter((region) => !isJejuRegion(region.code));
    const jejuRegions = REGION_BOUNDARIES.filter((region) => isJejuRegion(region.code));

    const mainBounds = getGeoBounds(mainlandRegions);
    const mainSize = getProjectionSize(mainBounds, MAP_VIEW_HEIGHT);

    const jejuBounds = getGeoBounds(jejuRegions);
    // 인셋은 자기만의 좌표계를 갖는다(별도 <svg>). 폭을 정하면 높이는 제주의 종횡비로 따라온다.
    const jejuSize = getProjectionSizeByWidth(jejuBounds, JEJU_INSET_WIDTH_PX);

    const toShape = (
      regions: typeof REGION_BOUNDARIES,
      bounds: typeof mainBounds,
      size: typeof mainSize,
    ) =>
      regions.map((region) => ({
        region,
        d: getRegionPathData(region, bounds, size),
        center: projectPoint(getRegionCenter(region), bounds, size),
      }));

    return {
      size: mainSize,
      mainland: toShape(mainlandRegions, mainBounds, mainSize),
      // 인셋 안의 좌표는 <g transform>이 옮겨 주므로 여기서는 인셋 자체의 좌표계로 둔다.
      jeju: toShape(jejuRegions, jejuBounds, jejuSize),
      jejuSize,
    };
  }, []);

  // ESC로 닫는다. 지도를 다시 누르거나 바깥을 눌러도 닫히지만, 키보드만 쓰는 경우의 탈출구가 필요하다.
  useEffect(() => {
    if (!burst) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setBurst(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [burst]);

  const burstRegion = burst
    ? REGION_BOUNDARIES.find((region) => region.code === burst.regionCode)
    : undefined;
  const burstItems = burst ? (groups.byCode.get(burst.regionCode) ?? []) : [];
  const shownItems = burstItems.slice(0, MAX_BURST_ITEMS);
  const positions = getRadialBurstPositions(shownItems.length);

  /**
   * 원점 보정을 **렌더가 아니라 여기서** 한다. 컨테이너 크기는 ref로만 알 수 있는데 렌더 중에 ref를
   * 읽으면 안 되고(react-hooks/refs), 애초에 필요한 시점도 "눌린 순간" 한 번뿐이다. 눌린 자리를
   * 그대로 저장한 뒤 렌더에서 자르려 하면 첫 프레임에 대형이 화면 밖으로 나갔다가 들어온다.
   */
  const openBurst = (
    regionCode: string,
    itemCount: number,
    point: { clientX: number; clientY: number },
  ) => {
    const container = containerRef.current;
    const rect = container?.getBoundingClientRect();
    const rawOrigin = {
      xPx: point.clientX - (rect?.left ?? 0),
      yPx: point.clientY - (rect?.top ?? 0),
    };
    const nextPositions = getRadialBurstPositions(Math.min(itemCount, MAX_BURST_ITEMS));
    const bounds = container
      ? { width: container.clientWidth, height: container.clientHeight }
      : null;
    // 가운데로 당긴 **뒤에** 화면 밖으로 나가는지 확인한다(순서가 바뀌면 당기다 다시 밖으로 나간다).
    const clamped = bounds
      ? clampBurstOrigin(pullOriginTowardCenter(rawOrigin, bounds), nextPositions, bounds)
      : rawOrigin;
    setBurst((current) =>
      current?.regionCode === regionCode
        ? null
        : { regionCode, originXPx: clamped.xPx, originYPx: clamped.yPx },
    );
  };

  const origin = { xPx: burst?.originXPx ?? 0, yPx: burst?.originYPx ?? 0 };

  type RegionShape = {
    region: (typeof REGION_BOUNDARIES)[number];
    d: string;
    center: readonly [number, number];
  };

  /** 색칠 도형. 본토와 제주 인셋이 **같은 규칙**을 쓰도록 함수로 뽑았다 — 인셋만 다르게 칠해지면 안 된다. */
  const renderShapes = (shapes: RegionShape[]) =>
    shapes.map(({ region, d }) => {
      const count = groups.byCode.get(region.code)?.length ?? 0;
      const level = getRegionShadeLevel(count, groups.maxCount);
      const isActive = region.code === burst?.regionCode;
      return (
        <path
          key={region.code}
          d={d}
          // 색은 currentColor로 받는다 — 브랜드 토큰을 그대로 쓰면서 새 색 토큰을 만들지 않기
          // 위해서다(tailwind.config의 색 변경은 금지).
          className={count > 0 ? 'text-log-mint' : 'text-pin-navy'}
          fill="currentColor"
          fillOpacity={count > 0 ? getRegionFillOpacity(level) : 0.04}
          stroke="currentColor"
          strokeOpacity={isActive ? 0.9 : 0.18}
          strokeWidth={isActive ? 1.6 : 0.5}
          // 도형 자체는 클릭 대상이 아니다 — 아래 원이 그 일을 한다(너무 작아서다).
          pointerEvents="none"
        />
      );
    });

  /** 클릭 대상. 제주 인셋 안에서도 **같은 반지름**이라 조작감이 본토와 다르지 않다. */
  const renderHitTargets = (shapes: RegionShape[]) =>
    shapes.map(({ region, center }) => {
      const count = groups.byCode.get(region.code)?.length ?? 0;
      if (count === 0) {
        return null;
      }
      const isActive = region.code === burst?.regionCode;
      return (
        <circle
          key={`hit-${region.code}`}
          cx={center[0]}
          cy={center[1]}
          r={REGION_HIT_RADIUS}
          // 보이지 않지만 눌린다. fill을 none으로 두면 안이 비어 클릭이 통과한다.
          fill="transparent"
          className="cursor-pointer text-log-mint"
          stroke="currentColor"
          strokeOpacity={isActive ? 0.9 : 0}
          strokeWidth={1.5}
          tabIndex={0}
          role="button"
          aria-label={`${getRegionLabel(region)} 기록 ${count}개 펼치기`}
          onClick={(event) => openBurst(region.code, count, event)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              const rect = event.currentTarget.getBoundingClientRect();
              openBurst(region.code, count, {
                clientX: rect.left + rect.width / 2,
                clientY: rect.top + rect.height / 2,
              });
            }
          }}
        />
      );
    });

  return (
    <div
      ref={containerRef}
      // 377-D: 한반도가 세로로 다 보이도록 지도를 **좌측**에 붙인다.
      // 오른쪽 자리 비우기는 여기서 하지 않는다 — 배경 레이어 자체가 md 이상에서 좁아져 '최근의
      // 장소' 자리를 비운다(HomePage). 여기서 또 pr을 주면 자리를 두 번 빼 지도만 작아진다.
      className="relative flex h-full w-full items-center justify-start overflow-hidden p-4"
      style={{ paddingTop: topObstructionPx + 16 }}
    >
      <svg
        viewBox={`0 0 ${geometry.size.width} ${geometry.size.height}`}
        // 377 후속 안전판: 컨텐츠가 늘어 <main>이 뷰포트보다 커지더라도 지도는 화면 안에 머문다.
        // 카드를 흐름에서 뺀 지금은 평소 걸리지 않지만, 검색 결과처럼 나중에 세로가 늘어나는 것이
        // 생겼을 때 지도가 따라 자라 다시 스크롤을 만드는 일을 막는다.
        className="h-full max-h-full w-auto max-w-full"
        style={{
          maxHeight: `calc(100dvh - ${topObstructionPx + 120}px)`,
          ...(rightFadePx > 0
            ? {
                maskImage: getMapToneRightFadeMask(rightFadePx),
                WebkitMaskImage: getMapToneRightFadeMask(rightFadePx),
              }
            : {}),
        }}
        role="img"
        aria-label="시군구별 기록 지도"
      >
        {renderShapes(geometry.mainland)}
        {renderHitTargets(geometry.mainland)}
      </svg>

      {/* 383: 제주 인셋 — **본토 <svg> 바깥**의 독립 요소다. 여기엔 페이드 마스크가 걸리지 않아
          잘리지 않는다. 본토와 축척이 다르므로 점선 테두리로 "다른 상자"임을 알린다. */}
      <svg
        width={geometry.jejuSize.width + JEJU_INSET_PADDING * 2}
        height={geometry.jejuSize.height + JEJU_INSET_PADDING * 2}
        viewBox={`${-JEJU_INSET_PADDING} ${-JEJU_INSET_PADDING} ${geometry.jejuSize.width + JEJU_INSET_PADDING * 2} ${geometry.jejuSize.height + JEJU_INSET_PADDING * 2}`}
        className="absolute"
        style={{ right: JEJU_INSET_RIGHT_PX, bottom: JEJU_INSET_BOTTOM_PX }}
        role="img"
        aria-label="제주 지역 기록 지도"
      >
        <rect
          x={-JEJU_INSET_PADDING}
          y={-JEJU_INSET_PADDING}
          width={geometry.jejuSize.width + JEJU_INSET_PADDING * 2}
          height={geometry.jejuSize.height + JEJU_INSET_PADDING * 2}
          rx={6}
          fill="none"
          className="text-pin-navy"
          stroke="currentColor"
          strokeOpacity={0.22}
          strokeDasharray="4 3"
          strokeWidth={0.8}
        />
        {renderShapes(geometry.jeju)}
        {renderHitTargets(geometry.jeju)}
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
        <p className="pointer-events-none absolute left-4 top-14 rounded-full border border-line-card bg-snow-white/90 px-3 py-1.5 text-[11px] font-semibold text-ink-gray backdrop-blur">
          지역 밖 기록 {groups.unassignedCount}개
        </p>
      )}

      {burst && burstRegion && (
        <>
          {/* 바깥을 누르면 닫힌다. 칩보다 아래층이라 칩 클릭을 가로채지 않는다. */}
          <button
            type="button"
            aria-label="펼친 장소 닫기"
            className="absolute inset-0 z-10 cursor-default"
            onClick={() => setBurst(null)}
          />

          {/* 누른 지역 이름표. 어느 지역을 펼쳤는지가 칩만으로는 드러나지 않는다. */}
          <p
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pin-navy px-3 py-1 text-[11px] font-bold text-paper-white shadow-lg"
            style={{ left: origin.xPx, top: origin.yPx }}
          >
            {getRegionLabel(burstRegion)} {burstItems.length}
          </p>

          {shownItems.map((item, index) => {
            const position = positions[index]!;
            const isLastSlot = index === MAX_BURST_ITEMS - 1 && burstItems.length > MAX_BURST_ITEMS;
            return (
              <button
                key={item.recordId}
                type="button"
                onClick={() => onSelectRecord(item.recordId)}
                // animate-pin-pop-in이 스태거의 본체다. transform에 translate(-50%,-50%)가 들어
                // 있는 키프레임이라 여기서 별도 translate 클래스를 주면 서로 덮어쓴다.
                className={REGION_BURST_CHIP_CLASS}
                style={{
                  left: origin.xPx + position.xPx,
                  top: origin.yPx + position.yPx,
                  animationDelay: `${position.delayMs}ms`,
                  // motion-reduce에서 애니메이션이 꺼지면 키프레임의 translate도 함께 사라져 칩이
                  // 자기 좌상단 모서리를 기준으로 놓인다. 그때도 중앙 정렬이 유지되도록 기본
                  // transform을 함께 준다(애니메이션이 돌면 키프레임이 이 값을 대체한다).
                  transform: 'translate(-50%,-50%)',
                }}
              >
                <PinStanding height={11} className="flex-none text-log-mint" />
                <span className="truncate">
                  {isLastSlot ? `외 ${burstItems.length - MAX_BURST_ITEMS + 1}개` : item.name}
                </span>
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}
