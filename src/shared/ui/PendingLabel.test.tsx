import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PendingLabel } from './PendingLabel';

/**
 * 396의 핵심 계약을 기계로 확인한다: **pending 전후로 라벨 텍스트가 그대로여야 한다.**
 * 폭이 튀는 원인은 라벨 문자열 교체였으므로, 문자열이 유지되는지가 곧 폭 안정성의 검사다
 * (jsdom은 실제 레이아웃 폭을 계산하지 않아 픽셀로는 잴 수 없다).
 */

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

describe('PendingLabel', () => {
  it('pending이 아니면 라벨만 있고 스피너는 없다', () => {
    act(() => root.render(<PendingLabel pending={false}>팔로우</PendingLabel>));

    expect(container.textContent).toBe('팔로우');
    expect(container.querySelector('svg')).toBeNull();
  });

  it('pending이면 라벨을 유지한 채 스피너를 겹친다', () => {
    act(() => root.render(<PendingLabel pending={false}>팔로우</PendingLabel>));
    act(() => root.render(<PendingLabel pending>팔로우</PendingLabel>));

    // 라벨 원문이 남아 있어야 폭이 유지된다 — '처리 중…'으로 갈아 끼우지 않는다.
    expect(container.textContent).toContain('팔로우');
    expect(container.textContent).not.toContain('처리 중…');

    const spinner = container.querySelector('svg');
    expect(spinner).not.toBeNull();
    expect(spinner?.getAttribute('aria-hidden')).toBe('true');
    // 스피너를 absolute로 띄워야 라벨이 밀리지 않는다.
    expect(spinner?.parentElement?.className).toContain('absolute');
  });

  it('prefers-reduced-motion에서 회전을 끄고 정적 표시로 남긴다', () => {
    act(() => root.render(<PendingLabel pending>팔로우</PendingLabel>));

    const spinner = container.querySelector('svg');
    expect(spinner?.getAttribute('class')).toContain('motion-reduce:animate-none');
    expect(spinner?.querySelector('circle')?.getAttribute('class')).toContain(
      'motion-reduce:opacity-100',
    );
  });

  it('스크린리더용 진행 상태 문구를 함께 낸다', () => {
    act(() => root.render(<PendingLabel pending>팔로우</PendingLabel>));

    const srOnly = Array.from(container.querySelectorAll('span')).find((el) =>
      el.className.includes('sr-only'),
    );
    expect(srOnly?.textContent).toBe('처리 중');
  });
});
