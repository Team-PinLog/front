import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CollectionDeleteConfirmProvider } from '@/contexts/CollectionDeleteConfirmProvider';
import { EditCollectionTitleProvider } from '@/contexts/EditCollectionTitleProvider';
import { CollectionSpreadProvider } from '@/contexts/CollectionSpreadProvider';
import { DeleteConfirmProvider } from '@/contexts/DeleteConfirmProvider';
import type { CollectionDetail } from '../api/getCollectionDetail';
import { CollectionDetailView } from './CollectionDetailView';

/**
 * 418(컬렉션 펼침면 다이어리 리디자인)의 규칙 중, 눈으로만 확인하면 다음 작업에서 조용히 깨질
 * 것들을 기계로 고정한다.
 *
 * - **공개 범위**가 첫째다. 타인 배치에서는 Context 원문이 DOM에 아예 없어야 하고(응답의
 *   `contexts`가 null인 것을 화면이 성실히 따르는지), 소유자 전용 동작(제목 수정·컬렉션 삭제·
 *   기록 추가·이 장 뜯어내기)이 하나도 나오면 안 된다.
 * - 타인 배치의 점선 카드는 **저장 진입점**이다(418 코멘트 3의 5번) — 문구가 "맥락을 더한다"로
 *   되돌아가면 계약을 오해하게 만든다.
 * - 맥락 무리는 **2열 그리드**이고 '새로운 맥락 추가' 자리는 **없다**(맥락 추가는 Record 상세의 일).
 * - 맥락이 많아지면 **글자를 조여** 담는다(스크롤 금지 제약). 15px 아래로는 줄이지 않는다.
 * - 목차 장이 사라졌으므로 쪽 번호는 `record 순번 / 전체`다.
 *
 * @testing-library가 없는 저장소라 react-dom/client로 직접 렌더한다(RecordDetailView.test.tsx 선례).
 * 지도는 카카오 SDK를 네트워크로 받아오므로 대역한다 — 이 테스트의 대상이 아니다.
 */
vi.mock('./CollectionSpreadMap', () => ({
  CollectionSpreadMap: () => <div data-testid="spread-map" />,
}));

const getCollectionDetailMock = vi.fn<() => Promise<CollectionDetail>>();
vi.mock('../api/getCollectionDetail', () => ({
  getCollectionDetail: () => getCollectionDetailMock(),
}));

const BODIES = [
  '창가 자리에서 두 시간쯤 앉아 있었다. 커피가 산미가 강했다.',
  '조용했다',
  '비 오는 날 우연히 들어갔는데 사장님이 우산을 빌려주셨다.',
  '점심에는 줄이 길다',
  '테라스에서 노을을 봤다. 바람이 시원했고 음악이 좋았다.',
  '재방문 의사 있음',
  '친구랑 세 시간 떠들었다. 아무도 눈치 주지 않아서 좋았다.',
  '주차가 어렵다',
];

function makeDetail(options: { ownedByMe: boolean; contextCount: number }): CollectionDetail {
  return {
    collectionId: 7,
    title: '비 오는 날의 서울',
    ownedByMe: options.ownedByMe,
    follow: options.ownedByMe ? null : { followed: false, followId: null, alias: null },
    coverImageUrl: null,
    records: {
      items: [
        {
          recordId: 1,
          place: {
            placeId: 10,
            kakaoPlaceId: 'kakao-10',
            name: '성수동 카페 온화',
            address: '서울 성동구 연무장길 1',
            thumbnailUrl: null,
            lat: 37.5,
            lng: 127.05,
          },
          // 타인 조회는 서버가 null을 내려준다(privacy-rules.md 1장).
          contexts: options.ownedByMe
            ? Array.from({ length: options.contextCount }, (_, index) => ({
                contextId: 100 + index,
                body: BODIES[index % BODIES.length],
                createdAt: '2026-08-02T10:00:00Z',
              }))
            : null,
          keywords: ['조용한', '커피 맛집'],
          createdAt: '2026-08-02T10:00:00Z',
          addedToCollectionAt: '2026-08-03T10:00:00Z',
        },
        {
          recordId: 2,
          place: {
            placeId: 11,
            kakaoPlaceId: 'kakao-11',
            name: '망원 한강공원',
            address: '서울 마포구 마포나루길 467',
            thumbnailUrl: null,
            lat: 37.55,
            lng: 126.9,
          },
          contexts: options.ownedByMe ? [] : null,
          // keywords: []는 AI 미완료 상태의 정상 응답이다 — 오류로 다루지 않는다.
          keywords: [],
          createdAt: '2026-08-02T10:00:00Z',
          addedToCollectionAt: '2026-08-03T10:00:00Z',
        },
      ],
      nextCursor: null,
      hasNext: false,
    },
    publishedAt: '2026-08-05T10:00:00Z',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-05T10:00:00Z',
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
  getCollectionDetailMock.mockReset();
});

