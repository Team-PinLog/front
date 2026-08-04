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
