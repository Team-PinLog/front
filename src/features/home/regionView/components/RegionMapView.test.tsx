import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecordMapItem } from '@/features/map/api/getRecordMapMarkers';
import { RegionMapView } from './RegionMapView';

/**
 * "색칠된 지역을 눌러도 아무 일이 없다"는 보고(377)를 다시 나지 않게 붙잡아 두는 테스트다.
 *
 * 원인은 두 가지였고 둘 다 이 파일에서 직접 검증할 수 있는 것은 아니다:
 * ① HomePage 컨텐츠 레이어가 지도 위를 덮어 클릭을 삼켰다 → CSS 층 문제라 여기서는 검증할 수 없다
 *    (HomePage에 pointer-events-none을 넣어 고쳤고, 확인 절차는 보고서에 적었다).
 * ② 클릭 대상이 시군구 도형 자체라 도심 자치구는 몇 px이라 누를 수 없었다 → **이 테스트가 그
 *    대상(hit circle)이 존재하고 실제로 눌리며 결과가 뜨는지**를 고정한다.
 *
 * @testing-library가 없는 저장소라 react-dom/client로 직접 렌더한다.
 */

// jsdom에는 matchMedia가 없다. 컴포넌트가 직접 쓰지는 않지만 자식이 쓸 수 있어 최소 구현을 심는다.
beforeEach(() => {
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
  }
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

let container: HTMLDivElement;
let root: Root;

function render(items: RecordMapItem[]) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(<RegionMapView items={items} onSelectRecord={() => {}} />);
  });
}

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function makeItem(recordId: number, name: string, lng: number, lat: number): RecordMapItem {
  return { recordId, placeId: recordId * 10, name, lat, lng };
}

// 서울 시청 좌표. 실제 경계 데이터에서 서울의 한 자치구로 판정된다(regionView.test.ts에서 확인).
const SEOUL = { lng: 126.978, lat: 37.5665 };

describe('RegionMapView — 색칠된 지역 클릭', () => {
  it('기록이 있는 지역에만 누를 수 있는 대상이 생긴다', () => {
    render([makeItem(1, '시청 앞 카페', SEOUL.lng, SEOUL.lat)]);

    const hitTargets = container.querySelectorAll('circle[role="button"]');
    // 기록이 한 지역에만 있으므로 대상도 하나뿐이어야 한다. 0이면 누를 것이 아예 없다는 뜻이고,
    // 그것이 바로 사용자가 겪은 "아무 일도 일어나지 않는다"였다.
    expect(hitTargets).toHaveLength(1);
  });

  it('그 대상을 누르면 그 지역의 장소 이름이 뜬다', () => {
    // ⚠️ 두 좌표를 같은 자치구 안에 둔다. 처음엔 0.001도를 더했다가 두 점이 중구와 종로구로 갈렸는데,
    // 그 자체가 좌표 판정이 실제로 동작한다는 증거이긴 하지만 이 테스트가 확인하려는 것은 아니다.
    render([
      makeItem(1, '시청 앞 카페', SEOUL.lng, SEOUL.lat),
      makeItem(2, '골목 서점', SEOUL.lng + 0.0002, SEOUL.lat + 0.0002),
    ]);

    const hitTarget = container.querySelector('circle[aria-label*="기록 2개"]')!;
    expect(hitTarget).not.toBeNull();
    act(() => {
      hitTarget.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('시청 앞 카페');
    expect(container.textContent).toContain('골목 서점');
  });

  it('서로 다른 자치구의 기록은 각자의 지역에만 뜬다', () => {
    // 좌표 판정이 시군구 단위로 실제 동작하는지 — 두 점을 다른 구에 두고 각각 1개씩인지 본다.
    render([
      makeItem(1, '중구 카페', SEOUL.lng, SEOUL.lat),
      makeItem(2, '종로 서점', SEOUL.lng + 0.001, SEOUL.lat + 0.001),
    ]);

    const hitTargets = container.querySelectorAll('circle[role="button"]');
    expect(hitTargets).toHaveLength(2);
    hitTargets.forEach((target) => {
      expect(target.getAttribute('aria-label')).toContain('기록 1개');
    });
  });

  it('클릭 대상이 도형보다 훨씬 크다 — 도심 자치구는 몇 px이라 도형만으로는 누를 수 없다', () => {
    render([makeItem(1, '시청 앞 카페', SEOUL.lng, SEOUL.lat)]);

    const hitTarget = container.querySelector('circle[role="button"]')!;
    const radius = Number(hitTarget.getAttribute('r'));
    // 실측: 서울 중구는 약 6x3 SVG 단위(=화면 px). 지름이 그보다 확실히 커야 누를 수 있다.
    expect(radius * 2).toBeGreaterThan(12);
  });

  it('색칠 도형은 클릭을 받지 않는다 — 작은 도형이 큰 대상을 가로채면 다시 못 누른다', () => {
    render([makeItem(1, '시청 앞 카페', SEOUL.lng, SEOUL.lat)]);

    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
    paths.forEach((path) => {
      expect(path.getAttribute('pointer-events')).toBe('none');
    });
  });

  it('같은 지역을 다시 누르면 닫힌다', () => {
    render([makeItem(1, '시청 앞 카페', SEOUL.lng, SEOUL.lat)]);
    const hitTarget = container.querySelector('circle[role="button"]')!;

    act(() => hitTarget.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.textContent).toContain('시청 앞 카페');

    act(() => hitTarget.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.textContent).not.toContain('시청 앞 카페');
  });

  it('제주 인셋 안에서도 색칠·클릭이 본토와 똑같이 동작한다', () => {
    // 제주는 본토와 축척이 다른 별도 <g>로 옮겼다(377 후속). 옮기면서 조작이 달라지면 안 된다.
    const JEJU = { lng: 126.5312, lat: 33.4996 }; // 제주시청
    render([makeItem(1, '한라산 근처 카페', JEJU.lng, JEJU.lat)]);

    const hitTarget = container.querySelector('circle[role="button"]')!;
    expect(hitTarget).not.toBeNull();
    expect(hitTarget.getAttribute('aria-label')).toContain('제주');
    // 인셋 그룹 안에 있어야 한다 — 본토 좌표계에 남아 있으면 엉뚱한 자리에 그려진다.
    expect(hitTarget.closest('g')).not.toBeNull();
    // 반지름이 본토와 같아야 조작감이 다르지 않다.
    expect(Number(hitTarget.getAttribute('r'))).toBeGreaterThan(6);

    act(() => hitTarget.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.textContent).toContain('한라산 근처 카페');
  });

  it('본토 지역은 인셋 밖에 그려진다', () => {
    render([makeItem(1, '시청 앞 카페', SEOUL.lng, SEOUL.lat)]);
    const hitTarget = container.querySelector('circle[role="button"]')!;
    expect(hitTarget.closest('g')).toBeNull();
  });

  it('기록이 하나도 없으면 누를 대상이 없다', () => {
    render([]);
    expect(container.querySelectorAll('circle[role="button"]')).toHaveLength(0);
  });
});
