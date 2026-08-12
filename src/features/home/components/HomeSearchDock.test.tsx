import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeSearchDock, type HomeSearchDockHandle } from './HomeSearchDock';

const { preloadMock } = vi.hoisted(() => ({ preloadMock: vi.fn() }));

vi.mock('react-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-dom')>()),
  preload: preloadMock,
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true }) as MediaQueryList),
  );
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  preloadMock.mockClear();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('HomeSearchDock', () => {
  it('명시적인 focus API로 검색 입력창에 포커스를 돌려준다', () => {
    const ref = createRef<HomeSearchDockHandle>();
    act(() => {
      root.render(
        <HomeSearchDock
          ref={ref}
          query=""
          onQueryChange={vi.fn()}
          onSubmit={vi.fn()}
          isPending={false}
        />,
      );
    });

    act(() => ref.current?.focus());

    expect(document.activeElement).toBe(container.querySelector('#home-search'));
    expect(preloadMock).toHaveBeenCalledExactlyOnceWith('/fonts/nanum-geumeunbohwa.woff2', {
      as: 'font',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
      fetchPriority: 'low',
    });
  });
});
