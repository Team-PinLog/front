import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecordDetail } from '../api/getRecordDetail';
import { RecordDetailContent } from './RecordDetailContent';

/**
 * 415(record 상세 다이어리 리디자인)의 배치 규칙과 기능 무손실을 기계로 고정한다.
 *
 * 리디자인이라 "무엇이 어떻게 보이느냐"가 요구사항이고, 그중 눈으로만 확인하면 다음 작업에서
 * 조용히 깨질 것들만 골라 잡는다:
 * - 맥락 무리는 **2열 그리드**이고 카드끼리 겹치지 않는다(음수 마진 없음)
 * - 추가 자리(점선 실루엣)는 맥락이 몇 개든 **늘 네 번째 칸(2행 2열)**이다 — 개수에 따라 자리가
 *   옮겨 다니면 눈이 그 자리를 외울 수 없다(389의 유일한 추가 진입점이다)
 * - 카드 폭이 **본문 길이에 따라 달라진다** — 세 장이 모두 같은 폭이면 규칙이 죽은 것이다
 * - 맥락이 많아지면 **글자를 조여** 담는다(스크롤 금지 제약). 다만 15px 아래로는 줄이지 않는다
 * - 종이에는 **그림자가 없다**, 수정·삭제 버튼은 **늘 보인다**(사용자 명시)
 *
 * @testing-library가 없는 저장소라 react-dom/client로 직접 렌더한다(RegionMapView.test.tsx 선례).
 * 지도는 카카오 SDK를 네트워크로 받아오므로 대역한다 — 이 테스트의 대상이 아니다.
 */
vi.mock('./RecordPlaceMapSnapshot', () => ({
  RecordPlaceMapSnapshot: () => <div data-testid="map-snapshot" />,
}));

const getRecordDetailMock = vi.fn<() => Promise<RecordDetail>>();
vi.mock('../api/getRecordDetail', () => ({
  getRecordDetail: () => getRecordDetailMock(),
}));

const SHORT_BODY = '조용했다';
const MEDIUM_BODY = '창가 자리에서 두 시간쯤 앉아 있었다. 커피가 산미가 강했고 옆자리가 조용했다.';
const LONG_BODY = MEDIUM_BODY.repeat(3);

function makeDetail(bodies: string[]): RecordDetail {
  return {
    recordId: 1,
    place: {
      placeId: 10,
      name: '성수동 카페 온화',
      address: '서울 성동구 연무장길 1',
      thumbnailUrl: null,
      lat: 37.5,
      lng: 127.05,
    },
    contexts: bodies.map((body, index) => ({
      contextId: 100 + index,
      body,
      createdAt: '2026-08-02T10:00:00Z',
    })),
    keywords: ['조용한', '커피 맛집'],
    createdAt: '2026-08-02T10:00:00Z',
  };
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
  getRecordDetailMock.mockReset();
});

async function renderDetail(bodies: string[]) {
  getRecordDetailMock.mockResolvedValue(makeDetail(bodies));
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <RecordDetailContent recordId={1} onClose={() => {}} />
      </QueryClientProvider>,
    );
  });
  // useQuery가 resolve된 뒤의 리렌더까지 흘려보낸다(첫 커밋은 아직 isPending이다).
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** 포스트잇 한 장을 감싼 칸 래퍼들(인라인 width가 붙는 자리). */
function noteWrappers(scope: ParentNode = container) {
  return Array.from(scope.querySelectorAll<HTMLElement>('div[style*="width"]')).filter((el) =>
    el.querySelector('.context-sticky-note'),
  );
}

/**
 * 본문 텍스트로 그 포스트잇의 칸 래퍼를 찾는다. 부분 일치가 아니라 **본문 단락 전체 일치**로
 * 찾는다 — 긴 본문이 짧은 본문을 그대로 품고 있으면 부분 일치는 엉뚱한 장을 집는다.
 */
function wrapperOf(body: string) {
  return noteWrappers().find(
    (el) => el.querySelector('.context-sticky-note p')?.textContent === body,
  )!;
}

/** 콜라주 그리드의 칸들(읽는 순서). */
function collageCells() {
  return Array.from(container.querySelector('.place-scroll')!.children) as HTMLElement[];
}

/** '새로운 맥락 추가' 자리가 몇 번째 칸인지. */
function composerSlotCellIndex() {
  // 슬롯 버튼만 aria-label이 없다(카드의 ✎/×는 라벨을 갖는다).
  return collageCells().findIndex((cell) => cell.querySelector('button:not([aria-label])'));
}

