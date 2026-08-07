import { describe, expect, it } from 'vitest';
import type { RecordMapItem } from '@/features/map/api/getRecordMapMarkers';
import {
  decodeRegionBoundaries,
  findRegionCodeForPoint,
  getGeoBounds,
  getProjectionSize,
  getRegionLabel,
  getRegionPathData,
  getSidoName,
  isPointInRing,
  projectPoint,
  REGION_BOUNDARIES,
  type GeoRing,
  type RegionBoundary,
} from './regionBoundaries';
import {
  getRegionFillOpacity,
  getRegionShadeLevel,
  groupRecordsByRegion,
  REGION_SHADE_LEVELS,
} from './regionRecords';

// 한 변이 1도인 정사각형 지역 둘. 좌표 규칙을 눈으로 따라갈 수 있는 최소 fixture다.
const SQUARE_A: RegionBoundary = {
  code: '11010',
  name: '가구',
  rings: [
    [
      [126, 37],
      [127, 37],
      [127, 38],
      [126, 38],
      [126, 37],
    ],
  ],
  bbox: [126, 37, 127, 38],
};
const SQUARE_B: RegionBoundary = {
  code: '21010',
  name: '나구',
  rings: [
    [
      [128, 35],
      [129, 35],
      [129, 36],
      [128, 36],
      [128, 35],
    ],
  ],
  bbox: [128, 35, 129, 36],
};

function makeItem(recordId: number, lng: number, lat: number): RecordMapItem {
  return { recordId, placeId: recordId * 10, name: `장소${recordId}`, lat, lng };
}

describe('decodeRegionBoundaries', () => {
  it('번들된 데이터에서 250개 시군구를 모두 복원한다', () => {
    // 250은 KOSTAT 2018 시군구 수다. 줄어들면 단순화 과정에서 지역이 통째로 사라진 것이다.
    expect(REGION_BOUNDARIES).toHaveLength(250);
  });

  it('모든 지역이 링과 유효한 bbox를 갖는다', () => {
    REGION_BOUNDARIES.forEach((region) => {
      expect(region.rings.length).toBeGreaterThan(0);
      expect(region.bbox[0]).toBeLessThan(region.bbox[2]);
      expect(region.bbox[1]).toBeLessThan(region.bbox[3]);
    });
  });

  it('좌표가 남한 범위 안에 있다 — 델타 누적이 어긋나면 여기서 드러난다', () => {
    const bounds = getGeoBounds(REGION_BOUNDARIES);
    expect(bounds.minLng).toBeGreaterThan(124);
    expect(bounds.maxLng).toBeLessThan(132);
    expect(bounds.minLat).toBeGreaterThan(32);
    expect(bounds.maxLat).toBeLessThan(39);
  });

  it('델타 인코딩을 정확히 되돌린다', () => {
    // 126.0000, 37.0000에서 시작해 (+0.0002, -0.0001)씩 움직이는 링을 인코더와 같은 규칙으로
    // 적은 문자열이다. 첫 점만 절대값(1e-4도 단위 정수를 zigzag→base36), 이후는 델타다.
    const decoded = decodeRegionBoundaries('99999~테스트구~1i0g0,fuzk,4,1,4,1,2,2');
    expect(decoded).toHaveLength(1);
    expect(decoded[0]!.rings[0]).toEqual([
      [126, 37],
      [126.0002, 36.9999],
      [126.0004, 36.9998],
      [126.0005, 36.9999],
    ]);
  });

  it('깨진 조각은 건너뛰고 나머지를 살린다', () => {
    const decoded = decodeRegionBoundaries(`쓰레기|99999~테스트구~1i0g0,fuzk,4,1,4,1,2,2`);
    expect(decoded).toHaveLength(1);
  });
});

