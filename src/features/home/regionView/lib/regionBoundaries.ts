import { KOREA_MUNICIPALITY_BOUNDARIES_ENCODED } from '../data/koreaMunicipalityBoundaries';

/**
 * 시·군·구 경계 데이터의 디코딩과 좌표 변환. 근거: Jira S15P11A705-376.
 *
 * 이 파일은 전부 순수 함수다 — 화면이 없어도 값만 보고 검증할 수 있어야 하는 계산들이라
 * (좌표 → 화면 위치, 좌표 → 어느 지역인가) 컴포넌트에서 떼어 놓았다.
 */

/** 인코딩 좌표의 단위. 1e-4도 ≈ 11m. 데이터 생성 스크립트와 같은 값이어야 한다. */
const COORDINATE_SCALE = 10000;
const BASE36_DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

/** [lng, lat] */
export type GeoPoint = readonly [number, number];
export type GeoRing = readonly GeoPoint[];

export interface RegionBoundary {
  /** KOSTAT 5자리 시군구 코드. 앞 2자리가 시·도다. */
  code: string;
  /** 시군구명(예: 종로구). 전국에 같은 이름이 여럿 있어 **단독으로는 식별자가 아니다.** */
  name: string;
  /** 지역 하나가 본토 + 섬처럼 떨어진 조각을 가질 수 있어 링 배열이다. */
  rings: GeoRing[];
  /** [minLng, minLat, maxLng, maxLat]. 점-다각형 판정 전 빠르게 걸러내는 데 쓴다. */
  bbox: readonly [number, number, number, number];
}

function fromBase36(token: string): number {
  let value = 0;
  for (const char of token) {
    value = value * 36 + BASE36_DIGITS.indexOf(char);
  }
  return value;
}

/** 부호를 최하위 비트로 옮겨 둔 정수를 되돌린다(작은 음수도 짧게 적히도록 인코딩할 때 쓴 방식). */
function unzigzag(value: number): number {
  return value % 2 === 0 ? value / 2 : -(value + 1) / 2;
}

/**
 * 인코딩 문자열 → 지역 목록. 실패한 지역은 조용히 건너뛴다 —
 * 데이터 한 조각이 깨졌다고 지도 전체를 못 그릴 이유가 없다(개요용 배경 그래픽이다).
 */
export function decodeRegionBoundaries(encoded: string): RegionBoundary[] {
  const regions: RegionBoundary[] = [];

  for (const regionText of encoded.split('|')) {
    const [code, name, ringsText] = regionText.split('~');
    if (!code || !name || !ringsText) {
      continue;
    }

    const rings: GeoRing[] = [];
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    for (const ringText of ringsText.split(';')) {
      const tokens = ringText.split(',');
      const ring: GeoPoint[] = [];
      let x = 0;
      let y = 0;
      for (let i = 0; i + 1 < tokens.length; i += 2) {
        x += unzigzag(fromBase36(tokens[i]!));
        y += unzigzag(fromBase36(tokens[i + 1]!));
        const lng = x / COORDINATE_SCALE;
        const lat = y / COORDINATE_SCALE;
        ring.push([lng, lat]);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
      if (ring.length >= 4) {
        rings.push(ring);
      }
    }

    if (rings.length > 0) {
      regions.push({ code, name, rings, bbox: [minLng, minLat, maxLng, maxLat] });
    }
  }

  return regions;
}

/**
 * 디코딩 결과. 모듈 로드 시 한 번만 돈다(9,899점, 수 ms) — 지역 뷰는 지연 로드되는 청크라
 * 토글을 켜기 전에는 이 파일 자체가 내려오지 않는다.
 */
export const REGION_BOUNDARIES: RegionBoundary[] = decodeRegionBoundaries(
  KOREA_MUNICIPALITY_BOUNDARIES_ENCODED,
);

/**
 * KOSTAT 코드 앞 2자리 → 시·도 이름. 시군구명은 전국에 중복이 많아(중구·남구·서구…) 화면 라벨에
 * 반드시 시·도를 붙여야 어디인지 알 수 있다.
 */
const SIDO_NAME_BY_PREFIX: Record<string, string> = {
  '11': '서울',
  '21': '부산',
  '22': '대구',
  '23': '인천',
  '24': '광주',
  '25': '대전',
  '26': '울산',
  '29': '세종',
  '31': '경기',
  '32': '강원',
  '33': '충북',
  '34': '충남',
  '35': '전북',
  '36': '전남',
  '37': '경북',
  '38': '경남',
  '39': '제주',
};

export function getSidoName(code: string): string {
  return SIDO_NAME_BY_PREFIX[code.slice(0, 2)] ?? '';
}

/** 화면 라벨. 예: "서울 종로구". 시·도를 모르면 시군구명만 쓴다. */
export function getRegionLabel(region: Pick<RegionBoundary, 'code' | 'name'>): string {
  const sido = getSidoName(region.code);
  return sido ? `${sido} ${region.name}` : region.name;
}

// --- 투영 -------------------------------------------------------------------------------------

export interface GeoBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export function getGeoBounds(regions: readonly RegionBoundary[]): GeoBounds {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const region of regions) {
    minLng = Math.min(minLng, region.bbox[0]);
    minLat = Math.min(minLat, region.bbox[1]);
    maxLng = Math.max(maxLng, region.bbox[2]);
    maxLat = Math.max(maxLat, region.bbox[3]);
  }
  return { minLng, minLat, maxLng, maxLat };
}

/**
 * 제주 지역 코드 접두. 377 후속에서 제주를 본토와 분리해 **우하단 인셋 박스**로 옮기는 데 쓴다.
 * 한국 지도의 관례적 처리이며, 사용자가 허용한 방식이다.
 */
