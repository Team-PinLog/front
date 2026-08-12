import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchResultItem } from '@/features/search/api/searchRecords';
import { SearchResultGallery } from './SearchResultGallery';

const ITEMS: SearchResultItem[] = Array.from({ length: 7 }, (_, index) => ({
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
  it('검색 결과 6개를 한 페이지의 2행 3열용 그룹에 담는다', () => {
    act(() => {
      root.render(<SearchResultGallery items={ITEMS.slice(0, 6)} onSelectRecord={vi.fn()} />);
    });

    const pages = container.querySelectorAll('.pl-results__page');

    expect(pages).toHaveLength(1);
    expect(pages[0]?.querySelectorAll('.pl-results__card')).toHaveLength(6);
    expect(container.querySelector('.pl-results__controls')).toBeNull();
  });

  it('가로 탐색 가능한 결과 영역과 응답 순서의 카드를 렌더한다', () => {
    const onSelectRecord = vi.fn();

    act(() => {
      root.render(<SearchResultGallery items={ITEMS} onSelectRecord={onSelectRecord} />);
    });

    const gallery = container.querySelector<HTMLElement>('.pl-results__gallery');
    const cards = Array.from(container.querySelectorAll<HTMLButtonElement>('.pl-results__card'));
    const contextBody = container.querySelector<HTMLElement>(
      '.pl-results__context .context-sticky-note > p:first-of-type',
    );

    expect(gallery?.getAttribute('role')).toBe('region');
    expect(gallery?.getAttribute('aria-label')).toBe('검색 결과 7곳');
    expect(gallery?.tabIndex).toBe(0);
    expect(container.querySelectorAll('.pl-results__page')).toHaveLength(2);
    expect(contextBody?.style.fontSize).toBe('18px');
    expect(contextBody?.style.lineHeight).toBe('22px');
    expect(cards.map((card) => card.textContent)).toEqual(
      Array.from({ length: 7 }, (_, index) => expect.stringContaining(`장소 ${index + 1}/7`)),
    );

    act(() => cards[2].click());
    expect(onSelectRecord).toHaveBeenCalledWith(3);
  });

  it('운영체제 스크롤바 설정과 무관한 6개 단위 탐색 컨트롤을 제공한다', () => {
    act(() => {
      root.render(<SearchResultGallery items={ITEMS} onSelectRecord={vi.fn()} />);
    });

    const gallery = container.querySelector<HTMLElement>('.pl-results__gallery');
    const previousButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="이전 검색 결과 6개"]',
    );
    const nextButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="다음 검색 결과 6개"]',
    );
    const pages = Array.from(container.querySelectorAll<HTMLElement>('.pl-results__page'));
    const scrollTo = vi.fn();

    Object.defineProperty(gallery, 'scrollTo', { configurable: true, value: scrollTo });
    Object.defineProperty(pages[1], 'offsetLeft', { configurable: true, value: 960 });

    expect(previousButton?.disabled).toBe(true);
    expect(nextButton?.disabled).toBe(false);
    expect(container.querySelector('.pl-results__page-status')?.textContent).toBe('1/2');

    act(() => nextButton?.click());

    expect(scrollTo).toHaveBeenCalledWith({ left: 960, behavior: 'smooth' });
    expect(previousButton?.disabled).toBe(false);
    expect(nextButton?.disabled).toBe(true);
    expect(container.querySelector('.pl-results__page-status')?.textContent).toBe('2/2');
  });

  it('결과 영역을 좌우로 드래그하면 가장 가까운 6개 단위 페이지로 이동한다', () => {
    const onSelectRecord = vi.fn();
    act(() => {
      root.render(<SearchResultGallery items={ITEMS} onSelectRecord={onSelectRecord} />);
    });

    const gallery = container.querySelector<HTMLElement>('.pl-results__gallery')!;
    const pages = Array.from(container.querySelectorAll<HTMLElement>('.pl-results__page'));
    const firstCard = container.querySelector<HTMLButtonElement>('.pl-results__card')!;
    const scrollTo = vi.fn();
    const setPointerCapture = vi.fn();

    Object.defineProperties(gallery, {
      scrollLeft: { configurable: true, writable: true, value: 0 },
      scrollTo: { configurable: true, value: scrollTo },
      setPointerCapture: { configurable: true, value: setPointerCapture },
      hasPointerCapture: { configurable: true, value: () => true },
      releasePointerCapture: { configurable: true, value: vi.fn() },
    });
    Object.defineProperty(pages[1], 'offsetLeft', { configurable: true, value: 960 });

    act(() => {
      gallery.dispatchEvent(
        Object.assign(new MouseEvent('pointerdown', { bubbles: true, clientX: 800, button: 0 }), {
          pointerId: 1,
        }),
      );
      gallery.dispatchEvent(
        Object.assign(new MouseEvent('pointermove', { bubbles: true, clientX: 200 }), {
          pointerId: 1,
        }),
      );
      gallery.dispatchEvent(
        Object.assign(new MouseEvent('pointerup', { bubbles: true, clientX: 200 }), {
          pointerId: 1,
        }),
      );
      firstCard.click();
    });

    expect(gallery.scrollLeft).toBe(600);
    expect(setPointerCapture).toHaveBeenCalledWith(1);
    expect(scrollTo).toHaveBeenCalledWith({ left: 960, behavior: 'smooth' });
    expect(onSelectRecord).not.toHaveBeenCalled();

    act(() => firstCard.click());
    expect(onSelectRecord).toHaveBeenCalledWith(1);
  });

  it('카드의 pointerdown과 pointerup 사이에 드래그가 없으면 capture하지 않고 상세를 연다', () => {
    const onSelectRecord = vi.fn();
    act(() => {
      root.render(<SearchResultGallery items={ITEMS} onSelectRecord={onSelectRecord} />);
    });

    const gallery = container.querySelector<HTMLElement>('.pl-results__gallery')!;
    const firstCard = container.querySelector<HTMLButtonElement>('.pl-results__card')!;
    const setPointerCapture = vi.fn();

    Object.defineProperties(gallery, {
      setPointerCapture: { configurable: true, value: setPointerCapture },
      hasPointerCapture: { configurable: true, value: () => false },
    });

    act(() => {
      firstCard.dispatchEvent(
        Object.assign(new MouseEvent('pointerdown', { bubbles: true, clientX: 400, button: 0 }), {
          pointerId: 2,
        }),
      );
      firstCard.dispatchEvent(
        Object.assign(new MouseEvent('pointerup', { bubbles: true, clientX: 400, button: 0 }), {
          pointerId: 2,
        }),
      );
      firstCard.click();
    });

    expect(setPointerCapture).not.toHaveBeenCalled();
    expect(onSelectRecord).toHaveBeenCalledOnce();
    expect(onSelectRecord).toHaveBeenCalledWith(1);
  });
});