async function renderView(options: { ownedByMe: boolean; contextCount: number }) {
  getCollectionDetailMock.mockResolvedValue(makeDetail(options));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <CollectionDeleteConfirmProvider>
          <EditCollectionTitleProvider>
            <CollectionSpreadProvider>
              <DeleteConfirmProvider>
                <CollectionDetailView collectionId={7} />
              </DeleteConfirmProvider>
            </CollectionSpreadProvider>
          </EditCollectionTitleProvider>
        </CollectionDeleteConfirmProvider>
      </QueryClientProvider>,
    );
  });
  // useInfiniteQuery가 resolve된 뒤의 리렌더까지 흘려보낸다(첫 커밋은 아직 isPending이다).
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/**
 * 418-39에서 **목차 장이 첫 장으로 돌아왔다** — 펼치면 목차가 먼저 나오므로, record 장의 내용을
 * 확인하는 테스트는 인덱스 레일에서 그 장을 골라 넘긴 뒤에 본다(사용자가 하는 동작 그대로).
 */
async function goToRecordPage(placeName: string) {
  const tab = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
    (button) => button.title === placeName,
  );
  await act(async () => {
    tab?.click();
  });
}

/** 포스트잇마다 본문 `p`는 첫 번째다(두 번째는 `created:` 메타 줄이다). */
function noteBodies() {
  return Array.from(container.querySelectorAll('.context-sticky-note')).map(
    (note) => note.querySelector('p')?.textContent,
  );
}

