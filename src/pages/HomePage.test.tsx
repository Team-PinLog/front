import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';

const { resetSearchMock } = vi.hoisted(() => ({
  resetSearchMock: vi.fn(),
}));

vi.mock('@/features/search/hooks/useSearchRecordsMutation', async () => {
  const React = await import('react');
  return {
    useSearchRecordsMutation: () => {
      const [isSuccess, setIsSuccess] = React.useState(true);
      return {
        data: { bounds: null, items: [] },
        isSuccess,
        isPending: false,
        isError: false,
        mutate: vi.fn(),
        reset: () => {
          resetSearchMock();
          setIsSuccess(false);
        },
      };
    },
  };
});

vi.mock('@/features/map/hooks/useRecordMapMarkersQuery', () => ({
  useRecordMapMarkersQuery: () => ({ data: { items: [] } }),
}));
vi.mock('@/contexts/PlaceRecordSheetProvider', () => ({
  PlaceRecordSheetProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/features/records/components/PlaceRecordSheet', () => ({ PlaceRecordSheet: () => null }));
vi.mock('@/features/records/components/RecordDetailOverlay', () => ({
  RecordDetailOverlay: () => null,
}));
vi.mock('@/features/home/components/HomeMapSection', () => ({ HomeMapSection: () => null }));
vi.mock('@/features/home/components/PaperApertureStage', () => ({
  PaperApertureStage: ({ dock, children }: { dock: ReactNode; children: ReactNode }) => (
    <>
      {dock}
      {children}
    </>
  ),
}));
vi.mock('@/features/home/components/HomeSheetPanels', () => ({
  HomeLeftType: () => null,
  HomeRightType: () => null,
  HomeTopType: () => null,
  HomeTopmark: () => null,
}));
vi.mock('@/features/home/lib/paperAperture', () => ({
  computeOpen: () => 1,
  MAP_TOP_OBSTRUCTION_PX: 0,
  SEARCH_PLACEHOLDERS: ['비 오는 카페'],
}));
vi.mock('@/shared/ui/PaperCornerNav', () => ({ PaperCornerNav: () => null }));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true }) as MediaQueryList),
  );
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  resetSearchMock.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('HomePage 빈 검색 결과', () => {
  it('다시 검색하면 상태와 검색어를 비우고 검색 입력창으로 포커스를 돌린다', async () => {
    await act(async () => {
      root.render(<HomePage />);
    });

    const input = container.querySelector<HTMLInputElement>('#home-search');
    expect(input).not.toBeNull();
    await act(async () => {
      if (input) {
        input.value = '비 오는 카페';
        input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      }
    });
    expect(input?.value).toBe('비 오는 카페');

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain('아직 남긴 기억이 없어요');

    const retryButton = Array.from(dialog?.querySelectorAll('button') ?? []).find((button) =>
      button.textContent?.includes('다시 검색하기'),
    );
    await act(async () => {
      retryButton?.click();
    });

    expect(resetSearchMock).toHaveBeenCalledOnce();
    expect(input?.value).toBe('');
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(input);
  });
});
