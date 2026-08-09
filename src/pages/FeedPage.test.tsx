import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedPage } from './FeedPage';

vi.mock('@/features/paper/components/PaperSpreadStage', () => ({
  PaperSpreadStage: ({ left }: { left: ReactNode }) => <div>{left}</div>,
}));

vi.mock('@/features/feed/components/FeedList', () => ({
  FeedList: () => null,
}));

vi.mock('@/features/records/components/PlaceRecordSheet', async () => {
  const { usePlaceRecordSheet } = await import('@/contexts/usePlaceRecordSheet');
  return {
    PlaceRecordSheet: () => {
      const sheet = usePlaceRecordSheet();
      return sheet.isOpen ? <div role="dialog">장소 기록</div> : null;
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

describe('FeedPage 장소 추가', () => {
  it('두 번째 포스트잇을 누르면 실제 장소 기록 시트를 여는 context가 연결된다', () => {
    act(() => root.render(<FeedPage />));

    const addPlaceButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.replace('+', '').trim() === '장소 추가하기',
    );
    expect(addPlaceButton).toBeDefined();
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    act(() => addPlaceButton?.click());

    expect(container.querySelector('[role="dialog"]')?.textContent).toBe('장소 기록');
  });
});
