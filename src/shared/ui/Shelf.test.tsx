import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ShelfColumnStatus } from './Shelf';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('ShelfColumnStatus', () => {
  it('문구 유무와 관계없이 같은 한 줄 높이를 예약한다', () => {
    act(() =>
      root.render(
        <>
          <ShelfColumnStatus message="별칭을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." />
          <ShelfColumnStatus />
        </>,
      ),
    );

    const statuses = container.querySelectorAll('p');
    expect(statuses).toHaveLength(2);
    expect(statuses[0].classList.contains('h-4')).toBe(true);
    expect(statuses[0].classList.contains('truncate')).toBe(true);
    expect(statuses[1].classList.contains('h-4')).toBe(true);
    expect(statuses[1].getAttribute('aria-hidden')).toBe('true');
  });
});
