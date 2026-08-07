import { describe, expect, it } from 'vitest';
import { getNavPlacement, getSidebarWidthPx } from '@/shared/lib/appChrome';
import {
  FEED_CARD_RATIO,
  getFeedGridAreaWidthPx,
  getFeedRowsContentBudgetPx,
  getPageContentBudgetPx,
} from '@/shared/lib/shelfCabinetLayout';
import type { ShelfWidthTier } from '@/shared/lib/useShelfBreakpoint';
import { getBookstoreLayout, getBookstorePageSize, getWeeklyKeywords } from './feedLayout';

// FeedList가 매 렌더 수행하는 합성과 같은 순서다(collectionCoverVariant.test.ts의 cardWidthFor와 동일).
// 서점 레이아웃도 결국 "뷰포트 → 예산 → 치수"라는 같은 사슬을 타므로, 실제 화면에서 나오는 값으로
// 검증해야 의미가 있다.
const BOOKSTORE_SIDE_GUTTER_PX = 32;

interface ViewportCase {
  name: string;
  width: number;
  height: number;
  tier: ShelfWidthTier;
}

function layoutFor({ width, height, tier }: ViewportCase) {
  const contentBudgetPx = getFeedRowsContentBudgetPx(
    getPageContentBudgetPx(
      height,
      { navChromeHeightPx: getNavPlacement(tier) === 'bottom' ? 80 : 0, titleHeightPx: 56 },
      tier,
    ),
  );
  const availableGridWidthPx =
    getFeedGridAreaWidthPx(width, getSidebarWidthPx(tier)) - BOOKSTORE_SIDE_GUTTER_PX * 2;
  return {
    contentBudgetPx,
    availableGridWidthPx,
    layout: getBookstoreLayout({ budgetPx: contentBudgetPx, availableGridWidthPx }),
  };
}

const CASES: ViewportCase[] = [
  { name: 'xl 1920x1080', width: 1920, height: 1080, tier: 'xl' },
  { name: 'xl 1512x982', width: 1512, height: 982, tier: 'xl' },
  { name: 'xl 1440x900', width: 1440, height: 900, tier: 'xl' },
  { name: 'xl 1280x720(가장 좁은 xl)', width: 1280, height: 720, tier: 'xl' },
  { name: 'mdlg 1024x768', width: 1024, height: 768, tier: 'mdlg' },
  { name: 'mdlg 768x1024', width: 768, height: 1024, tier: 'mdlg' },
  { name: 'sm 390x844', width: 390, height: 844, tier: 'sm' },
];

describe('getBookstoreLayout — 세로 예산 계약', () => {
  // 이 레이아웃이 지켜야 할 가장 중요한 성질이다. Feed는 좌우 버튼 페이지네이션이라 페이지 스크롤이
  // 생기면 안 되는데(295/314), 히어로·선반 두 구역으로 나뉘면서 계산이 두 배로 늘었다.
  it('두 구역과 사이 간격의 합이 세로 예산을 넘지 않는다', () => {
    for (const testCase of CASES) {
      const { contentBudgetPx, layout } = layoutFor(testCase);
      const used = layout.heroSectionHeight + layout.sectionGap + layout.shelfSectionHeight;
      expect(used, testCase.name).toBeLessThanOrEqual(contentBudgetPx);
    }
  });

  it('각 구역 안에서 책 높이 + 선반 판이 그 구역을 넘지 않는다', () => {
    for (const testCase of CASES) {
      const { layout } = layoutFor(testCase);
      expect(layout.heroCardHeight + layout.plankHeight, testCase.name).toBeLessThanOrEqual(
        layout.heroSectionHeight,
      );
      expect(layout.shelfCardHeight + layout.plankHeight, testCase.name).toBeLessThanOrEqual(
        layout.shelfSectionHeight,
      );
    }
  });

  it('히어로가 하단 선반 책보다 크다 — 대표 책이라는 사실이 크기로 드러나야 한다', () => {
    for (const testCase of CASES) {
      const { layout } = layoutFor(testCase);
      expect(layout.heroCardHeight, testCase.name).toBeGreaterThan(layout.shelfCardHeight);
    }
  });
});