describe('CollectionDetailView — 펼침면 소유자 배치(418)', () => {
  it('맥락은 2열로 포개 앉고, 끝에 점선 추가 자리가 붙는다', async () => {
    await renderView({ ownedByMe: true, contextCount: 3 });
    await goToRecordPage('성수동 카페 온화');

    // 418-33: 그리드가 아니라 **겹칠 수 있는 절대 배치**다(스크롤을 만들지 않는 유일한 방법).
    // 그래도 열은 둘이라, 카드의 left가 두 종류로만 갈린다.
    const cards = Array.from(
      container.querySelectorAll<HTMLElement>('[data-page-turn="ignore"] > div[style*="left"]'),
    );
    // 맥락 3장 + 점선 슬롯 1칸.
    expect(cards).toHaveLength(4);
    const columns = new Set(
      cards.map((card) => (Number.parseFloat(card.style.left) > 200 ? 1 : 0)),
    );
    expect(columns).toEqual(new Set([0, 1]));
    // 콜라주 상자는 스크롤 상자가 아니다 — 넘치면 겹침이 깊어질 뿐이다.
    expect(cards[0].parentElement?.className).not.toContain('overflow');
    expect(noteBodies()).toHaveLength(3);
    // 418-43: 맥락 추가 진입점(점선 자리)이 이 화면으로 돌아왔다. 무리의 끝에 한 장만 놓인다.
    expect(container.querySelectorAll('button[aria-label="맥락 수정"]')).toHaveLength(3);
  });

  it('소유자 도구와 이 장 뜯어내기가 모두 있다(기능 무손실)', async () => {
    await renderView({ ownedByMe: true, contextCount: 2 });
    await goToRecordPage('성수동 카페 온화');

    expect(container.textContent).toContain('기록 추가');
    expect(container.textContent).toContain('제목 수정');
    expect(container.textContent).toContain('컬렉션 삭제');
    expect(container.textContent).toContain('이 장 뜯어내기');
    // 각 포스트잇의 수정·삭제도 그대로다.
    expect(container.querySelectorAll('button[aria-label="맥락 수정"]')).toHaveLength(2);
    expect(container.querySelectorAll('button[aria-label="맥락 삭제"]')).toHaveLength(2);
  });

  it('맥락이 많아지면 글자를 조여 담는다(스크롤 대신 밀도)', async () => {
    await renderView({ ownedByMe: true, contextCount: 2 });
    await goToRecordPage('성수동 카페 온화');
    const loose = Number.parseFloat(
      (container.querySelector('.context-sticky-note p') as HTMLElement).style.fontSize || '20',
    );

    act(() => root.unmount());
    container.remove();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await renderView({ ownedByMe: true, contextCount: 8 });
    await goToRecordPage('성수동 카페 온화');
    const dense = Number.parseFloat(
      (container.querySelector('.context-sticky-note p') as HTMLElement).style.fontSize || '20',
    );

    expect(dense).toBeLessThan(loose);
    // 읽을 수 없을 만큼 줄이지는 않는다.
    expect(dense).toBeGreaterThanOrEqual(15);
  });

  it('맥락이 하나도 없어도 오류로 다루지 않는다', async () => {
    await renderView({ ownedByMe: true, contextCount: 0 });
    await goToRecordPage('성수동 카페 온화');

    expect(noteBodies()).toHaveLength(0);
    expect(container.textContent).toContain('맥락이 아직 없어요');
  });

  it('첫 장은 목차이고, 장을 고르면 쪽 번호가 record 순번 / 전체가 된다(418-39)', async () => {
    await renderView({ ownedByMe: true, contextCount: 1 });

    // 펼치면 목차가 먼저다.
    expect(container.textContent).toContain('목차');
    expect(container.textContent).not.toContain('1 / 2');

    await goToRecordPage('성수동 카페 온화');
    expect(container.textContent).toContain('1 / 2');
  });

  it('표제는 컬렉션 제목과 "기록 N개 · 만든 날"이다', async () => {
    await renderView({ ownedByMe: true, contextCount: 1 });

    expect(container.textContent).toContain('비 오는 날의 서울');
    expect(container.textContent).toContain('기록 2개 · 2026. 8. 1. 만듦');
  });
});

describe('CollectionDetailView — 펼침면 타인 배치(418)', () => {
  it('Context 원문을 한 글자도 렌더하지 않는다(공개 범위)', async () => {
    await renderView({ ownedByMe: false, contextCount: 3 });
    await goToRecordPage('성수동 카페 온화');

    expect(container.querySelectorAll('.context-sticky-note')).toHaveLength(0);
    for (const body of BODIES) {
      expect(container.textContent).not.toContain(body);
    }
    expect(container.textContent).toContain('맥락은 기록한 사람만 볼 수 있어요');
  });

  it('소유자 전용 동작이 하나도 없다', async () => {
    await renderView({ ownedByMe: false, contextCount: 0 });
    await goToRecordPage('성수동 카페 온화');

    expect(container.textContent).not.toContain('제목 수정');
    expect(container.textContent).not.toContain('컬렉션 삭제');
    expect(container.textContent).not.toContain('기록 추가');
    expect(container.textContent).not.toContain('이 장 뜯어내기');
  });

  it('점선 카드는 "내 기록에 담기" 저장 진입점이다', async () => {
    await renderView({ ownedByMe: false, contextCount: 0 });
    await goToRecordPage('성수동 카페 온화');

    expect(container.textContent).toContain('이 장소를 내 기록에 담기');
    // "기억이 더 쌓이길 기다려요"는 그 컬렉션에 맥락을 더한다는 뜻으로 읽혀 쓰지 않기로 확정됐다.
    expect(container.textContent).not.toContain('기억이 더 쌓이길');
  });

  it('장소명·주소·키워드 label은 양쪽 배치에서 그대로 보여준다', async () => {
    await renderView({ ownedByMe: false, contextCount: 0 });
    await goToRecordPage('성수동 카페 온화');

    expect(container.textContent).toContain('성수동 카페 온화');
    expect(container.textContent).toContain('서울 성동구 연무장길 1');
    expect(container.textContent).toContain('조용한');
    expect(container.textContent).toContain('커피 맛집');
  });
});
