import { describe, expect, it } from 'vitest';
import {
  decideFeedRows,
  FEED_CARD_RATIO,
  FEED_CARD_REF_HEIGHT,
  FEED_COLUMNS_BY_KEY,
  FEED_MAX_ROWS_BY_KEY,
  FEED_ROWS_MIN_CARD_WIDTH_PX,
  FEED_SIDE_GUTTER_PX,
  getFeedCardDimensions,
  getFeedColumnsKey,
  getPageContentBudgetPx,
  getFeedGridAreaWidthPx,
  getFeedRowsContentBudgetPx,
  getFeedShelfWidthPx,
  getLibraryTierHeightPx,
  getLibraryVisibleRowCount,
  getShelfScale,
  libraryPinsMyShelf,
  LIBRARY_COLUMNS_BY_TIER,
  LIBRARY_MAX_ROW_COUNT,
  LIBRARY_MIN_ROW_COUNT,
  SHELF_SCALE_MAX,
  SHELF_SCALE_MAX_VW_PX,
  SHELF_SCALE_MIN,
  SHELF_SCALE_MIN_VW_PX,
  SHELF_TIER_GAP_PX,
  solveFeedScale,
  type FeedColumnsKey,
} from './shelfCabinetLayout';
import {
  BOTTOM_NAV_HEIGHT_PX_FALLBACK,
  getNavPlacement,
  getSidebarWidthPx,
  SIDEBAR_RAIL_WIDTH_PX,
  SIDEBAR_WIDE_WIDTH_PX,
} from './appChrome';
import type { ShelfWidthTier } from './useShelfBreakpoint';

// 315: Feed 책장 배치 계산은 순수 함수 네 개(getPageContentBudgetPx → getFeedRowsContentBudgetPx →
// decideFeedRows → solveFeedScale → getFeedCardDimensions)의 합성이고, 그 결과가 화면에 맞는지는
// 지금까지 브라우저에서 눈으로만 확인해왔다. 이 티켓이 예산 계산의 축 자체를 바꾸므로(정보 패널
// 고정항 제거 + 스크롤 박스 여백 차감), "어떤 뷰포트에서도 세로 예산·가로 가용폭을 넘지 않는다"를
// 회귀 테스트로 고정한다. 실제 렌더링(브라우저)에서 넘치는지는 이 계산식이 넘치는지와 같은 문제다 —
// FeedList가 여기서 나온 px을 그대로 style에 쓰기 때문이다.

interface Viewport {
  name: string;
  width: number;
  height: number;
  tier: ShelfWidthTier;
  isLandscape: boolean;
}

// 확인 폭은 작업 계획의 검증 목록(1512/1280/1024/834/768/430/375)에 짧은 세로(667)와 극단값을 더한 것.
const VIEWPORTS: Viewport[] = [
  { name: 'xl 1710x948', width: 1710, height: 948, tier: 'xl', isLandscape: true },
  { name: 'xl 1512x945', width: 1512, height: 945, tier: 'xl', isLandscape: true },
  { name: 'xl 1280x800', width: 1280, height: 800, tier: 'xl', isLandscape: true },
  { name: 'xl 1280x667(짧은 세로)', width: 1280, height: 667, tier: 'xl', isLandscape: true },
  { name: 'mdlg 1024x768 가로', width: 1024, height: 768, tier: 'mdlg', isLandscape: true },
  {
    name: 'mdlg 1024x600 가로(짧은 세로)',
    width: 1024,
    height: 600,
    tier: 'mdlg',
    isLandscape: true,
  },
  { name: 'mdlg 834x1112 세로', width: 834, height: 1112, tier: 'mdlg', isLandscape: false },
  {
    name: 'mdlg 810x1080 세로(iPad 10)',
    width: 810,
    height: 1080,
    tier: 'mdlg',
    isLandscape: false,
  },
  // 330 이후 가장 빡빡한 구간 — md 경계라 사이드바(레일 72px)가 막 생기는 폭이다.
  { name: 'mdlg 768x1024 세로', width: 768, height: 1024, tier: 'mdlg', isLandscape: false },
  { name: 'sm 430x932', width: 430, height: 932, tier: 'sm', isLandscape: false },
  { name: 'sm 375x812', width: 375, height: 812, tier: 'sm', isLandscape: false },
  { name: 'sm 375x667', width: 375, height: 667, tier: 'sm', isLandscape: false },
  { name: 'sm 320x568(최소 폭)', width: 320, height: 568, tier: 'sm', isLandscape: false },
];

