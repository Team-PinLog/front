/**
 * 홈 지도가 벗어날 수 없는 범위(최대 축소 레벨 · 이동 가능 영역)와, 그 범위를 다루는 순수 함수들.
 * 카카오 SDK 객체를 직접 다루지 않고 숫자만 받는다 — 테스트가 SDK 없이 돈다.
 */

/**
 * 허용하는 가장 축소된 카카오맵 레벨. 카카오맵은 숫자가 클수록 축소된 상태다(레벨 1이 최대 확대).
 *
 * 실측 근거 — 실제 홈 지도와 같은 1200x900 영역에 지도를 띄우고 레벨별 getBounds()를 읽었다:
 *   level 11 → 위도폭 2.05°(약 227km), 35.46~37.51N  — 남한도 다 안 들어온다
 *   level 12 → 위도폭 4.09°(약 454km), 34.40~38.49N  — 제주(33.1N)와 북부가 잘린다
 *   level 13 → 위도폭 8.14°(약 904km), 32.22~40.36N  — 한반도 전체가 여유까지 들어온다
 *   level 14 → 위도폭 15.9°(약 1769km)               — 중국·일본까지 들어와 의미가 없다
 * "한반도가 잘리지 않는 가장 축소된 레벨"이 13이라 이 값을 상한으로 쓴다. 지도 영역이 이보다
 * 작은 화면에서는 같은 레벨이 덮는 실거리도 줄어들어 한반도가 일부 잘릴 수 있는데, 고정 레벨
 * 하나로 모든 뷰포트를 보장할 수는 없어 기준 해상도(xl) 기준으로 정했다.
 *
 * 이 값은 kakao.maps.Map 생성 옵션 maxLevel로 넘긴다 — SDK가 줌 버튼·휠·트랙패드 핀치·setLevel·
 * setBounds 등 모든 경로에 직접 강제하므로 우리 쪽 이벤트 clamp가 따로 필요 없다(실측 확인).
 */
export const MAX_ZOOM_OUT_LEVEL = 13;

export interface MapPoint {
  lat: number;
  lng: number;
}