describe('시·도 라벨', () => {
  it('코드 앞 2자리로 시·도를 찾는다', () => {
    expect(getSidoName('11010')).toBe('서울');
    expect(getSidoName('39010')).toBe('제주');
  });

  it('동명 지역을 시·도로 구분한다 — 라벨이 곧 사용자가 읽는 유일한 단서다', () => {
    expect(getRegionLabel({ code: '11020', name: '중구' })).toBe('서울 중구');
    expect(getRegionLabel({ code: '21030', name: '중구' })).toBe('부산 중구');
  });

  it('실제 데이터에 이름이 중복되는 지역이 있다', () => {
    const names = REGION_BOUNDARIES.map((region) => region.name);
    expect(names.length).toBeGreaterThan(new Set(names).size);
  });

  it('모르는 코드면 시군구명만 쓴다', () => {
    expect(getRegionLabel({ code: '99999', name: '테스트구' })).toBe('테스트구');
  });
});

describe('투영', () => {
  const bounds = { minLng: 126, minLat: 33, maxLng: 130, maxLat: 39 };

  it('경도 왜곡을 보정해 가로가 늘어나지 않는다', () => {
    const size = getProjectionSize(bounds, 600);
    // 보정이 없으면 600 * (4/6) = 400. cos(36도) ≈ 0.809를 곱한 만큼 좁아야 한다.
    expect(size.width).toBeLessThan(400);
    expect(size.width).toBeCloseTo(400 * Math.cos((36 * Math.PI) / 180), 1);
  });

  it('북쪽이 위로 가도록 y를 뒤집는다', () => {
    const size = { width: 100, height: 600 };
    const north = projectPoint([128, 39], bounds, size);
    const south = projectPoint([128, 33], bounds, size);
    expect(north[1]).toBe(0);
    expect(south[1]).toBe(600);
  });

  it('지역 path는 링마다 M으로 시작해 Z로 닫는다', () => {
    const path = getRegionPathData(SQUARE_A, bounds, { width: 100, height: 600 });
    expect(path.startsWith('M')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
    expect(path.match(/M/g)).toHaveLength(1);
  });

  it('떨어진 조각이 여러 개면 M도 그 수만큼이다 — 섬이 본토와 선으로 이어지면 안 된다', () => {
    const twoRings: RegionBoundary = { ...SQUARE_A, rings: [...SQUARE_A.rings, ...SQUARE_B.rings] };
    const path = getRegionPathData(twoRings, bounds, { width: 100, height: 600 });
    expect(path.match(/M/g)).toHaveLength(2);
  });
});

describe('isPointInRing', () => {
  const ring: GeoRing = SQUARE_A.rings[0]!;

  it('안쪽 점을 안이라고 한다', () => {
    expect(isPointInRing([126.5, 37.5], ring)).toBe(true);
  });

  it('바깥 점을 밖이라고 한다', () => {
    expect(isPointInRing([125.5, 37.5], ring)).toBe(false);
    expect(isPointInRing([126.5, 39], ring)).toBe(false);
  });

  it('오목한 다각형에서도 파인 부분은 밖이다', () => {
    // ㄷ 모양. 가운데 홈에 있는 점이 안으로 잡히면 광선 교차 계산이 틀린 것이다.
    const concave: GeoRing = [
      [0, 0],
      [3, 0],
      [3, 1],
      [1, 1],
      [1, 2],
      [3, 2],
      [3, 3],
      [0, 3],
      [0, 0],
    ];
    expect(isPointInRing([2, 1.5], concave)).toBe(false);
    expect(isPointInRing([0.5, 1.5], concave)).toBe(true);
  });
});

describe('findRegionCodeForPoint', () => {
  const regions = [SQUARE_A, SQUARE_B];

  it('좌표가 속한 지역 코드를 준다', () => {
    expect(findRegionCodeForPoint(regions, [126.5, 37.5])).toBe('11010');
    expect(findRegionCodeForPoint(regions, [128.5, 35.5])).toBe('21010');
  });

  it('어디에도 속하지 않으면 null이다 — 바다·해외 좌표를 억지로 배정하지 않는다', () => {
    expect(findRegionCodeForPoint(regions, [131, 37])).toBeNull();
  });

  it('실제 데이터에서 서울시청 좌표가 서울 지역으로 잡힌다', () => {
    const code = findRegionCodeForPoint(REGION_BOUNDARIES, [126.978, 37.5665]);
    expect(code).not.toBeNull();
    expect(getSidoName(code!)).toBe('서울');
  });

  it('실제 데이터에서 부산 시청 좌표가 부산으로 잡힌다 — 동명 구를 좌표로 정확히 가른다', () => {
    const code = findRegionCodeForPoint(REGION_BOUNDARIES, [129.0756, 35.1796]);
    expect(code).not.toBeNull();
    expect(getSidoName(code!)).toBe('부산');
  });

  it('동해 한가운데는 어느 지역도 아니다', () => {
    expect(findRegionCodeForPoint(REGION_BOUNDARIES, [131.5, 37])).toBeNull();
  });
});

describe('groupRecordsByRegion', () => {
  const regions = [SQUARE_A, SQUARE_B];

  it('지역별로 묶고 최대 개수를 센다', () => {
    const groups = groupRecordsByRegion(regions, [
      makeItem(1, 126.5, 37.5),
      makeItem(2, 126.6, 37.6),
      makeItem(3, 128.5, 35.5),
    ]);
    expect(groups.byCode.get('11010')).toHaveLength(2);
    expect(groups.byCode.get('21010')).toHaveLength(1);
    expect(groups.maxCount).toBe(2);
  });

  it('배정되지 않은 기록을 조용히 버리지 않고 센다', () => {
    const groups = groupRecordsByRegion(regions, [makeItem(1, 126.5, 37.5), makeItem(2, 131, 37)]);
    expect(groups.unassignedCount).toBe(1);
  });

  it('기록이 없는 지역은 키 자체가 없다 — 화면에서 무채색으로 남는 근거다', () => {
    const groups = groupRecordsByRegion(regions, [makeItem(1, 126.5, 37.5)]);
    expect(groups.byCode.has('21010')).toBe(false);
  });

  it('기록이 하나도 없어도 계산이 성립한다', () => {
    const groups = groupRecordsByRegion(regions, []);
    expect(groups.maxCount).toBe(0);
    expect(groups.byCode.size).toBe(0);
  });
});

describe('농담 단계', () => {
  it('기록이 없으면 0단계다', () => {
    expect(getRegionShadeLevel(0, 10)).toBe(0);
    expect(getRegionFillOpacity(0)).toBe(0);
  });

  it('최대치 대비 비율로 나눈다 — 기록이 적은 사용자도 단계 차이를 본다', () => {
    expect(getRegionShadeLevel(1, 4)).toBe(1);
    expect(getRegionShadeLevel(2, 4)).toBe(2);
    expect(getRegionShadeLevel(4, 4)).toBe(REGION_SHADE_LEVELS);
    // 기록이 300개인 사용자도 같은 그림을 본다.
    expect(getRegionShadeLevel(75, 300)).toBe(1);
    expect(getRegionShadeLevel(300, 300)).toBe(REGION_SHADE_LEVELS);
  });

  it('모두 1개뿐이면 전부 최고 단계다 — 옅은 색 하나로만 보이지 않게 한다', () => {
    expect(getRegionShadeLevel(1, 1)).toBe(REGION_SHADE_LEVELS);
  });

  it('단계가 올라갈수록 진해지고 1을 넘지 않는다', () => {
    const opacities = [1, 2, 3, 4].map(getRegionFillOpacity);
    for (let i = 1; i < opacities.length; i += 1) {
      expect(opacities[i]!).toBeGreaterThan(opacities[i - 1]!);
    }
    expect(opacities.at(-1)!).toBeLessThanOrEqual(1);
  });

  it('범위를 벗어난 단계를 넣어도 값이 깨지지 않는다', () => {
    expect(getRegionFillOpacity(-3)).toBe(0);
    expect(getRegionFillOpacity(99)).toBe(getRegionFillOpacity(REGION_SHADE_LEVELS));
  });
});
