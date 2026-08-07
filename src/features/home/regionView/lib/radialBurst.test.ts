import { describe, expect, it } from 'vitest';
import {
  BURST_ORIGIN_CENTER_PULL_RATIO,
  clampBurstOrigin,
  getRadialBurstPositions,
  pullOriginTowardCenter,
} from './radialBurst';

describe('getRadialBurstPositions', () => {
  it('첫 항목이 클릭 지점 바로 위에 뜬다', () => {
    const [first] = getRadialBurstPositions(4);
    expect(first!.xPx).toBe(0);
    expect(first!.yPx).toBeLessThan(0);
  });

  it('순서대로 등장이 늦어진다 — 이 지연이 "또로록"이다', () => {
    const positions = getRadialBurstPositions(5);
    const delays = positions.map((position) => position.delayMs);
    expect(delays[0]).toBe(0);
    for (let i = 1; i < delays.length; i += 1) {
      expect(delays[i]!).toBeGreaterThan(delays[i - 1]!);
    }
  });

  it('한 고리 안에서는 모두 같은 거리에 놓인다', () => {
    const positions = getRadialBurstPositions(5);
    const radii = positions.map((position) => Math.hypot(position.xPx, position.yPx));
    radii.forEach((radius) => expect(radius).toBeCloseTo(radii[0]!, 0));
  });

  it('항목이 많아지면 바깥 고리로 넘어간다 — 한 고리에 몰아넣으면 칩이 겹친다', () => {
    const positions = getRadialBurstPositions(10);
    const innerRadius = Math.hypot(positions[0]!.xPx, positions[0]!.yPx);
    const outerRadius = Math.hypot(positions[9]!.xPx, positions[9]!.yPx);
    expect(outerRadius).toBeGreaterThan(innerRadius);
  });

  it('같은 고리의 항목들이 서로 다른 자리에 놓인다', () => {
    const positions = getRadialBurstPositions(7);
    const keys = positions.map((position) => `${position.xPx},${position.yPx}`);
    expect(new Set(keys).size).toBe(7);
  });

  it('0개·음수에도 깨지지 않는다', () => {
    expect(getRadialBurstPositions(0)).toEqual([]);
    expect(getRadialBurstPositions(-3)).toEqual([]);
  });
});

describe('clampBurstOrigin', () => {
  const bounds = { width: 800, height: 600 };

  it('가운데에서 눌렀으면 원점을 옮기지 않는다', () => {
    const positions = getRadialBurstPositions(5);
    expect(clampBurstOrigin({ xPx: 400, yPx: 300 }, positions, bounds)).toEqual({
      xPx: 400,
      yPx: 300,
    });
  });

  it('가장자리에서 눌러도 대형 전체가 화면 안에 들어온다', () => {
    const positions = getRadialBurstPositions(5);
    const origin = clampBurstOrigin({ xPx: 5, yPx: 5 }, positions, bounds);
    positions.forEach((position) => {
      expect(origin.xPx + position.xPx).toBeGreaterThanOrEqual(0);
      expect(origin.yPx + position.yPx).toBeGreaterThanOrEqual(0);
      expect(origin.xPx + position.xPx).toBeLessThanOrEqual(bounds.width);
      expect(origin.yPx + position.yPx).toBeLessThanOrEqual(bounds.height);
    });
  });

  it('원점만 옮기고 대형의 모양은 그대로 둔다', () => {
    // 항목을 각자 자르면 방사형이 찌그러져 "퍼졌다"는 인상이 사라진다.
    const positions = getRadialBurstPositions(6);
    const origin = clampBurstOrigin({ xPx: 0, yPx: 0 }, positions, bounds);
    const shifted = positions.map((position) => ({
      x: origin.xPx + position.xPx,
      y: origin.yPx + position.yPx,
    }));
    const dx = shifted[1]!.x - shifted[0]!.x;
    const dy = shifted[1]!.y - shifted[0]!.y;
    expect(dx).toBe(positions[1]!.xPx - positions[0]!.xPx);
    expect(dy).toBe(positions[1]!.yPx - positions[0]!.yPx);
  });

  it('컨테이너가 대형보다 작으면 가운데로 물러난다', () => {
    const positions = getRadialBurstPositions(8);
    const tiny = { width: 40, height: 40 };
    expect(clampBurstOrigin({ xPx: 0, yPx: 0 }, positions, tiny)).toEqual({ xPx: 20, yPx: 20 });
  });

  it('항목이 없으면 원점을 그대로 둔다', () => {
    expect(clampBurstOrigin({ xPx: 3, yPx: 4 }, [], bounds)).toEqual({ xPx: 3, yPx: 4 });
  });
});

describe('pullOriginTowardCenter', () => {
  const bounds = { width: 800, height: 600 };

  it('기본값은 당기지 않는다 — 누른 자리에서 퍼져야 "이 지역의 것"이라는 연결이 유지된다', () => {
    expect(BURST_ORIGIN_CENTER_PULL_RATIO).toBe(0);
    expect(pullOriginTowardCenter({ xPx: 100, yPx: 100 }, bounds)).toEqual({ xPx: 100, yPx: 100 });
  });

  it('비율만큼 가운데로 당긴다 — 가장자리 지역의 존재감을 키우는 손잡이다', () => {
    expect(pullOriginTowardCenter({ xPx: 0, yPx: 0 }, bounds, 0.5)).toEqual({ xPx: 200, yPx: 150 });
  });

  it('1이면 정중앙이다', () => {
    expect(pullOriginTowardCenter({ xPx: 0, yPx: 0 }, bounds, 1)).toEqual({ xPx: 400, yPx: 300 });
  });

  it('범위 밖 비율은 0~1로 접는다', () => {
    expect(pullOriginTowardCenter({ xPx: 10, yPx: 10 }, bounds, -2)).toEqual({ xPx: 10, yPx: 10 });
    expect(pullOriginTowardCenter({ xPx: 10, yPx: 10 }, bounds, 5)).toEqual({ xPx: 400, yPx: 300 });
  });
});
