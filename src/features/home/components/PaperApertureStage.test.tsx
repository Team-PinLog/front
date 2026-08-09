import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaperApertureStage } from './PaperApertureStage';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false }) as MediaQueryList),
  );
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('PaperApertureStage', () => {
  it('상하 경계의 deckle만 제거하고 종이 표면 질감은 유지한다', () => {
    act(() => {
      root.render(
        <PaperApertureStage
          open={1}
          top={<span>상판</span>}
          left={<span>왼쪽</span>}
          topmark={<span>워드마크</span>}
          dock={<span>검색</span>}
        >
          <span>지도</span>
        </PaperApertureStage>,
      );
    });

    expect(container.querySelector('.pl-deckle')).toBeNull();
    expect(container.querySelectorAll('.pl-sheet')).toHaveLength(2);
    expect(container.querySelectorAll('.pl-grain')).toHaveLength(2);
    expect(container.querySelectorAll('.pl-emboss')).toHaveLength(2);
    expect(container.querySelectorAll('.pl-spot')).toHaveLength(2);
  });
});