// FeedList가 매 렌더 수행하는 계산과 정확히 같은 순서로 배치를 만든다 — 어느 한 단계라도 순서가
// 달라지면(예: 여백 차감을 빠뜨리면) 이 테스트는 실제 화면과 다른 것을 검증하게 된다.
function layoutFor(viewport: Viewport, measured = { navChromeHeightPx: 0, titleHeightPx: 56 }) {
  const columnsKey: FeedColumnsKey = getFeedColumnsKey(viewport.tier, viewport.isLandscape);
  const columns = FEED_COLUMNS_BY_KEY[columnsKey];
  const budgetPx = getPageContentBudgetPx(
    viewport.height,
    {
      navChromeHeightPx:
        getNavPlacement(viewport.tier) === 'bottom' ? measured.navChromeHeightPx : 0,
      titleHeightPx: measured.titleHeightPx,
    },
    viewport.tier,
  );
  const contentBudgetPx = getFeedRowsContentBudgetPx(budgetPx);
  const availableGridWidthPx = getFeedGridAreaWidthPx(
    viewport.width,
    getSidebarWidthPx(viewport.tier),
  );
  const rows = decideFeedRows({
    columns,
    maxRows: FEED_MAX_ROWS_BY_KEY[columnsKey],
    budgetPx: contentBudgetPx,
    availableGridWidthPx,
  });
  const scale = solveFeedScale({ columns, rows, budgetPx: contentBudgetPx, availableGridWidthPx });
  const dims = getFeedCardDimensions(scale);

  return {
    columns,
    rows,
    scale,
    dims,
    contentBudgetPx,
    availableGridWidthPx,
    usedHeightPx: rows * (dims.cardHeight + dims.boardHeight) + dims.rowsGap * (rows - 1),
    usedWidthPx: columns * dims.cardWidth + (columns - 1) * dims.gridGap,
  };
}

describe('Feed 책장 배치', () => {
  describe.each(VIEWPORTS)('$name', (viewport) => {
    it('세로 예산을 넘지 않는다(스크롤바가 생기지 않는다)', () => {
      const { usedHeightPx, contentBudgetPx } = layoutFor(viewport);
      expect(usedHeightPx).toBeLessThanOrEqual(contentBudgetPx);
    });

    it('가로 가용폭을 넘지 않는다(카드가 잘리지 않는다)', () => {
      const { usedWidthPx, availableGridWidthPx } = layoutFor(viewport);
      expect(usedWidthPx).toBeLessThanOrEqual(availableGridWidthPx);
    });

    it('선반 덩어리가 페이지 컨테이너 안에 들어간다', () => {
      const { columns, dims, availableGridWidthPx } = layoutFor(viewport);
      const shelfWidthPx = getFeedShelfWidthPx(columns, dims.cardWidth, dims.gridGap);
      // getFeedGridAreaWidthPx는 컨테이너 폭에서 좌우 gutter(버튼 자리)를 이미 뺀 값이라, 그 gutter를
      // 다시 더해 얹는 선반 폭은 "가용폭 + gutter 2개" 안에 들어와야 한다.
      expect(shelfWidthPx).toBeLessThanOrEqual(availableGridWidthPx + 2 * FEED_SIDE_GUTTER_PX);
    });

    it('카드가 3:4 비율을 유지한다', () => {
      const { dims } = layoutFor(viewport);
      expect(dims.cardWidth).toBe(Math.floor(dims.cardHeight * FEED_CARD_RATIO));
    });

    it('한 행에 최소 2권 이상 놓인다', () => {
      const { columns, rows } = layoutFor(viewport);
      expect(columns).toBeGreaterThanOrEqual(2);
      expect(rows).toBeGreaterThanOrEqual(2);
    });
  });

  // 실측(LayoutMetricsContext) 전 첫 프레임에는 폴백 추정치가 들어온다 — 그 프레임에서 예산이
  // 과대 계상되면 마지막 행이 잠깐 넘쳤다가 제자리를 찾는 깜빡임이 생긴다.
  it('nav·타이틀 높이 실측 전(폴백) 프레임에서도 예산을 넘지 않는다', () => {
    for (const viewport of VIEWPORTS) {
      const budgetPx = getPageContentBudgetPx(
        viewport.height,
        { navChromeHeightPx: null, titleHeightPx: null },
        viewport.tier,
      );
      // 폴백 프레임의 자기 일관성을 본다 — 예산도 레이아웃도 같은 폴백 값을 쓴다. 여기에 실측
      // 추정치를 손으로 적어 두면 폴백 상수가 바뀔 때(330: 떠 있는 탭바가 되며 56→88) 테스트가
      // 예산과 다른 것을 검증하게 된다.
      const { usedHeightPx } = layoutFor(viewport, {
        navChromeHeightPx: BOTTOM_NAV_HEIGHT_PX_FALLBACK,
        titleHeightPx: 56,
      });
      expect(usedHeightPx).toBeLessThanOrEqual(getFeedRowsContentBudgetPx(budgetPx));
    }
  });
});

