import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryPage } from './LibraryPage';

vi.mock('@/features/paper/components/PaperSpreadStage', () => ({
  PaperSpreadStage: ({ left }: { left: ReactNode }) => <>{left}</>,
}));
vi.mock('@/features/collections/hooks/useMyCollectionsQuery', () => ({
  useMyCollectionsQuery: () => ({ data: { pages: [] }, isPending: false }),
}));
vi.mock('@/features/follows/hooks/useFollowsQuery', () => ({
  useFollowsQuery: () => ({ data: { pages: [] }, isPending: false }),
}));
vi.mock('@/features/feed/hooks/useRecentlyOpenedCount', () => ({
  useRecentlyOpenedCount: () => 0,
}));
vi.mock('@/features/records/components/PlaceRecordSheet', async () => {
  const { usePlaceRecordSheet } = await import('@/contexts/usePlaceRecordSheet');
  return {
    PlaceRecordSheet: () => {
      const sheet = usePlaceRecordSheet();
      return sheet.isOpen ? <div role="dialog" aria-label="장소 추가" /> : null;
    },
  };
});

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

describe('LibraryPage 장소 추가 포스트잇', () => {
  it('장소 추가하기를 누르면 같은 Provider에 연결된 장소 추가 시트를 연다', async () => {
    await act(async () => {
      root.render(<LibraryPage />);
    });

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    const addPlaceButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('장소 추가하기'),
    );
    expect(addPlaceButton).toBeDefined();

    await act(async () => {
      addPlaceButton?.click();
    });

    expect(container.querySelector('[role="dialog"][aria-label="장소 추가"]')).not.toBeNull();
  });
});
