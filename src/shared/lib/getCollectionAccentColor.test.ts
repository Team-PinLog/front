import { describe, expect, it } from 'vitest';
import {
  ACCENT_COLORS,
  getCollectionAccentColor,
  getNearestAccentColor,
  getRepresentativeRgb,
} from './getCollectionAccentColor';

// 331: 표지 색이 이미지에서 나오게 바뀌면서, 자동 검증이 가능한 부분은 두 순수 함수뿐이다 —
// 픽셀 → 대표색(getRepresentativeRgb)과 대표색 → 팔레트(getNearestAccentColor). canvas 샘플링과
// 이미지 로드는 jsdom에서 재현되지 않으므로 육안 확인 몫이다.

// 팔레트 10색은 기본 5색과 그 25% 음영이 앞뒤로 붙어 있다 — 인덱스 i와 i+5가 같은 색 계열이다.
const BASE_COUNT = ACCENT_COLORS.length / 2;

function familyOf(hex: string): number {
  return ACCENT_COLORS.indexOf(hex) % BASE_COUNT;
}

function pixels(colors: Array<[number, number, number, number]>): Uint8ClampedArray {
  return new Uint8ClampedArray(colors.flat());
}

describe('getNearestAccentColor', () => {
  it('언제나 기존 팔레트 안의 색만 돌려준다(새 색을 만들지 않는다)', () => {
    for (let r = 0; r <= 255; r += 17) {
      for (let g = 0; g <= 255; g += 51) {
        for (let b = 0; b <= 255; b += 51) {
          expect(ACCENT_COLORS).toContain(getNearestAccentColor({ r, g, b }));
        }
      }
    }
  });

  it('팔레트 색 자신은 자기 자신으로 매핑된다', () => {
    for (const hex of ACCENT_COLORS) {
      const rgb = {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16),
      };
      expect(getNearestAccentColor(rgb)).toBe(hex);
    }
  });

  it('색 계열이 보존된다 — 붉은 도판은 붉은 계열로, 푸른 도판은 푸른 계열로 간다', () => {
    // 이 테스트가 거리 계산을 Lab에서 하는 이유다(rgbToLab 주석). RGB 유클리드로 되돌리면 세 번째
    // 케이스(청록)가 파랑 계열로 붙어 여기서 걸린다 — 실제로 그렇게 만들었다가 갈아엎었다.
    expect(familyOf(getNearestAccentColor({ r: 139, g: 40, b: 40 }))).toBe(familyOf('#FFB6A6'));
    // 팔레트에는 파랑 계열이 둘(#67A2C5 하늘색, #99C2FF 연보라빛 파랑) 있다 — 어느 쪽이든 파랑이면
    // 이 기능의 요구는 지켜진 것이다. 하나로 못 박으면 팔레트 사정이 아니라 거리식의 소수점을
    // 검증하게 된다.
    expect([familyOf('#67A2C5'), familyOf('#99C2FF')]).toContain(
      familyOf(getNearestAccentColor({ r: 40, g: 70, b: 150 })),
    );
    expect(familyOf(getNearestAccentColor({ r: 60, g: 130, b: 110 }))).toBe(familyOf('#9BCEC1'));
  });

  it('어두운 색은 음영 쪽, 밝은 색은 기본색 쪽으로 간다', () => {
    expect(
      ACCENT_COLORS.indexOf(getNearestAccentColor({ r: 90, g: 60, b: 55 })),
    ).toBeGreaterThanOrEqual(BASE_COUNT);
    expect(ACCENT_COLORS.indexOf(getNearestAccentColor({ r: 250, g: 185, b: 172 }))).toBeLessThan(
      BASE_COUNT,
    );
  });
});

describe('getRepresentativeRgb', () => {
  it('지면(흰 여백)에 묻히지 않고 도판의 색을 잡는다', () => {
    // 여백 6 : 색 4. 걸러내지 않으면 평균이 (198,168,166)으로 흰색 쪽에 붙는다.
    const data = pixels([
      ...Array.from({ length: 6 }, () => [255, 255, 255, 255] as [number, number, number, number]),
      ...Array.from({ length: 4 }, () => [120, 40, 35, 255] as [number, number, number, number]),
    ]);
    expect(getRepresentativeRgb(data)).toEqual({ r: 120, g: 40, b: 35 });
  });

  it('검정 윤곽선도 함께 제외한다', () => {
    const data = pixels([
      [0, 0, 0, 255],
      [10, 8, 12, 255],
      [120, 40, 35, 255],
      [120, 40, 35, 255],
    ]);
    expect(getRepresentativeRgb(data)).toEqual({ r: 120, g: 40, b: 35 });
  });

  it('걸러내고 남는 픽셀이 5% 미만이면 전체 평균으로 물러선다', () => {
    // 색 픽셀 1 / 전체 100 = 1%. 한 픽셀의 색은 대표색이 아니라 잡음이다.
    const data = pixels([
      ...Array.from({ length: 99 }, () => [255, 255, 255, 255] as [number, number, number, number]),
      [0, 0, 200, 255],
    ]);
    const representative = getRepresentativeRgb(data);
    expect(representative).not.toBeNull();
    expect(representative!.r).toBeGreaterThan(240);
  });

  it('투명 픽셀은 세지 않는다', () => {
    const data = pixels([
      [0, 0, 200, 0],
      [120, 40, 35, 255],
    ]);
    expect(getRepresentativeRgb(data)).toEqual({ r: 120, g: 40, b: 35 });
  });

  it('불투명 픽셀이 하나도 없으면 null이다(호출부가 폴백 색으로 간다)', () => {
    expect(getRepresentativeRgb(pixels([[10, 20, 30, 0]]))).toBeNull();
  });
});

describe('getCollectionAccentColor', () => {
  it('표지가 없을 때의 폴백 — 같은 id는 항상 같은 팔레트 색이다', () => {
    for (let id = 1; id <= 50; id += 1) {
      const first = getCollectionAccentColor(id);
      expect(getCollectionAccentColor(id)).toBe(first);
      expect(ACCENT_COLORS).toContain(first);
    }
  });
});