/** 위경도 사각형. 지도 뷰포트(카카오 getBounds())와 이동 허용 범위 양쪽에 함께 쓴다. */
export interface LatLngBox {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

/**
 * 지도 중심이 벗어날 수 없는 영역. 카카오는 국내 위주로만 타일을 제공해서, 여기서 더 나가면
 * 화면이 백지가 된다. 저장되는 장소도 비즈니스 규칙상 국내로 한정된다.
 * 남한 전체를 여유 있게 감싸는 값이다 — 최남단 마라도 33.06N, 최동단 독도 131.87E, 최서단
 * 백령도 124.6E가 모두 안쪽에 들어온다. 중심이 경계에 붙어도 그 주변 기록은 화면에 남는다.
 * 근거: Jira S15P11A705-307 후속 요구사항.
 */
export const KOREA_PAN_BOUNDS: LatLngBox = {
  swLat: 33,
  swLng: 124,
  neLat: 39,
  neLng: 132,
};

/**
 * point를 box 안으로 끌어당긴 좌표. 이미 안에 있으면 null을 돌려준다 —
 * 호출부가 "되돌릴 필요가 없다"를 별도 비교 없이 판단할 수 있게 하기 위해서다.
 */
export function clampPointToBox(point: MapPoint, box: LatLngBox): MapPoint | null {
  const lat = Math.min(Math.max(point.lat, box.swLat), box.neLat);
  const lng = Math.min(Math.max(point.lng, box.swLng), box.neLng);
  if (lat === point.lat && lng === point.lng) {
    return null;
  }
  return { lat, lng };
}

/** 경계선에 정확히 걸친 점은 "보인다"로 친다(화면 밖 개수를 부풀리지 않기 위해). */
function isInsideBox(point: MapPoint, box: LatLngBox): boolean {
  return (
    point.lat >= box.swLat &&
    point.lat <= box.neLat &&
    point.lng >= box.swLng &&
    point.lng <= box.neLng
  );
}

/**
 * 지금 화면 밖에 있는 점의 개수. 배지("화면 밖 장소 N개") 노출 여부와 문구에 쓴다.
 * 날짜변경선을 넘는 뷰포트(swLng > neLng)는 다루지 않는다 — 상한 레벨 13이 덮는 경도폭이
 * 약 13.8°이고 이동 범위도 국내로 묶여 있어 실제로 발생할 수 없다.
 */
export function countPointsOutsideViewport(
  points: readonly MapPoint[],
  viewport: LatLngBox,
): number {
  return points.reduce((count, point) => (isInsideBox(point, viewport) ? count : count + 1), 0);
}

/**
 * 지도 컨테이너 위에 다른 레이어가 얹혀 상단 일부가 보이지 않는 상황을 나타낸다.
 * 홈은 히어로 오버레이가 배경 지도의 위쪽을 완전히 덮는다(HomePage). 오버레이가 없는 화면은
 * topObstructionPx를 0으로 둬 기존 동작을 그대로 유지한다.
 */
export interface MapViewInsets {
  /** 컨테이너 상단에서 다른 레이어에 가려 보이지 않는 높이(px). */
  topObstructionPx: number;
  /** 지도 컨테이너 전체 높이(px). 픽셀 오프셋을 위도로 환산할 때 기준이 된다. */
  containerHeightPx: number;
  /**
   * 377 후속: 컨테이너 **오른쪽 끝에서 페이드로 지워지는 폭**(px). 그 띠는 그려지긴 하지만 알파가
   * 떨어져 사용자에게는 보이지 않으므로, 상단 가림과 똑같이 "없는 영역"으로 쳐야 한다.
   *
   * 이걸 반영하지 않아 생긴 증상이 "지도 뷰에서 제주가 우측 페이드에 가려진다"였다 — fitBounds는
   * 컨테이너 전체에 마커를 담았는데 오른쪽 끝 128px은 눈에 보이지 않으니, 그 안에 들어간 마커는
   * 사라진 것처럼 보였다.
   */
  rightObstructionPx?: number;
  /** 지도 컨테이너 전체 폭(px). 픽셀 오프셋을 경도로 환산할 때 기준이 된다. */
  containerWidthPx?: number;
}

/** 계산에 쓸 수 있는 오른쪽 가림 폭. 컨테이너를 벗어나거나 음수인 값은 무시한다. */
function usableRightObstructionPx(insets: MapViewInsets): number {
  const { rightObstructionPx = 0, containerWidthPx = 0 } = insets;
  if (!(rightObstructionPx > 0) || !(containerWidthPx > 0)) {
    return 0;
  }
  return Math.min(rightObstructionPx, containerWidthPx);
}

/** 계산에 쓸 수 있는 가림 높이. 컨테이너를 벗어나거나 음수인 값은 무시한다. */
function usableObstructionPx(insets: MapViewInsets): number {
  const { topObstructionPx, containerHeightPx } = insets;
  if (!(topObstructionPx > 0) || !(containerHeightPx > 0)) {
    return 0;
  }
  return Math.min(topObstructionPx, containerHeightPx);
}

/**
 * 최초 진입 fitBounds의 기본 여유(px)를 정하는 값들.
 *
 * ⚠️ **조정 가능한 값이다.** 사용자 피드백("마커 핀의 fitBounds가 너무 타이트하다 — 줌을 조금 더
 * 풀어 달라")으로 완화한 자리다. 더 넓게 보고 싶으면 RATIO를, 작은 화면에서의 최소 여유를 바꾸려면
 * MIN을 조정한다.
 *
 * 고정 px 하나(이전 48)로 두지 않는 이유 — 같은 48px이라도 1440x900 화면에서는 거의 여백이 없고
 * 좁은 화면에서는 지도의 상당 부분을 차지한다. 마커가 가장자리에 붙어 보이는지는 **화면 크기 대비**
 * 여백이 결정하므로 짧은 변의 비율로 잡고, 아주 작은/큰 화면을 위해 상·하한을 둔다.
 */
export const FIT_BOUNDS_PADDING_RATIO = 0.14;
export const FIT_BOUNDS_PADDING_MIN_PX = 48;
export const FIT_BOUNDS_PADDING_MAX_PX = 180;

/**
 * 컨테이너 크기에 맞춘 fitBounds 기본 여유(px).
 *
 * 짧은 변을 기준으로 삼는 이유: 긴 변을 쓰면 세로로 긴 화면(모바일)에서 좌우 여백이 과해져 지도가
 * 실제보다 훨씬 축소된다. 짧은 변 기준이면 어느 방향에서도 "가장자리에서 이만큼 떨어져 보인다"가
 * 일정하다.
 *
 * 크기를 아직 모르면(첫 렌더 등) 최소값으로 물러난다 — 0을 쓰면 마커가 화면 끝에 딱 붙는다.
 */
export function getFitBoundsBasePaddingPx(containerWidthPx: number, containerHeightPx: number) {
  const shorterSide = Math.min(containerWidthPx, containerHeightPx);
  if (!(shorterSide > 0)) {
    return FIT_BOUNDS_PADDING_MIN_PX;
  }
  return Math.min(
    FIT_BOUNDS_PADDING_MAX_PX,
    Math.max(FIT_BOUNDS_PADDING_MIN_PX, Math.round(shorterSide * FIT_BOUNDS_PADDING_RATIO)),
  );
}

/** setBounds에 넘길 사방 여유(px). */
export interface MapFitPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * fitBounds 여유. 상단만 가려진 높이만큼 키워, 담긴 마커가 오버레이 뒤로 숨지 않게 한다.
 * 나머지 세 방향은 기존 값 그대로다.
 */
export function getFitPadding(basePaddingPx: number, insets: MapViewInsets): MapFitPadding {
  return {
    top: basePaddingPx + usableObstructionPx(insets),
    // 377 후속: 오른쪽 페이드 띠도 상단 오버레이와 같은 취급이다 — 그만큼 여유를 더 줘야 마커가
    // "보이는 영역" 안에 담긴다. 이게 없으면 동쪽 끝 마커(예: 제주)가 페이드 속으로 들어간다.
    right: basePaddingPx + usableRightObstructionPx(insets),
    bottom: basePaddingPx,
    left: basePaddingPx,
  };
}

/**
 * 뷰포트에서 가려진 상단을 잘라낸, 사용자가 실제로 보는 영역.
 * "화면 밖 장소 N개" 배지가 세는 대상이 눈에 보이는 것과 일치하려면 이 영역을 기준으로 세야 한다.
 *
 * 픽셀→위도 환산은 뷰포트 전체의 평균 비율(위도폭/높이)을 쓰는 선형 근사다. 웹 메르카토르에서
 * 위도는 픽셀에 완전히 비례하지는 않지만, 오차는 위도폭이 가장 넓은 최대 축소(레벨 13, 약 8°)
 * 에서도 수 km 수준이고 실사용 배율에서는 무시할 수 있다. 정확한 역투영(Projection)을 쓰지 않는
 * 이유는 SDK 객체 없이 테스트할 수 있는 순수 함수로 두기 위해서다.
 */
export function shrinkViewportFromTop(viewport: LatLngBox, insets: MapViewInsets): LatLngBox {
  const topObstruction = usableObstructionPx(insets);
  const rightObstruction = usableRightObstructionPx(insets);
  if (topObstruction === 0 && rightObstruction === 0) {
    return viewport;
  }
  let result = viewport;
  if (topObstruction > 0) {
    const latPerPx = (viewport.neLat - viewport.swLat) / insets.containerHeightPx;
    result = { ...result, neLat: result.neLat - latPerPx * topObstruction };
  }
  if (rightObstruction > 0) {
    // 오른쪽이 가려지면 **동쪽 경계**가 그만큼 안으로 들어온다. "화면 밖 N개" 배지가 세는 대상이
    // 눈에 보이는 것과 일치하려면 이 축소가 필요하다.
    const lngPerPx = (viewport.neLng - viewport.swLng) / (insets.containerWidthPx ?? 0);
    result = { ...result, neLng: result.neLng - lngPerPx * rightObstruction };
  }
  return result;
}

/**
 * 어떤 지점을 "가려지지 않은 영역의 세로 한가운데"에 놓으려면 지도 중심을 그 지점보다 얼마나
 * 북쪽에 둬야 하는지(도 단위).
 *
 * 가시 영역은 y = obstruction ~ H이므로 그 중심은 화면상 (H + obstruction) / 2다. 지도 중심은
 * 항상 H / 2에 그려지니 목표 지점은 지도 중심보다 obstruction / 2 만큼 아래(= 남쪽)에 있어야
 * 하고, 뒤집으면 지도 중심이 목표 지점보다 그만큼 북쪽이어야 한다. 이 보정을 빼면 핀이 컨테이너
 * 중앙에 놓여 오버레이 높이의 절반만큼 위로 밀려 보인다.
 */
/**
 * 377 후속: 오른쪽이 가려졌을 때 지도 중심을 **서쪽으로** 얼마나 옮겨야 목표 지점이 보이는 영역의
 * 가로 한가운데에 오는지(도 단위). 위 위도 보정과 같은 논리의 가로판이다.
 */
export function getVisibleCenterLngOffset(viewport: LatLngBox, insets: MapViewInsets): number {
  const obstruction = usableRightObstructionPx(insets);
  if (obstruction === 0) {
    return 0;
  }
  const lngPerPx = (viewport.neLng - viewport.swLng) / (insets.containerWidthPx ?? 0);
  return -(lngPerPx * obstruction) / 2;
}

export function getVisibleCenterLatOffset(viewport: LatLngBox, insets: MapViewInsets): number {
  const obstruction = usableObstructionPx(insets);
  if (obstruction === 0) {
    return 0;
  }
  const latPerPx = (viewport.neLat - viewport.swLat) / insets.containerHeightPx;
  return (latPerPx * obstruction) / 2;
}

function medianOf(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/**
 * 상한에 걸려 모든 기록을 담지 못할 때 지도를 다시 맞출 중심. 위도·경도의 중앙값을 각각 취한다.
 *
 * fitBounds가 잡아준 중심(= 전체 bounds의 한가운데)을 그대로 두면, 서울 기록 4건 + 아주 먼 기록
 * 1건 같은 경우 중심이 두 지점의 중간(기록이 하나도 없는 지역)에 남는다. 평균 역시 멀리 떨어진
 * 한 건에 끌려가므로 못 쓴다. 중앙값은 이런 이상치에 흔들리지 않아 기록이 몰려 있는 쪽으로
 * 중심이 잡힌다. 위도와 경도를 따로 취하는 방식이라 기록이 여러 덩어리로 흩어진 경우 중심이 그
 * 사이 빈 곳에 놓일 수 있는데, 그 경우에도 배지를 눌러 전체 보기로 되돌릴 수 있어 막다른 상태가
 * 되지 않는다. points가 비어 있으면 null을 돌려준다 — 호출부는 이때 재중심 없이 넘어간다.
 */
export function getMedianPoint(points: readonly MapPoint[]): MapPoint | null {
  if (points.length === 0) {
    return null;
  }
  return {
    lat: medianOf(points.map((point) => point.lat)),
    lng: medianOf(points.map((point) => point.lng)),
  };
}
