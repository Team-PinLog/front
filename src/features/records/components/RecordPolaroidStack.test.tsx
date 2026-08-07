import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecordPolaroidStack } from './RecordPolaroidStack';

/**
 * 408의 계약을 기계로 확인한다.
 * - 사진은 **4:3으로 잘라** 보여준다(비율 4/3 + object-fit cover)
 * - `thumbnailUrl`이 null이거나 로드 실패면 같은 4:3 상자의 폴백으로 간다(높이가 달라지지 않는다)
 * - 받은 URL 문자열을 그대로 `src`에 넣는다(경로·확장자 조립 금지, front#94 정정 코멘트)
 *
 * jsdom은 실제 레이아웃을 계산하지 않아 픽셀 비율은 잴 수 없다. 비율을 만드는 클래스가 사진과
 * 폴백 양쪽에 붙어 있는지로 대신 검사한다.
 *
 * 지도 스냅샷은 카카오 SDK를 네트워크로 받아오므로 대역한다 — 이 테스트의 대상이 아니다.
 */
vi.mock('./RecordPlaceMapSnapshot', () => ({
  RecordPlaceMapSnapshot: () => <div data-testid="map-snapshot" />,
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

const PHOTO_URL = '/api/core/images/places/cafe-1.jpg';

function renderStack(thumbnailUrl?: string | null) {
  act(() =>
    root.render(
      <RecordPolaroidStack
        lat={37.5}
        lng={127}
        placeName="테스트 카페"
        thumbnailUrl={thumbnailUrl}
      />,
    ),
  );
}

describe('RecordPolaroidStack', () => {
  it('thumbnailUrl을 그대로 src에 넣고 4:3으로 자른다', () => {
    renderStack(PHOTO_URL);

    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    // 확장자·경로를 조립하지 않는다 — 받은 문자열 그대로.
    expect(img?.getAttribute('src')).toBe(PHOTO_URL);
    expect(img?.className).toContain('aspect-[4/3]');
    expect(img?.className).toContain('object-cover');
    expect(img?.className).toContain('w-full');
  });

  it('thumbnailUrl이 null이면 같은 4:3 상자의 폴백을 보여준다', () => {
    renderStack(null);

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('아직 이 장소의 사진이 없어요');

    // 사진이 있을 때와 같은 비율 상자여야 사진 유무로 높이가 달라지지 않는다.
    const box = Array.from(container.querySelectorAll('div')).find(
      (el) => el.className.includes('aspect-[4/3]') && el.className.includes('w-full'),
    );
    expect(box).not.toBeUndefined();
  });

  it('필드가 아예 없어도(undefined) 폴백으로 간다', () => {
    renderStack(undefined);

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('아직 이 장소의 사진이 없어요');
  });

  it('이미지 로드에 실패하면 폴백으로 넘어간다', () => {
    renderStack(PHOTO_URL);

    const img = container.querySelector('img')!;
    act(() => {
      img.dispatchEvent(new Event('error'));
    });

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('아직 이 장소의 사진이 없어요');
  });

  it('다른 기록으로 바뀌면 이전 실패가 새 사진을 막지 않는다', () => {
    renderStack(PHOTO_URL);
    act(() => {
      container.querySelector('img')!.dispatchEvent(new Event('error'));
    });
    expect(container.querySelector('img')).toBeNull();

    // 홈 오버레이는 이 컴포넌트를 remount하지 않고 props만 갈아 끼운다.
    renderStack('/api/core/images/places/cafe-2.jpg');

    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      '/api/core/images/places/cafe-2.jpg',
    );
  });
});
