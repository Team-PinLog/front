import { describe, expect, it } from 'vitest';
import {
  clampPointToBox,
  countPointsOutsideViewport,
  getMedianPoint,
  KOREA_PAN_BOUNDS,
  type LatLngBox,
} from './recordMapViewportLimits';

describe('clampPointToBox', () => {
  it('범위 안의 점은 null을 돌려준다(되돌릴 필요 없음)', () => {
    expect(clampPointToBox({ lat: 37.5665, lng: 126.978 }, KOREA_PAN_BOUNDS)).toBeNull();
  });

  it('경계선 위의 점도 범위 안으로 친다', () => {
    expect(clampPointToBox({ lat: 33, lng: 124 }, KOREA_PAN_BOUNDS)).toBeNull();
    expect(clampPointToBox({ lat: 39, lng: 132 }, KOREA_PAN_BOUNDS)).toBeNull();
  });

  it('벗어난 축만 경계로 끌어당기고 나머지는 그대로 둔다', () => {
    // 위도만 북쪽으로 벗어난 경우.
    expect(clampPointToBox({ lat: 45, lng: 127 }, KOREA_PAN_BOUNDS)).toEqual({ lat: 39, lng: 127 });
    // 경도만 서쪽으로 벗어난 경우.
    expect(clampPointToBox({ lat: 36, lng: 100 }, KOREA_PAN_BOUNDS)).toEqual({ lat: 36, lng: 124 });
  });

  it('두 축 모두 벗어나면 가장 가까운 모서리로 되돌린다', () => {
    expect(clampPointToBox({ lat: 10, lng: 200 }, KOREA_PAN_BOUNDS)).toEqual({ lat: 33, lng: 132 });
  });

  it('setBounds가 상한에 걸렸을 때 튀는 비정상 위도(실측 140N)도 경계로 되돌린다', () => {
    expect(clampPointToBox({ lat: 140.21, lng: 134.09 }, KOREA_PAN_BOUNDS)).toEqual({
      lat: 39,
      lng: 132,
    });
  });

  it('국내 최남단·최동단·최서단은 모두 범위 안이다', () => {
    // 마라도 / 독도 / 백령도.
    expect(clampPointToBox({ lat: 33.06, lng: 126.27 }, KOREA_PAN_BOUNDS)).toBeNull();
    expect(clampPointToBox({ lat: 37.24, lng: 131.87 }, KOREA_PAN_BOUNDS)).toBeNull();
    expect(clampPointToBox({ lat: 37.96, lng: 124.63 }, KOREA_PAN_BOUNDS)).toBeNull();
  });
});

describe('countPointsOutsideViewport', () => {
  // 서울 근방만 보이는 뷰포트.
  const viewport: LatLngBox = { swLat: 37.4, swLng: 126.8, neLat: 37.7, neLng: 127.2 };

  it('뷰포트 안의 점은 세지 않는다', () => {
    expect(countPointsOutsideViewport([{ lat: 37.5665, lng: 126.978 }], viewport)).toBe(0);
  });

  it('위도·경도 어느 쪽으로든 벗어난 점을 센다', () => {
    const points = [
      { lat: 37.5665, lng: 126.978 }, // 안
      { lat: 35.1796, lng: 129.0756 }, // 부산 — 경도·위도 모두 밖
      { lat: 33.4996, lng: 126.5312 }, // 제주 — 위도 밖
      { lat: 37.5, lng: 130.9 }, // 울릉도 — 경도만 밖
    ];

    expect(countPointsOutsideViewport(points, viewport)).toBe(3);
  });

  it('경계선에 정확히 걸친 점은 보이는 것으로 친다', () => {
    const points = [
      { lat: viewport.swLat, lng: viewport.swLng },
      { lat: viewport.neLat, lng: viewport.neLng },
    ];

    expect(countPointsOutsideViewport(points, viewport)).toBe(0);
  });

  it('점이 없으면 0이다', () => {
    expect(countPointsOutsideViewport([], viewport)).toBe(0);
  });
});

describe('getMedianPoint', () => {
  it('멀리 떨어진 한 건에 중심이 끌려가지 않는다(평균과 달리)', () => {
    const points = [
      { lat: 37.5665, lng: 126.978 }, // 서울
      { lat: 37.5759, lng: 126.9769 },
      { lat: 37.5512, lng: 126.9882 },
      { lat: 35.1796, lng: 129.0756 }, // 부산
      { lat: 48.8566, lng: 2.3522 }, // 파리
    ];

    const center = getMedianPoint(points);

    // 중앙값은 국내에 남는다 — 같은 입력의 평균(위도 39.4 / 경도 102.5)은 중국 내륙으로 튄다.
    expect(center).toEqual({ lat: 37.5665, lng: 126.978 });
  });

  it('짝수 개면 가운데 두 값의 평균을 쓴다', () => {
    const center = getMedianPoint([
      { lat: 10, lng: 20 },
      { lat: 20, lng: 40 },
    ]);

    expect(center).toEqual({ lat: 15, lng: 30 });
  });

  it('입력 배열을 정렬로 변형하지 않는다', () => {
    const points = [
      { lat: 30, lng: 30 },
      { lat: 10, lng: 10 },
      { lat: 20, lng: 20 },
    ];

    getMedianPoint(points);

    expect(points[0]).toEqual({ lat: 30, lng: 30 });
  });

  it('점이 없으면 null이다', () => {
    expect(getMedianPoint([])).toBeNull();
  });
});