export const JEJU_CODE_PREFIX = '39';

export function isJejuRegion(code: string): boolean {
  return code.startsWith(JEJU_CODE_PREFIX);
}

export interface ProjectionSize {
  width: number;
  height: number;
}

/**
 * 등장방형(equirectangular) 투영. 전국을 한 화면에 담는 개요 지도라 정밀한 도법이 필요 없다.
 *
 * 다만 경도 1도의 실제 거리는 위도가 올라갈수록 짧아지므로, 그대로 그리면 남한이 가로로 늘어난다.
 * 화면 폭에 cos(중위도)를 곱해 그 왜곡만 보정한다(약 0.79배). 이게 없으면 지도가 눈에 띄게 뚱뚱하다.
 */
export function getProjectionSize(bounds: GeoBounds, height: number): ProjectionSize {
  const midLat = ((bounds.minLat + bounds.maxLat) / 2) * (Math.PI / 180);
  const lngSpan = (bounds.maxLng - bounds.minLng) * Math.cos(midLat);
  const latSpan = bounds.maxLat - bounds.minLat;
  return { width: (height * lngSpan) / latSpan, height };
}

/**
 * 폭을 먼저 정하고 높이를 따라가게 하는 투영 크기. 인셋 박스처럼 "가로 자리는 이만큼"이 먼저
 * 정해지는 경우에 쓴다(본토는 반대로 높이가 먼저다).
 */
export function getProjectionSizeByWidth(bounds: GeoBounds, width: number): ProjectionSize {
  const midLat = ((bounds.minLat + bounds.maxLat) / 2) * (Math.PI / 180);
  const lngSpan = (bounds.maxLng - bounds.minLng) * Math.cos(midLat);
  const latSpan = bounds.maxLat - bounds.minLat;
  return { width, height: (width * latSpan) / lngSpan };
}

/** 경위도 → SVG 좌표. y는 위가 북쪽이 되도록 뒤집는다. */
export function projectPoint(
  point: GeoPoint,
  bounds: GeoBounds,
  size: ProjectionSize,
): readonly [number, number] {
  const [lng, lat] = point;
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * size.width;
  const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * size.height;
  return [x, y];
}

/** 지역 하나를 SVG path의 d 속성으로. 링마다 M…Z를 이어 붙인다(구멍이 아니라 떨어진 조각들이다). */
export function getRegionPathData(
  region: RegionBoundary,
  bounds: GeoBounds,
  size: ProjectionSize,
): string {
  return region.rings
    .map((ring) => {
      const commands = ring.map((point, index) => {
        const [x, y] = projectPoint(point, bounds, size);
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      });
      return `${commands.join('')}Z`;
    })
    .join('');
}

/**
 * 지역의 대표 지점(bbox 중심).
 *
 * 377: 시·군·구를 전국 축척으로 그리면 도심 자치구는 **화면에서 몇 px밖에 되지 않는다**(실측:
 * 서울 중구 약 6x3px). 그 도형 자체를 클릭 대상으로 두면 사실상 누를 수 없어, 이 지점에 눈에 보이지
 * 않는 넉넉한 클릭 원을 따로 놓는다.
 *
 * 폴리곤 무게중심이 아니라 bbox 중심인 이유 — 여기서 필요한 것은 "클릭 타깃을 놓을 대략의 자리"이지
 * 정확한 무게중심이 아니다. 정확한 무게중심은 계산이 더 무겁고, 오목한 지역에서는 어차피 도형 밖으로
 * 나갈 수 있어 더 낫다는 보장도 없다.
 */
export function getRegionCenter(region: RegionBoundary): GeoPoint {
  return [(region.bbox[0] + region.bbox[2]) / 2, (region.bbox[1] + region.bbox[3]) / 2];
}

// --- 점-다각형 판정 ----------------------------------------------------------------------------

/**
 * 광선 교차법. 점에서 오른쪽으로 반직선을 쏴 변과 몇 번 만나는지 세고, 홀수면 안이다.
 * 경계선에 정확히 걸친 점은 어느 쪽으로 판정될지 보장하지 않는다 — 지역 개수를 세는 용도라
 * 경계 위 한 점의 소속이 흔들려도 화면에 의미 있는 차이를 만들지 않는다.
 */
export function isPointInRing(point: GeoPoint, ring: GeoRing): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function isInsideBbox(point: GeoPoint, bbox: RegionBoundary['bbox']): boolean {
  return point[0] >= bbox[0] && point[0] <= bbox[2] && point[1] >= bbox[1] && point[1] <= bbox[3];
}

/**
 * 좌표가 속한 시군구 코드. 어디에도 안 들어가면 null(바다·북한·해외, 또는 단순화로 잘려 나간
 * 작은 섬 위의 좌표).
 *
 * 주소 문자열 파싱 대신 좌표로 판정하는 이유 — 지도 마커 응답(`GET /records/map`)에는 주소가 없다.
 * 주소를 얻으려면 백엔드 협의(응답 확장)나 Record별 상세 조회가 필요한데, 경계 데이터를 이미
 * 번들해 두었으므로 좌표만으로 지금 데이터에서 바로 성립한다. 덤으로 "서울 중구"와 "부산 중구"
 * 같은 동명 지역을 문자열 규칙 없이 정확히 가른다.
 */
export function findRegionCodeForPoint(
  regions: readonly RegionBoundary[],
  point: GeoPoint,
): string | null {
  for (const region of regions) {
    if (!isInsideBbox(point, region.bbox)) {
      continue;
    }
    for (const ring of region.rings) {
      if (isPointInRing(point, ring)) {
        return region.code;
      }
    }
  }
  return null;
}