describe('decideFeedRows', () => {
  it('예산이 늘면 행 수가 줄지 않는다(단조성)', () => {
    let previousRows = 0;
    for (let budgetPx = 300; budgetPx <= 1400; budgetPx += 50) {
      const rows = decideFeedRows({
        columns: 3,
        maxRows: 3,
        budgetPx,
        availableGridWidthPx: 900,
      });
      expect(rows).toBeGreaterThanOrEqual(previousRows === 0 ? 0 : previousRows);
      previousRows = rows;
    }
  });

  it('카드가 읽을 수 없을 만큼 작아지는 행 수는 고르지 않는다', () => {
    // 가로는 넉넉하고 세로만 빠듯한 상황 — 3행을 고르면 카드 폭이 하한 밑(105px)으로 떨어지고,
    // 2행이면 161px이 된다. 화면을 덮는 면적만 보면 3행(9칸)이 이기지만 하한이 그걸 막는다.
    const columns = 3;
    const budgetPx = 500;
    const availableGridWidthPx = 3000;
    const rows = decideFeedRows({ columns, maxRows: 3, budgetPx, availableGridWidthPx });
    expect(rows).toBe(2);

    const scale = solveFeedScale({ columns, rows, budgetPx, availableGridWidthPx });
    const { cardWidth } = getFeedCardDimensions(scale);
    expect(cardWidth).toBeGreaterThanOrEqual(FEED_ROWS_MIN_CARD_WIDTH_PX);
  });

  it('모든 후보가 하한에 걸리면 가장 적은 행 수로 떨어진다', () => {
    // 가로가 극단적으로 좁아 어떤 행 수를 골라도 카드가 하한 밑이다.
    expect(
      decideFeedRows({ columns: 5, maxRows: 3, budgetPx: 2000, availableGridWidthPx: 200 }),
    ).toBe(2);
  });
});

describe('solveFeedScale / getFeedCardDimensions', () => {
  it('예산이 두 배가 되면 카드도 두 배가 된다(고정항이 남아 있지 않다)', () => {
    const base = { columns: 3, rows: 2, availableGridWidthPx: 100000 };
    const small = getFeedCardDimensions(solveFeedScale({ ...base, budgetPx: 400 }));
    const large = getFeedCardDimensions(solveFeedScale({ ...base, budgetPx: 800 }));
    // floor 오차(각 1px)만 허용한다.
    expect(Math.abs(large.cardHeight - small.cardHeight * 2)).toBeLessThanOrEqual(2);
  });

  it('scale=1이면 카드 높이가 기준값이다', () => {
    // 세로·가로 모두 넉넉하면 상한(FEED_SCALE_CAP)에 걸리므로, 정확히 1이 나오는 예산을 역산한다.
    const rows = 2;
    const columns = 3;
    const heightBase = rows * (FEED_CARD_REF_HEIGHT + 22) + 32 * (rows - 1);
    const scale = solveFeedScale({
      columns,
      rows,
      budgetPx: heightBase,
      availableGridWidthPx: 100000,
    });
    expect(scale).toBe(1);
    expect(getFeedCardDimensions(scale).cardHeight).toBe(FEED_CARD_REF_HEIGHT);
  });
});

