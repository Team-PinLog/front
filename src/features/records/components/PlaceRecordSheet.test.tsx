import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaceRecordSheetProvider } from '@/contexts/PlaceRecordSheetProvider';
import { usePlaceRecordSheet } from '@/contexts/usePlaceRecordSheet';
import { PlaceRecordSheet } from './PlaceRecordSheet';

const { mutationMock, searchMutationMock } = vi.hoisted(() => {
  const mutation = {
    data: undefined,
    error: null,
    isError: false,
    isPending: false,
    isSuccess: false,
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  };
  return {
    mutationMock: mutation,
    searchMutationMock: {
      ...mutation,
      data: [
        {
          kakaoPlaceId: 'place-1',
          name: '첫 번째 장소',
          categoryName: '카페',
          address: '서울시 강남구',
          roadAddress: '서울시 강남구 테헤란로',
          phone: null,
          placeUrl: null,
          lat: 37.5,
          lng: 127,
        },
        {
          kakaoPlaceId: 'place-2',
          name: '두 번째 장소',
          categoryName: '음식점',
          address: '서울시 서초구',
          roadAddress: null,
          phone: null,
          placeUrl: null,
          lat: 37.4,
          lng: 127.1,
        },
      ],
      isSuccess: true,
    },
  };
});

vi.mock('@/features/places/hooks/useKakaoPlaceSearch', () => ({
  useKakaoPlaceSearch: () => searchMutationMock,
}));
vi.mock('@/features/places/hooks/usePlaceSuggestionMutation', () => ({
  usePlaceSuggestionMutation: () => mutationMock,
}));
vi.mock('../hooks/useCreateRecordMutation', () => ({
  useCreateRecordMutation: () => mutationMock,
}));
vi.mock('@/features/collections/hooks/useMyCollectionsQuery', () => ({
  useMyCollectionsQuery: () => ({
    data: undefined,
    isError: false,
    isPending: false,
    isSuccess: false,
  }),
}));
vi.mock('@/features/collections/hooks/useAddRecordsToCollectionMutation', () => ({
  useAddRecordsToCollectionMutation: () => mutationMock,
}));
vi.mock('@/features/collections/hooks/useCreateCollectionMutation', () => ({
  useCreateCollectionMutation: () => mutationMock,
}));
vi.mock('@/features/collections/components/NewCollectionModal', () => ({
  NewCollectionModal: () => null,
}));
vi.mock('@/features/collections/components/CollectionCoverModal', () => ({
  CollectionCoverModal: () => null,
}));

function SheetHarness() {
  const sheet = usePlaceRecordSheet();
  return (
    <>
      <button type="button" onClick={sheet.open}>
        열기
      </button>
      <PlaceRecordSheet previewMode />
    </>
  );
}

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
  vi.clearAllMocks();
});

describe('PlaceRecordSheet 760px 노트 밀도', () => {
  it('entry 고정 콘텐츠는 전체 스크롤을 만들지 않고 가변 검색 결과만 스크롤한다', () => {
    act(() => {
      root.render(
        <PlaceRecordSheetProvider>
          <SheetHarness />
        </PlaceRecordSheetProvider>,
      );
    });
    act(() => container.querySelector<HTMLButtonElement>('button')?.click());

    const viewport = container.querySelector<HTMLElement>('[data-place-record-viewport="entry"]');
    const searchResults = container.querySelector<HTMLElement>(
      '[data-place-record-scroll-owner="search-results"]',
    );

    expect(viewport?.className).toContain('overflow-hidden');
    expect(viewport?.className.split(' ')).not.toContain('overflow-y-auto');
    expect(viewport?.className).toContain('max-sm:overflow-y-auto');
    expect(viewport?.className).toContain('[@media(max-height:680px)]:overflow-y-auto');
    expect(searchResults?.className).toContain('overflow-y-auto');
    expect(searchResults?.className).toContain('absolute');
    expect(searchResults?.className).toContain('max-h-40');
  });

  it('업로드 영역과 CTA를 줄인 노트 비율로 렌더한다', () => {
    act(() => {
      root.render(
        <PlaceRecordSheetProvider>
          <SheetHarness />
        </PlaceRecordSheetProvider>,
      );
    });
    act(() => container.querySelector<HTMLButtonElement>('button')?.click());

    const dropzone = container.querySelector<HTMLElement>('[data-testid="place-capture-dropzone"]');
    const analyzeButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === '이 이미지로 분석 시작',
    );

    expect(dropzone?.className).toContain('flex-1');
    expect(dropzone?.closest('div')?.className).toContain('min-h-[156px]');
    expect(dropzone?.closest('div')?.className).toContain('my-3');
    expect(analyzeButton?.className).toContain('h-12');
    expect(analyzeButton?.className).not.toContain('h-[60px]');
  });
});
