import { describe, expect, it } from 'vitest';
import {
  getBrightnessMatrix,
  getMapToneColorMatrix,
  getMapToneFilterCss,
  getMapToneBottomFadeMask,
  getMapToneWashColorCss,
  getMarkerToneCompensationMatrix,
  getSaturateMatrix,
  getSepiaMatrix,
  invertMatrix3x3,
  multiplyMatrix3x3,
  MAP_TONE_BOTTOM_SAFE_PX,
  MAP_TONE_FILTER,
  MAP_TONE_TEXTURE,
  MAP_TONE_WASH,
  type ColorMatrix3x3,
} from './mapToneMask';

const IDENTITY: ColorMatrix3x3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

function expectMatrixCloseTo(actual: ColorMatrix3x3, expected: ColorMatrix3x3) {
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      expect(actual[i]![j]!).toBeCloseTo(expected[i]![j]!, 5);
    }
  }
}

describe('색 행렬 기본 성질', () => {
  it('saturate(1)·sepia(0)·brightness(1)은 아무것도 바꾸지 않는다', () => {
    expectMatrixCloseTo(getSaturateMatrix(1), IDENTITY);
    expectMatrixCloseTo(getSepiaMatrix(0), IDENTITY);
    expectMatrixCloseTo(getBrightnessMatrix(1), IDENTITY);
  });

  it('saturate(0)은 모든 행이 같아진다 — 회색조가 된다는 뜻이다', () => {
    const gray = getSaturateMatrix(0);
    expectMatrixCloseTo(gray, [
      [0.213, 0.715, 0.072],
      [0.213, 0.715, 0.072],
      [0.213, 0.715, 0.072],
    ]);
  });

  it('행렬과 그 역행렬을 곱하면 항등행렬이다', () => {
    const m = getMapToneColorMatrix();
    const inverse = invertMatrix3x3(m);
    expect(inverse).not.toBeNull();
    expectMatrixCloseTo(multiplyMatrix3x3(m, inverse!), IDENTITY);
    // 반대 순서로 곱해도 항등이어야 한다. 마커는 자식 필터가 먼저 적용되고 조상 필터가 나중이라,
    // 실제로 적용되는 순서는 M·M⁻¹이 아니라 M⁻¹을 먼저 지나는 쪽이다.
    expectMatrixCloseTo(multiplyMatrix3x3(inverse!, m), IDENTITY);
  });

  it('되돌릴 수 없는 설정(brightness 0)에서는 null을 준다 — NaN 행렬을 만들지 않는다', () => {
    expect(invertMatrix3x3(getBrightnessMatrix(0))).toBeNull();
  });
});

describe('getMarkerToneCompensationMatrix', () => {
  it('feColorMatrix가 요구하는 20개 값을 준다', () => {
    const values = getMarkerToneCompensationMatrix();
    expect(values).not.toBeNull();
    expect(values!.split(' ')).toHaveLength(20);
  });

  it('모든 값이 유한하다 — NaN이 하나라도 섞이면 마커가 통째로 사라진다', () => {
    const values = getMarkerToneCompensationMatrix()!;
    values.split(' ').forEach((value) => {
      expect(Number.isFinite(Number(value))).toBe(true);
    });
  });

  it('알파 행은 그대로 통과시킨다 — 마커의 투명 배경이 사각형으로 채워지면 안 된다', () => {
    const values = getMarkerToneCompensationMatrix()!.split(' ').map(Number);
    expect(values.slice(15)).toEqual([0, 0, 0, 1, 0]);
  });

  it('보정 행렬을 통과한 브랜드 색이 컨테이너 필터를 지나면 원래 색으로 돌아온다', () => {
    // 마커 팔레트의 실제 색 하나(marker-06-mint 계열)로 왕복을 확인한다. 이 왕복이 깨지면
    // 지도 위 마커만 누렇게 뜬다.
    const original = [0.18, 0.78, 0.62] as const;
    const compensation = invertMatrix3x3(getMapToneColorMatrix())!;
    const tone = getMapToneColorMatrix();

    const apply = (m: ColorMatrix3x3, c: readonly number[]) =>
      m.map((row) => row[0]! * c[0]! + row[1]! * c[1]! + row[2]! * c[2]!);

    const roundTrip = apply(tone, apply(compensation, original));

    roundTrip.forEach((channel, index) => {
      expect(channel).toBeCloseTo(original[index]!, 5);
    });
  });
});

describe('조정 상수와 파생 CSS', () => {
  it('필터 CSS에 네 가지 조정값이 모두 들어간다', () => {
    const css = getMapToneFilterCss();
    expect(css).toContain(`saturate(${MAP_TONE_FILTER.saturate})`);
    expect(css).toContain(`sepia(${MAP_TONE_FILTER.sepia})`);
    expect(css).toContain(`brightness(${MAP_TONE_FILTER.brightness})`);
    expect(css).toContain(`contrast(${MAP_TONE_FILTER.contrast})`);
  });

  it('하단 페이드 마스크가 로고 보호 높이를 그대로 쓴다', () => {
    // 이 값이 0이 되면 워시가 카카오 로고·저작권을 덮는다(약관 위반).
    expect(MAP_TONE_BOTTOM_SAFE_PX).toBeGreaterThan(0);
    expect(getMapToneBottomFadeMask()).toContain(`${MAP_TONE_BOTTOM_SAFE_PX}px`);
  });

  it('워시 색과 알파가 하나의 rgba로 합쳐진다', () => {
    expect(getMapToneWashColorCss()).toBe(`rgba(246, 239, 227, ${MAP_TONE_WASH.alpha})`);
  });

  it('워시·질감 알파가 지도를 읽지 못할 만큼 진하지 않다', () => {
    // 상수를 조정하다 실수로 크게 올리는 것을 막는 가드다. 지도는 배경이지 그림이 아니다.
    expect(MAP_TONE_WASH.alpha).toBeLessThanOrEqual(0.3);
    expect(MAP_TONE_TEXTURE.alpha).toBeLessThanOrEqual(0.08);
  });
});
