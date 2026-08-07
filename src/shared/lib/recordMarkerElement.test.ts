import { describe, expect, it, vi } from 'vitest';
import { RECORD_MARKER_TIP_Y_RATIO } from './getRecordMarkerAsset';
import {
  applyRecordMarkerPinState,
  createRecordMarkerImage,
  RECORD_MAP_PIN_CLASS,
} from './recordMarkerElement';

const BASE = { assetUrl: '/marker.svg', title: '연남동 카페', widthPx: 32, heightPx: 38 };

describe('createRecordMarkerImage', () => {
  it('공유 호버 규칙(.record-map-pin)이 걸리는 클래스를 붙인다', () => {
    // 이 클래스가 빠지면 두 지도 모두 호버 반응이 조용히 사라진다 — 효과의 유일한 연결점이다.
    expect(createRecordMarkerImage(BASE).className).toBe(RECORD_MAP_PIN_CLASS);
  });

  it('확대 기준점을 핀 끝(RECORD_MARKER_TIP_Y_RATIO)으로 세운다', () => {
    // 바닥(100%)을 기준으로 키우면 커진 만큼 핀 끝이 실제 좌표에서 아래로 밀린다.
    const image = createRecordMarkerImage(BASE);
    expect(image.style.getPropertyValue('--pin-tip-y')).toBe(`${RECORD_MARKER_TIP_Y_RATIO * 100}%`);
  });

  it('Tailwind preflight에 눌려 찌그러지지 않도록 크기를 인라인으로 못박는다', () => {
    const image = createRecordMarkerImage(BASE);
    expect(image.style.maxWidth).toBe('none');
    expect(image.style.width).toBe('32px');
    expect(image.style.height).toBe('38px');
  });

  it('누를 수 있는 핀은 버튼 의미와 탭 순서를 갖는다', () => {
    const onSelect = vi.fn();
    const image = createRecordMarkerImage({ ...BASE, onSelect });
    expect(image.getAttribute('role')).toBe('button');
    expect(image.getAttribute('aria-label')).toBe('연남동 카페');
    expect(image.tabIndex).toBe(0);
    expect(image.dataset.pinStatic).toBeUndefined();
  });

  it('키보드 Enter·Space로도 핀을 누를 수 있고, Space가 페이지를 스크롤하지 않는다', () => {
    const onSelect = vi.fn();
    const image = createRecordMarkerImage({ ...BASE, onSelect });

    image.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    const space = new KeyboardEvent('keydown', { key: ' ', cancelable: true });
    image.dispatchEvent(space);
    image.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', cancelable: true }));

    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(space.defaultPrevented).toBe(true);
  });

  it('표시 전용 핀은 [data-pin-static]으로 호버·포커스 규칙에서 빠진다', () => {
    // 누를 수 없는 것에 누를 수 있다는 신호(손 모양 커서·떠오름)를 주지 않기 위해서다.
    const image = createRecordMarkerImage(BASE);
    expect(image.dataset.pinStatic).toBe('true');
    expect(image.getAttribute('role')).toBeNull();
    expect(image.tabIndex).toBe(-1);
  });
});

describe('applyRecordMarkerPinState', () => {
  it('기본 상태를 커스텀 프로퍼티로만 넘긴다 — 인라인 transform은 쓰지 않는다', () => {
    // 인라인 transform은 명시도 최상위라 .record-map-pin의 호버 규칙을 이겨 버린다. 그러면 선택
    // 강조가 걸린 핀에는 호버가 아예 먹지 않는다 — 이 티켓이 피하려는 바로 그 상황이다.
    const image = createRecordMarkerImage(BASE);
    applyRecordMarkerPinState(image, { baseScale: 1.35, filter: 'saturate(.32)', opacity: 0.85 });

    expect(image.style.getPropertyValue('--pin-base-scale')).toBe('1.35');
    expect(image.style.getPropertyValue('--pin-filter')).toBe('saturate(.32)');
    expect(image.style.getPropertyValue('--pin-opacity')).toBe('0.85');
    expect(image.style.transform).toBe('');
    expect(image.style.transition).toBe('');
  });

  it('걸 filter가 없으면 none이 아니라 항등 함수로 세운다', () => {
    // `none`을 쓰면 호버 규칙의 `var(--pin-filter) drop-shadow(...)`가 문법에 어긋나 통째로 버려지고,
    // 상시 필터가 없는 핀만 호버 그림자가 조용히 사라진다(실렌더 확인에서 잡힌 증상).
    const image = createRecordMarkerImage(BASE);
    applyRecordMarkerPinState(image, { filter: 'saturate(.32)' });
    applyRecordMarkerPinState(image, {});

    expect(image.style.getPropertyValue('--pin-filter')).toBe('brightness(1)');
    expect(image.style.getPropertyValue('--pin-base-scale')).toBe('1');
    expect(image.style.getPropertyValue('--pin-opacity')).toBe('1');
  });
});
