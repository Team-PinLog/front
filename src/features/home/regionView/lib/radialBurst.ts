/**
 * 지역을 눌렀을 때 장소들이 클릭 지점 주변으로 "또로록" 퍼지는 배치 계산.
 * 근거: Jira S15P11A705-377 코멘트(사용자 지시 — animata flower-menu 방식).
 *
 * 순수 함수로 둔 이유: 각도·반지름·지연은 화면 없이 값으로 검증할 수 있고(겹치지 않는가, 순서대로
 * 늦어지는가), 실제로 이 규칙이 깨졌을 때 눈으로는 "뭔가 이상하다"까지만 알 수 있기 때문이다.
 */

/** 한 고리에 놓는 최대 개수. 이보다 많으면 바깥 고리를 하나 더 만든다. */
const ITEMS_PER_RING = 7;
/** 첫 고리 반지름(px). 클릭 지점의 손가락·커서를 피할 만큼은 떨어져야 한다. */
const BASE_RADIUS_PX = 74;
/** 고리마다 더해지는 반지름(px). 칩 높이보다 커야 안쪽 고리와 겹치지 않는다. */
const RING_GAP_PX = 52;
/** 항목마다 늦어지는 시간(ms). 이 값이 "또로록" 느낌을 만든다. */
const STAGGER_MS = 45;
/** 위쪽(-90도)에서 시작해 시계 방향으로 돈다. 첫 항목이 클릭 지점 바로 위에 뜬다. */
const START_ANGLE_DEG = -90;

export interface RadialBurstPosition {
  /** 클릭 지점 기준 상대 좌표(px). */
  xPx: number;
  yPx: number;
  /** 등장 지연(ms). */
  delayMs: number;
}

/**
 * count개를 클릭 지점 주변에 방사형으로 배치한다.
 *
 * 한 고리에 다 넣지 않고 7개마다 바깥 고리로 넘기는 이유 — 같은 반지름에 항목이 많아질수록 사이
 * 각도가 좁아져 칩이 서로 겹친다. 고리를 늘리면 각 고리의 간격이 유지된다.
 * 고리마다 각도를 반 칸(0.5) 어긋나게 시작해, 안쪽 항목과 바깥 항목이 같은 방향에 겹쳐 서지 않게 한다.
 */
export function getRadialBurstPositions(count: number): RadialBurstPosition[] {
  const safeCount = Math.max(0, Math.trunc(count));
  return Array.from({ length: safeCount }, (_, index) => {
    const ring = Math.floor(index / ITEMS_PER_RING);
    const indexInRing = index % ITEMS_PER_RING;
    // 마지막 고리는 남은 개수만큼만 있으므로 그 수로 나눠야 고르게 퍼진다.
    const itemsInThisRing = Math.min(ITEMS_PER_RING, safeCount - ring * ITEMS_PER_RING);
    const step = 360 / itemsInThisRing;
    const angleDeg = START_ANGLE_DEG + step * (indexInRing + ring * 0.5);
    const radius = BASE_RADIUS_PX + RING_GAP_PX * ring;
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      xPx: Math.round(Math.cos(angleRad) * radius),
      yPx: Math.round(Math.sin(angleRad) * radius),
      delayMs: index * STAGGER_MS,
    };
  });
}

export interface BurstBounds {
  width: number;
  height: number;
}

/**
 * 팝업 묶음 전체가 컨테이너 밖으로 나가지 않도록 **원점(클릭 지점)을 안쪽으로 민다.**
 *
 * 항목을 하나씩 잘라 넣지 않고 원점을 옮기는 이유 — 개별 항목을 각자 clamp하면 방사형 대형이
 * 찌그러져 "퍼졌다"는 인상 자체가 사라진다. 대형은 그대로 두고 통째로 이동하면 모양이 유지된다.
 * marginPx는 칩 자체의 폭·높이를 감안한 여유다.
 */
export function clampBurstOrigin(
  origin: { xPx: number; yPx: number },
  positions: readonly RadialBurstPosition[],
  bounds: BurstBounds,
  marginPx = 70,
): { xPx: number; yPx: number } {
  if (positions.length === 0) {
    return origin;
  }
  const minX = Math.min(...positions.map((position) => position.xPx));
  const maxX = Math.max(...positions.map((position) => position.xPx));
  const minY = Math.min(...positions.map((position) => position.yPx));
  const maxY = Math.max(...positions.map((position) => position.yPx));

  const lowerX = -minX + marginPx;
  const upperX = bounds.width - maxX - marginPx;
  const lowerY = -minY + marginPx;
  const upperY = bounds.height - maxY - marginPx;

  // 컨테이너가 대형보다 작으면 좌우 한계가 뒤집힌다. 그때는 가운데에 두는 것이 최선이다.
  const clamp = (value: number, lower: number, upper: number, fallback: number) =>
    lower > upper ? fallback : Math.min(Math.max(value, lower), upper);

  return {
    xPx: clamp(origin.xPx, lowerX, upperX, bounds.width / 2),
    yPx: clamp(origin.yPx, lowerY, upperY, bounds.height / 2),
  };
}
