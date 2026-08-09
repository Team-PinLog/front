import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaperCoverFace } from './HomeSheetPanels';

const { preloadMock } = vi.hoisted(() => ({ preloadMock: vi.fn() }));

vi.mock('react-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-dom')>()),
  preload: preloadMock,
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  preloadMock.mockClear();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('PaperCoverFace', () => {
  it('이동 책이 렌더될 때만 제주명조를 preload한다', () => {
    act(() => root.render(<PaperCoverFace title="책장" />));

    expect(preloadMock).toHaveBeenCalledExactlyOnceWith('/fonts/jeju-myeongjo.woff2', {
      as: 'font',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
    });
  });
});
