import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchResultItem } from '@/features/search/api/searchRecords';
import { SearchResultGallery } from './SearchResultGallery';

const ITEMS: SearchResultItem[] = Array.from({ length: 4 }, (_, index) => ({
  recordId: index + 1,
  similarity: 1 - index * 0.1,
  place: {
    placeId: index + 10,
    name: `장소 ${index + 1}`,
    address: `주소 ${index + 1}`,
    lat: 37.5,
    lng: 127,
  },
  matchedContext: {
    contextId: index + 20,
    body: `맥락 ${index + 1}`,
    createdAt: '2026-08-12T00:00:00+09:00',
  },
  keywords: [],
  keywordStatus: 'COMPLETED',
  createdAt: '2026-08-12T00:00:00+09:00',
}));

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

describe('SearchResultGallery', () => {
  it('가로 탐색 가능한 결과 영역과 응답 순서의 카드를 렌더한다', () => {
    const onSelectRecord = vi.fn();

    act(() => {
      root.render(<SearchResultGallery items={ITEMS} onSelectRecord={onSelectRecord} />);
    });

    const gallery = container.querySelector<HTMLElement>('.pl-results__gallery');
    const cards = Array.from(container.querySelectorAll<HTMLButtonElement>('.pl-results__card'));

    expect(gallery?.getAttribute('role')).toBe('region');
    expect(gallery?.getAttribute('aria-label')).toBe('검색 결과 4곳');
    expect(gallery?.tabIndex).toBe(0);
    expect(cards.map((card) => card.textContent)).toEqual([
      expect.stringContaining('장소 1/4'),
      expect.stringContaining('장소 2/4'),
      expect.stringContaining('장소 3/4'),
      expect.stringContaining('장소 4/4'),
    ]);

    act(() => cards[2].click());
    expect(onSelectRecord).toHaveBeenCalledWith(3);
  });
});
