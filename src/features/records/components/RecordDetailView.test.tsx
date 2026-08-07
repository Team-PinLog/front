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
 * - 포스트잇이 **겹친다**(둘째 장부터 음수 marginTop) — 겹침이 사라지면 무리가 목록으로 돌아간다
 * - 포스트잇 폭이 **본문 길이에 따라 달라진다** — 세 장이 모두 같은 폭이면 규칙이 죽은 것이다
 * - 추가 자리(점선 실루엣)는 맥락이 몇 개든 **항상** 있다(389의 유일한 추가 진입점)
 * - 수정·삭제 버튼이 각 포스트잇에 남아 있다(기능 무손실)
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

/** 포스트잇 한 장을 감싼 콜라주 래퍼들(인라인 width·marginTop이 붙는 자리). */
function noteWrappers() {
  return Array.from(container.querySelectorAll<HTMLElement>('div[style*="width"]')).filter((el) =>
    el.querySelector('.context-sticky-note'),
  );
}

/**
 * 본문 텍스트로 그 포스트잇의 콜라주 래퍼를 찾는다(2열이라 DOM 순서 = 목록 순서가 아니다).
 * 부분 일치가 아니라 **본문 단락 전체 일치**로 찾는다 — 긴 본문이 짧은 본문을 그대로 품고 있으면
 * 부분 일치는 엉뚱한 장을 집는다.
 */
function wrapperOf(body: string) {
  return noteWrappers().find(
    (el) => el.querySelector('.context-sticky-note p')?.textContent === body,
  )!;
}

/** 콜라주의 두 열. 각 열 안에서만 계단·겹침이 성립한다. */
function collageColumns() {
  const scrollBox = container.querySelector('.place-scroll')!;
  return Array.from(scrollBox.children).map((column) =>
    Array.from(column.querySelectorAll<HTMLElement>('div[style*="width"]')).filter((el) =>
      el.querySelector('.context-sticky-note'),
    ),
  );
}

describe('RecordDetailView — 다이어리 콜라주(415)', () => {
  it('맥락 콜라주는 2열이고 추가 슬롯이 우측 열 맨 위 고정석을 차지한다', async () => {
    await renderDetail([SHORT_BODY, MEDIUM_BODY, LONG_BODY]);

    const columns = collageColumns();
    expect(columns).toHaveLength(2);

    // 슬롯은 우측 열(두 번째) 안에 있고, 스크롤해도 남도록 sticky다.
    const scrollBox = container.querySelector('.place-scroll')!;
    const slotSeat = scrollBox.children[1].querySelector('.sticky');
    expect(slotSeat).not.toBeNull();
    expect(slotSeat?.textContent).toContain('이 장소의 기억이');
    // 좌측 열에는 슬롯이 없다 — 우상단 한 자리뿐이어야 한다.
    expect(scrollBox.children[0].querySelector('.sticky')).toBeNull();
  });

  it('포스트잇은 좌측 열부터 채우고 넘치면 우측 열로 이어진다', async () => {
    // 슬롯이 우측 열의 출발 높이를 먹고 있으므로 첫 장들은 좌측에 쌓인다.
    await renderDetail([SHORT_BODY, SHORT_BODY, SHORT_BODY, SHORT_BODY, SHORT_BODY]);

    const columns = collageColumns();
    expect(columns[0].length).toBeGreaterThan(0);
    expect(columns[1].length).toBeGreaterThan(0);
    expect(columns[0].length + columns[1].length).toBe(5);
    // 좌측이 먼저 차야 한다 — 우측은 슬롯만큼 늦게 시작한다.
    expect(columns[0].length).toBeGreaterThanOrEqual(columns[1].length);
  });

  it('한 열 안에서 둘째 장부터 앞 장을 덮는다(음수 marginTop)', async () => {
    await renderDetail([SHORT_BODY, SHORT_BODY, SHORT_BODY, SHORT_BODY, SHORT_BODY]);

    for (const column of collageColumns()) {
      expect(Number.parseFloat(column[0].style.marginTop || '0')).toBe(0);
      for (const wrapper of column.slice(1)) {
        expect(Number.parseFloat(wrapper.style.marginTop)).toBeLessThan(0);
      }
    }
  });

  it('본문이 길수록 포스트잇이 커진다', async () => {
    await renderDetail([SHORT_BODY, MEDIUM_BODY, LONG_BODY]);

    const short = Number.parseFloat(wrapperOf(SHORT_BODY).style.width);
    const medium = Number.parseFloat(wrapperOf(MEDIUM_BODY).style.width);
    const long = Number.parseFloat(wrapperOf(LONG_BODY).style.width);
    expect(short).toBeLessThan(medium);
    expect(medium).toBeLessThan(long);
  });

  it('맥락이 많아도 추가 슬롯은 사라지지 않는다', async () => {
    await renderDetail([SHORT_BODY, MEDIUM_BODY, LONG_BODY, SHORT_BODY, MEDIUM_BODY]);

    expect(container.textContent).toContain('이 장소의 기억이');
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