// 319 디자인 피드백("하단에는 여백이 너무 많아 … 책장이 화면을 거의 채우도록"). Library의 세로
// 배치가 고정 상수(행 3개 + max-h-[590px])에서 뷰포트 기반 역산으로 바뀌었으므로, Feed와 같은
// 수준으로 "어떤 뷰포트에서도 예산을 넘지 않는다"를 고정한다.
describe('Library 세로 배치', () => {
  const LIBRARY_VIEWPORTS: { name: string; w: number; h: number; tier: ShelfWidthTier }[] = [
    { name: 'sm 375x667', w: 375, h: 667, tier: 'sm' },
    { name: 'sm 375x812', w: 375, h: 812, tier: 'sm' },
    { name: 'mdlg 768x1024', w: 768, h: 1024, tier: 'mdlg' },
    { name: 'mdlg 1024x768', w: 1024, h: 768, tier: 'mdlg' },
    { name: 'xl 1280x800', w: 1280, h: 800, tier: 'xl' },
    { name: 'xl 1440x900', w: 1440, h: 900, tier: 'xl' },
    { name: 'xl 1920x1080', w: 1920, h: 1080, tier: 'xl' },
  ];

  // getLibraryVisibleRowCount가 내부에서 빼는 값과 같다
  // (캐비닛 40 + 칸 60 + 스크롤 박스 위 여백 12 + 아래 여백 20).
  const LIBRARY_CHROME_PX = 132;

  it.each(LIBRARY_VIEWPORTS)('$name — 고른 행 수가 캐비닛 예산 안에 들어간다', ({ w, h, tier }) => {
    const budgetPx = getPageContentBudgetPx(
      h,
      { navChromeHeightPx: getNavPlacement(tier) === 'bottom' ? 56 : 0, titleHeightPx: 56 },
      tier,
    );
    const scale = getShelfScale(w);
    const rows = getLibraryVisibleRowCount(budgetPx, scale);
    const usedPx = rows * getLibraryTierHeightPx(scale) + (rows - 1) * SHELF_TIER_GAP_PX;

    expect(rows).toBeGreaterThanOrEqual(LIBRARY_MIN_ROW_COUNT);
    expect(rows).toBeLessThanOrEqual(LIBRARY_MAX_ROW_COUNT);
    // 하한(2행)에 걸린 아주 낮은 뷰포트가 아니라면, 고른 행은 반드시 실제로 들어가야 한다 —
    // 넘치면 마지막 선반이 잘린다.
    if (rows > LIBRARY_MIN_ROW_COUNT) {
      expect(usedPx).toBeLessThanOrEqual(budgetPx - LIBRARY_CHROME_PX);
    }
  });

  it('한 행 더 놓을 여유가 있으면 실제로 한 행 더 놓는다', () => {
    // "빈 공간을 남기지 않는다"의 반대 방향 검증 — floor가 한 행을 놓치면 그만큼 캐비닛이 빈다.
    const scale = 1;
    const tierPx = getLibraryTierHeightPx(scale);
    // 정확히 3행이 딱 들어가는 예산을 만든다.
    const budgetPx = LIBRARY_CHROME_PX + 3 * tierPx + 2 * SHELF_TIER_GAP_PX;
    expect(getLibraryVisibleRowCount(budgetPx, scale)).toBe(3);
    // 1px 모자라면 2행으로 떨어진다(넘치는 것보다 낫다).
    expect(getLibraryVisibleRowCount(budgetPx - 1, scale)).toBe(2);
  });

  it('getShelfScale은 SHELF_SCALE_CSS와 같은 구간에서 같은 값을 낸다', () => {
    expect(getShelfScale(320)).toBe(SHELF_SCALE_MIN);
    expect(getShelfScale(SHELF_SCALE_MIN_VW_PX)).toBe(SHELF_SCALE_MIN);
    expect(getShelfScale(SHELF_SCALE_MAX_VW_PX)).toBe(SHELF_SCALE_MAX);
    expect(getShelfScale(2560)).toBe(SHELF_SCALE_MAX);
    // 중간 지점은 선형 보간이다.
    const mid = (SHELF_SCALE_MIN_VW_PX + SHELF_SCALE_MAX_VW_PX) / 2;
    expect(getShelfScale(mid)).toBeCloseTo((SHELF_SCALE_MIN + SHELF_SCALE_MAX) / 2, 10);
  });
});

// --- 330: 네비게이션 배치 ↔ 레이아웃 예산 -------------------------------------------------------
// 사이드바 경계가 xl에서 md로 내려오면서, 예전에 tier === 'xl' 하나가 담당하던 세 가지 의미
// ("사이드바 있음" / "네비게이션이 세로를 먹음" / "3열 배치")가 갈라졌다. 그 경계를 고정한다.

describe('getNavPlacement / getSidebarWidthPx', () => {
  it('sm만 하단 탭바이고 md 이상은 사이드바다', () => {
    expect(getNavPlacement('sm')).toBe('bottom');
    expect(getNavPlacement('mdlg')).toBe('side');
    expect(getNavPlacement('xl')).toBe('side');
  });

  it('사이드바 폭은 sm 0, md~lg 레일, xl 넓은 폭이다', () => {
    expect(getSidebarWidthPx('sm')).toBe(0);
    expect(getSidebarWidthPx('mdlg')).toBe(SIDEBAR_RAIL_WIDTH_PX);
    expect(getSidebarWidthPx('xl')).toBe(SIDEBAR_WIDE_WIDTH_PX);
  });
});