describe('RecordDetailView — 다이어리 콜라주(415)', () => {
  it('추가 슬롯은 맥락 개수와 상관없이 늘 같은 칸(2행 2열)에 있다', async () => {
    for (const bodies of [[], [SHORT_BODY], [SHORT_BODY, MEDIUM_BODY, SHORT_BODY]]) {
      await renderDetail(bodies);
      // 0-based 세 번째 = 2행 2열. 노트가 몇 장이든 이 자리는 노트에게 내주지 않는다.
      expect(composerSlotCellIndex()).toBe(3);
      // 맥락이 없어도 그리드는 두 줄을 유지한다(윗줄이 납작해지며 슬롯이 올라오지 않게).
      expect(collageCells().length).toBeGreaterThanOrEqual(4);
      act(() => root.unmount());
      container.remove();
      container = document.createElement('div');
      document.body.appendChild(container);
      root = createRoot(container);
    }
  });

  it('카드는 2열 그리드에 앉고 서로 겹치지 않는다', async () => {
    await renderDetail([SHORT_BODY, MEDIUM_BODY, SHORT_BODY, LONG_BODY, SHORT_BODY]);

    const grid = container.querySelector<HTMLElement>('.place-scroll')!;
    expect(grid.className).toContain('grid-cols-2');
    // 앞 장을 덮는 음수 마진이 없다 — 겹침으로 콜라주감을 내던 판을 되돌린 규칙이다.
    for (const wrapper of noteWrappers()) {
      expect(Number.parseFloat(wrapper.style.marginTop || '0')).toBeGreaterThanOrEqual(0);
      expect(Number.parseFloat(wrapper.style.marginLeft || '0')).toBeGreaterThanOrEqual(0);
    }
  });

  it('맥락이 많아지면 글자를 조여 담는다(스크롤 대신 밀도)', async () => {
    await renderDetail([SHORT_BODY, MEDIUM_BODY]);
    const loose = Number.parseFloat(
      (container.querySelector('.context-sticky-note p') as HTMLElement).style.fontSize || '20',
    );

    act(() => root.unmount());
    container.remove();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await renderDetail(Array.from({ length: 8 }, () => MEDIUM_BODY));
    const dense = Number.parseFloat(
      (container.querySelector('.context-sticky-note p') as HTMLElement).style.fontSize || '20',
    );

    expect(dense).toBeLessThan(loose);
    // 읽을 수 없을 만큼 줄이지는 않는다.
    expect(dense).toBeGreaterThanOrEqual(15);
  });

  it('수정·삭제 버튼은 늘 보인다(호버로 숨기지 않는다)', async () => {
    await renderDetail([SHORT_BODY]);

    const editButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="맥락 수정"]',
    )!;
    expect(editButton.parentElement?.className).not.toContain('opacity-0');
  });

  it('본문이 길수록 포스트잇이 커진다', async () => {
    await renderDetail([SHORT_BODY, MEDIUM_BODY, LONG_BODY]);

    const short = Number.parseFloat(wrapperOf(SHORT_BODY).style.width);
    const medium = Number.parseFloat(wrapperOf(MEDIUM_BODY).style.width);
    const long = Number.parseFloat(wrapperOf(LONG_BODY).style.width);
    expect(short).toBeLessThan(medium);
    expect(medium).toBeLessThan(long);
  });

  it('종이에는 그림자가 없다', async () => {
    await renderDetail([SHORT_BODY, MEDIUM_BODY]);

    for (const note of container.querySelectorAll('.context-sticky-note')) {
      expect(note.className).not.toContain('shadow');
      expect((note as HTMLElement).style.boxShadow).toBe('');
    }
  });

  it('맥락이 많아도 추가 슬롯은 사라지지 않는다', async () => {
    await renderDetail([SHORT_BODY, MEDIUM_BODY, LONG_BODY, SHORT_BODY, MEDIUM_BODY]);

    expect(composerSlotCellIndex()).toBe(3);
  });

  it('맥락이 하나도 없으면 첫 기억을 청하는 자리만 남는다', async () => {
    await renderDetail([]);

    expect(noteWrappers()).toHaveLength(0);
    expect(container.textContent).toContain('이 장소의 첫 기억을');
  });

  it('각 포스트잇의 수정·삭제와 컬렉션 담기가 그대로 있다(기능 무손실)', async () => {
    await renderDetail([SHORT_BODY, MEDIUM_BODY]);

    expect(container.querySelectorAll('button[aria-label="맥락 수정"]')).toHaveLength(2);
    expect(container.querySelectorAll('button[aria-label="맥락 삭제"]')).toHaveLength(2);
    expect(container.textContent).toContain('컬렉션에 담기');
    expect(container.querySelector('button[aria-label="닫기"]')).not.toBeNull();
  });

  it('수정 버튼을 누르면 그 자리가 손글씨 입력으로 바뀐다', async () => {
    await renderDetail([SHORT_BODY]);

    const editButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="맥락 수정"]',
    )!;
    act(() => editButton.click());

    const textarea = container.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="맥락 본문 수정"]',
    );
    expect(textarea).not.toBeNull();
    expect(textarea?.value).toBe(SHORT_BODY);
    // 수정 중에도 포스트잇 무리와 같은 손글씨 서체를 쓴다(415 — 한 장만 흰 상자로 튀지 않게).
    expect(textarea?.className).toContain('font-hand');
  });

  it('장소명·주소·키워드 라벨을 그대로 보여준다', async () => {
    await renderDetail([SHORT_BODY]);

    expect(container.textContent).toContain('성수동 카페 온화');
    expect(container.textContent).toContain('서울 성동구 연무장길 1');
    expect(container.textContent).toContain('조용한');
    expect(container.textContent).toContain('커피 맛집');
  });
});
