import { describe, expect, it } from 'vitest';
import {
  clampPointToBox,
  countPointsOutsideViewport,
  FIT_BOUNDS_PADDING_MAX_PX,
  FIT_BOUNDS_PADDING_MIN_PX,
  getFitBoundsBasePaddingPx,
  getFitPadding,
  getMedianPoint,
  getVisibleCenterLatOffset,
  KOREA_PAN_BOUNDS,
  shrinkViewportFromTop,
  type LatLngBox,
  type MapViewInsets,
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

// 홈 히어로 오버레이가 배경 지도 위쪽을 덮는 상황(Jira S15P11A705-325).
// 컨테이너 800px 중 위 200px이 가려진 경우를 기준 케이스로 쓴다.
const COVERED: MapViewInsets = { topObstructionPx: 200, containerHeightPx: 800 };
const UNCOVERED: MapViewInsets = { topObstructionPx: 0, containerHeightPx: 800 };
// 위도폭 8도가 800px에 걸쳐 있어 1px = 0.01도. 계산 결과를 눈으로 확인하기 쉬운 값이다.
const VIEWPORT: LatLngBox = { swLat: 33, swLng: 124, neLat: 41, neLng: 132 };

describe('getFitPadding', () => {
  it('가려진 높이만큼 위쪽 여유만 키우고 나머지 세 방향은 그대로 둔다', () => {
    expect(getFitPadding(48, COVERED)).toEqual({ top: 248, right: 48, bottom: 48, left: 48 });
  });

  it('가림이 없으면 사방이 기존과 같다', () => {
    expect(getFitPadding(48, UNCOVERED)).toEqual({ top: 48, right: 48, bottom: 48, left: 48 });
  });

  it('컨테이너 높이를 아직 모르면(0) 보정하지 않는다', () => {
    const notMeasured: MapViewInsets = { topObstructionPx: 200, containerHeightPx: 0 };
    expect(getFitPadding(48, notMeasured).top).toBe(48);
  });

  it('가림 높이가 컨테이너보다 크면 컨테이너 높이까지만 반영한다', () => {
    const absurd: MapViewInsets = { topObstructionPx: 5000, containerHeightPx: 800 };
    expect(getFitPadding(48, absurd).top).toBe(848);
  });
});

describe('shrinkViewportFromTop', () => {
  it('가려진 높이만큼 북쪽 경계를 남쪽으로 내린다', () => {
    // 200px * 0.01도/px = 2도.
    expect(shrinkViewportFromTop(VIEWPORT, COVERED)).toEqual({ ...VIEWPORT, neLat: 39 });
  });

  it('경도 경계와 남쪽 경계는 건드리지 않는다', () => {
    const shrunk = shrinkViewportFromTop(VIEWPORT, COVERED);
    expect(shrunk.swLat).toBe(VIEWPORT.swLat);
    expect(shrunk.swLng).toBe(VIEWPORT.swLng);
    expect(shrunk.neLng).toBe(VIEWPORT.neLng);
  });

  it('가림이 없으면 원본을 그대로 돌려준다', () => {
    expect(shrinkViewportFromTop(VIEWPORT, UNCOVERED)).toEqual(VIEWPORT);
  });

  it('가려진 구간에 있는 점은 화면 밖으로 센다', () => {
    // 위도 40N은 원래 뷰포트 안(33~41)이지만 오버레이에 가린 구간(39~41)에 들어간다.
    const points = [{ lat: 40, lng: 127 }];
    expect(countPointsOutsideViewport(points, VIEWPORT)).toBe(0);
    expect(countPointsOutsideViewport(points, shrinkViewportFromTop(VIEWPORT, COVERED))).toBe(1);
  });
});

describe('getVisibleCenterLatOffset', () => {
  it('가려진 높이의 절반만큼 지도 중심을 북쪽으로 올린다', () => {
    // 200px의 절반인 100px * 0.01도/px = 1도.
    expect(getVisibleCenterLatOffset(VIEWPORT, COVERED)).toBe(1);
  });

  it('보정한 중심에 두면 목표 지점이 가시 영역의 세로 한가운데에 온다', () => {
    // 가시 영역은 위도 33~39이므로 세로 중앙은 36N이다. 목표를 36N에 놓으려면 지도 중심이 37N,
    // 즉 목표보다 1도 북쪽이어야 한다.
    const visible = shrinkViewportFromTop(VIEWPORT, COVERED);
    const visibleCenterLat = (visible.swLat + visible.neLat) / 2;
    const mapCenterLat = visibleCenterLat + getVisibleCenterLatOffset(VIEWPORT, COVERED);
    expect(visibleCenterLat).toBe(36);
    // 지도 중심은 뷰포트 전체의 한가운데(33~41의 중앙 = 37)와 일치해야 한다.
    expect(mapCenterLat).toBe((VIEWPORT.swLat + VIEWPORT.neLat) / 2);
  });

  it('가림이 없으면 보정하지 않는다', () => {
    expect(getVisibleCenterLatOffset(VIEWPORT, UNCOVERED)).toBe(0);
  });
});

describe('getFitBoundsBasePaddingPx', () => {
  it('화면이 클수록 여유도 커진다 — 마커가 가장자리에 붙어 보이지 않게 한 완화 조치다', () => {
    // 사용자 피드백: "fitBounds가 너무 타이트하다". 이전에는 크기와 무관하게 48px 고정이었다.
    const small = getFitBoundsBasePaddingPx(390, 640);
    const large = getFitBoundsBasePaddingPx(1440, 900);
    expect(large).toBeGreaterThan(small);
    expect(small).toBeGreaterThanOrEqual(FIT_BOUNDS_PADDING_MIN_PX);
  });

  it('짧은 변을 기준으로 삼는다 — 세로로 긴 화면에서 좌우 여백이 과해지지 않게', () => {
    // 폭이 아무리 넓어도 높이가 같으면 같은 값이어야 한다.
    expect(getFitBoundsBasePaddingPx(4000, 800)).toBe(getFitBoundsBasePaddingPx(1000, 800));
  });

  it('상한을 넘지 않는다 — 초대형 화면에서 지도가 과하게 축소되지 않게', () => {
    expect(getFitBoundsBasePaddingPx(6000, 6000)).toBe(FIT_BOUNDS_PADDING_MAX_PX);
  });

  it('크기를 아직 모르면 최소값으로 물러난다 — 0이면 마커가 화면 끝에 붙는다', () => {
    expect(getFitBoundsBasePaddingPx(0, 0)).toBe(FIT_BOUNDS_PADDING_MIN_PX);
    expect(getFitBoundsBasePaddingPx(-100, 500)).toBe(FIT_BOUNDS_PADDING_MIN_PX);
  });

  it('상단 가림 높이는 그 위에 더해진다 — 오버레이 뒤로 마커가 숨지 않는다', () => {
    const base = getFitBoundsBasePaddingPx(1440, 900);
    const padding = getFitPadding(base, { topObstructionPx: 215, containerHeightPx: 900 });
    expect(padding.top).toBe(base + 215);
    expect(padding.bottom).toBe(base);
  });
});
