import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CollectionOverlayShell } from './CollectionOverlayShell';

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

describe('CollectionOverlayShell', () => {
  it('딤·블러 배경 없이 dialog 의미와 ESC 닫기를 유지한다', () => {
    const onClose = vi.fn();
    act(() =>
      root.render(
        <CollectionOverlayShell onClose={onClose}>
          <button type="button">내용</button>
        </CollectionOverlayShell>,
      ),
    );

    const dialog = container.querySelector<HTMLElement>('[role="dialog"]');
    const backdrop = dialog?.parentElement;
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(dialog);
    expect(backdrop?.className).not.toContain('backdrop-blur');
    expect(backdrop?.className).not.toContain('bg-[#3a332c]');

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('직접 URL 진입도 최초 포커스와 Tab containment를 유지한다', () => {
    act(() =>
      root.render(
        <CollectionOverlayShell>
          <button type="button">첫 버튼</button>
          <button type="button">마지막 버튼</button>
        </CollectionOverlayShell>,
      ),
    );

    const dialog = container.querySelector<HTMLElement>('[role="dialog"]');
    expect(document.activeElement).toBe(dialog);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true })));
    expect(document.activeElement?.textContent).toBe('마지막 버튼');

    const outsideButton = document.createElement('button');
    document.body.appendChild(outsideButton);
    outsideButton.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' })));
    expect(document.activeElement?.textContent).toBe('첫 버튼');
    outsideButton.remove();
  });
});
