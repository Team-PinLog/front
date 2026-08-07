import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PinPush } from './PinSymbols';

/**
 * 386 푸시핀의 **형태 검증**. 시안과 "같아 보이는가"는 사람 눈으로만 판정할 수 있지만, 그 판정을
 * 받기 전에 기계가 대신 확인할 수 있는 것들이 있다 — 부품의 비례 관계와 회전 후 잘림 여부다.
 * 특히 잘림은 화면에서 "핀 머리가 살짝 잘려 있네" 정도로만 보여 놓치기 쉬운데, 여기서는 좌표로
 * 명확히 드러난다.
 */

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<PinPush height={40} />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function getEllipse(cy: string) {
  return Array.from(container.querySelectorAll('ellipse')).find(
    (node) => node.getAttribute('cy') === cy && node.getAttribute('fill') === 'currentColor',
  )!;
}

/** rotate(deg, cx, cy)를 점에 적용한다. 컴포넌트가 그룹에 건 것과 같은 변환이다. */
function rotatePoint(
  point: { x: number; y: number },
  deg: number,
  center: { x: number; y: number },
) {
  const rad = (deg * Math.PI) / 180;
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: center.y + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

describe('PinPush — 시안 형태의 비례', () => {
  it('받침이 캡보다 넓다 — 이 관계가 깨지면 압정이 아니라 버섯처럼 보인다', () => {
    const capRx = Number(getEllipse('20').getAttribute('rx'));
    const domeRx = Number(getEllipse('84').getAttribute('rx'));
    expect(domeRx).toBeGreaterThan(capRx);
  });

  it('캡 윗면이 타원이다 — 위에서 비스듬히 본 원이라 rx > ry여야 한다', () => {
    const cap = getEllipse('20');
    expect(Number(cap.getAttribute('rx'))).toBeGreaterThan(Number(cap.getAttribute('ry')));
  });

  it('바늘이 받침 아래로 삐져나온다', () => {
    const dome = getEllipse('84');
    const domeBottom = Number(dome.getAttribute('cy')) + Number(dome.getAttribute('ry'));
    // 바늘 path: "M41.6 86 h4.8 v20.5 ..." → 시작 y + 세로 길이가 끝점이다.
    const needle = container.querySelector('path[fill="currentColor"]')!.getAttribute('d')!;
    const [, startY, length] = needle.match(/M[\d.]+ ([\d.]+) h[\d.]+ v([\d.]+)/)!;
    const needleBottom = Number(startY) + Number(length);
    // 받침에 덮이지 않고 실제로 드러나는 길이가 있어야 한다. 앞서 두 번, 이 여유가 음수라
    // 바늘이 통째로 가려졌다(렌더로 발견).
    expect(needleBottom - domeBottom).toBeGreaterThan(8);
    expect(needleBottom).toBeGreaterThan(domeBottom);
  });

  it('색은 currentColor 하나로 받고 입체감은 흰색·검정 오버레이로만 만든다', () => {
    const fills = Array.from(container.querySelectorAll('[fill]'))
      .map((node) => node.getAttribute('fill'))
      .filter((fill) => fill !== 'none');
    expect(fills).toContain('currentColor');
    // 특정 색을 박아 두면 색 주입이 막힌다 — 허용되는 것은 흰색·검정뿐이다.
    fills.forEach((fill) => {
      expect(['currentColor', '#fff', '#000']).toContain(fill);
    });
  });
});

describe('PinPush — 기울여도 잘리지 않는다', () => {
  it('그룹 하나만 회전시킨다 — 부품을 따로 돌리면 좌표를 읽을 수 없다', () => {
    const group = container.querySelector('g')!;
    expect(group.getAttribute('transform')).toMatch(/^rotate\(22 50 70\)$/);
  });

  it('회전 후에도 캡·바늘이 viewBox 안에 있다', () => {
    // 회전은 도형을 바깥으로 밀어낸다. 캡 오른쪽 끝과 바늘 끝이 가장 멀리 나가는 두 점이라,
    // 이 둘이 안에 들어오면 나머지도 들어온다.
    const svg = container.querySelector('svg')!;
    const [, , viewWidth, viewHeight] = svg.getAttribute('viewBox')!.split(' ').map(Number);
    const center = { x: 50, y: 70 };
    const extremes = [
      { x: 74, y: 20 }, // 캡 오른쪽
      { x: 26, y: 20 }, // 캡 왼쪽
      { x: 50, y: 6 }, // 캡 위
      { x: 20, y: 84 }, // 받침 왼쪽
      { x: 50, y: 121.6 }, // 바늘 끝
    ];
    extremes.forEach((point) => {
      const rotated = rotatePoint(point, 22, center);
      expect(rotated.x).toBeGreaterThanOrEqual(0);
      expect(rotated.y).toBeGreaterThanOrEqual(0);
      expect(rotated.x).toBeLessThanOrEqual(viewWidth!);
      expect(rotated.y).toBeLessThanOrEqual(viewHeight!);
    });
  });

  it('원본 비율을 유지한다 — 폭을 높이에서 계산하므로 찌그러지지 않는다', () => {
    const svg = container.querySelector('svg')!;
    const width = Number(svg.getAttribute('width'));
    const height = Number(svg.getAttribute('height'));
    expect(width / height).toBeCloseTo(100 / 128, 5);
  });
});