describe('768 경계에서의 가로 예산', () => {
  // 767(sm, 사이드바 없음) → 768(mdlg, 레일 72px)로 넘어가는 순간 가용폭이 레일만큼 떨어진다.
  // 의도된 불연속이라 값 자체를 못박아 둔다.
  it('사이드바가 생기는 만큼만 가용폭이 줄어든다', () => {
    const beforePx = getFeedGridAreaWidthPx(767, getSidebarWidthPx('sm'));
    const afterPx = getFeedGridAreaWidthPx(768, getSidebarWidthPx('mdlg'));
    // 767과 768은 getPageHorizontalPaddingPx 구간이 같으므로(둘 다 640↑1024미만 = 24) 차이는
    // 폭 1px과 레일 폭뿐이다.
    expect(beforePx - afterPx).toBe(SIDEBAR_RAIL_WIDTH_PX - 1);
  });

  it('가로 padding은 사이드바를 뺀 컨텐츠 폭이 아니라 뷰포트 폭 기준이다', () => {
    // 이건 버그가 아니라 CSS와 일치하는 동작이다 — PAGE_CONTAINER_CLASS의 sm:px-6은 window 폭
    // media query라, 컨테이너가 696px로 좁아져도 window가 768이면 실제로 24px가 적용된다.
    // 768 - 72(레일) = 696, 696 - 2*24(padding) - 2*28(gutter) = 592.
    expect(getFeedGridAreaWidthPx(768, SIDEBAR_RAIL_WIDTH_PX)).toBe(592);
  });

  it('레일 덕분에 768에서도 3열 카드가 가독성 하한을 넘는다', () => {
    // 240px 사이드바였다면 가용폭이 424px로 떨어져 카드가 크게 작아졌을 구간이다.
    const viewport = VIEWPORTS.find((item) => item.name === 'mdlg 768x1024 세로');
    expect(viewport).toBeDefined();
    const { columns, dims } = layoutFor(viewport!);
    expect(columns).toBe(3);
    expect(dims.cardWidth).toBeGreaterThanOrEqual(FEED_ROWS_MIN_CARD_WIDTH_PX);
  });
});

describe('세로 예산과 네비게이션 배치', () => {
  it('사이드바 구간(mdlg·xl)은 실측 전에도 nav 높이를 빼지 않는다', () => {
    const measured = { navChromeHeightPx: null, titleHeightPx: null };
    // mdlg와 xl의 차이는 이제 페이지 padding·타이틀 gap뿐이다(nav 항은 둘 다 0).
    const mdlgPx = getPageContentBudgetPx(1024, measured, 'mdlg');
    const xlPx = getPageContentBudgetPx(1024, measured, 'xl');
    expect(mdlgPx - xlPx).toBe((24 - 12) * 2 + (32 - 20));
  });

  it('sm은 실측 전 폴백으로 하단 탭바 높이를 뺀다', () => {
    const withFallbackPx = getPageContentBudgetPx(
      812,
      { navChromeHeightPx: null, titleHeightPx: 56 },
      'sm',
    );
    const withMeasuredZeroPx = getPageContentBudgetPx(
      812,
      { navChromeHeightPx: 0, titleHeightPx: 56 },
      'sm',
    );
    expect(withMeasuredZeroPx - withFallbackPx).toBe(BOTTOM_NAV_HEIGHT_PX_FALLBACK);
  });
});

describe('libraryPinsMyShelf', () => {
  it('3열 이상일 때만 내 책장을 첫 칸에 고정한다', () => {
    expect(libraryPinsMyShelf(1)).toBe(false);
    expect(libraryPinsMyShelf(2)).toBe(false);
    expect(libraryPinsMyShelf(3)).toBe(true);
  });

  it('기존 tier별 동작이 그대로 보존된다', () => {
    // 330 이전에는 호출부가 tier === 'xl'로 판단했다. 열 수로 바꿔도 결과가 같아야 한다.
    expect(libraryPinsMyShelf(LIBRARY_COLUMNS_BY_TIER.sm)).toBe(false);
    expect(libraryPinsMyShelf(LIBRARY_COLUMNS_BY_TIER.mdlg)).toBe(false);
    expect(libraryPinsMyShelf(LIBRARY_COLUMNS_BY_TIER.xl)).toBe(true);
  });
});