describe('getBookstoreLayout — 가로', () => {
  it('카드 비율은 언제나 3:4다(기존 레이아웃과 같은 최우선 제약)', () => {
    for (const testCase of CASES) {
      const { layout } = layoutFor(testCase);
      // Math.floor 때문에 1px 오차는 허용한다.
      expect(Math.abs(layout.heroCardWidth - layout.heroCardHeight * FEED_CARD_RATIO)).toBeLessThan(
        1,
      );
      expect(
        Math.abs(layout.shelfCardWidth - layout.shelfCardHeight * FEED_CARD_RATIO),
      ).toBeLessThan(1);
    }
  });

  it('히어로 + 보조 카드 단이 가용 폭을 넘지 않는다', () => {
    for (const testCase of CASES) {
      const { availableGridWidthPx, layout } = layoutFor(testCase);
      const used =
        layout.heroCardWidth + (layout.showAside ? layout.heroAsideGap + layout.asideWidth : 0);
      expect(used, testCase.name).toBeLessThanOrEqual(availableGridWidthPx);
    }
  });

  it('하단 선반의 책들이 가용 폭을 넘지 않는다', () => {
    for (const testCase of CASES) {
      const { availableGridWidthPx, layout } = layoutFor(testCase);
      const used =
        layout.shelfCapacity * layout.shelfCardWidth + (layout.shelfCapacity - 1) * layout.bookGap;
      expect(used, testCase.name).toBeLessThanOrEqual(availableGridWidthPx);
    }
  });

  it('좁은 화면(sm)에서는 보조 카드 단을 접는다 — 히어로가 폭을 다 쓴다', () => {
    const { layout } = layoutFor(CASES[CASES.length - 1]);
    expect(layout.showAside).toBe(false);
    expect(layout.asideWidth).toBe(0);
  });
});

describe('getBookstorePageSize', () => {
  it('히어로 1권 + 선반 용량이고, 어떤 뷰포트에서도 최소 3권은 요청한다', () => {
    for (const testCase of CASES) {
      const { layout } = layoutFor(testCase);
      const pageSize = getBookstorePageSize(layout);
      expect(pageSize, testCase.name).toBe(1 + layout.shelfCapacity);
      expect(pageSize, testCase.name).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('getWeeklyKeywords', () => {
  it('많이 나온 키워드부터 돌려준다', () => {
    const items = [
      { keywords: ['카페', '조용한'] },
      { keywords: ['카페', '산책'] },
      { keywords: ['카페', '조용한'] },
    ];
    expect(getWeeklyKeywords(items, 3)).toEqual([
      { label: '카페', count: 3 },
      { label: '조용한', count: 2 },
      { label: '산책', count: 1 },
    ]);
  });

  it('limit까지만 자른다', () => {
    const items = [{ keywords: ['가', '나', '다', '라'] }];
    expect(getWeeklyKeywords(items, 3)).toHaveLength(3);
  });

  it('동점이면 먼저 나온 키워드가 앞이다 — 렌더마다 순서가 흔들리면 안 된다', () => {
    const items = [{ keywords: ['먼저', '나중'] }, { keywords: ['나중', '먼저'] }];
    const first = getWeeklyKeywords(items, 2);
    expect(first.map((keyword) => keyword.label)).toEqual(['먼저', '나중']);
    expect(getWeeklyKeywords(items, 2)).toEqual(first);
  });

  it('keywords가 전부 비어 있어도 빈 배열일 뿐 오류가 아니다(AI 미완료 정상 상태)', () => {
    expect(getWeeklyKeywords([{ keywords: [] }, { keywords: [] }], 3)).toEqual([]);
  });
});
