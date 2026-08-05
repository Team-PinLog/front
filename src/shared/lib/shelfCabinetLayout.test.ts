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
  getFeedDynamicBudgetPx,
  getFeedGridAreaWidthPx,
  getFeedRowsContentBudgetPx,
  getFeedShelfWidthPx,
  SIDEBAR_WIDTH_PX,
  solveFeedScale,
  type FeedColumnsKey,
} from './shelfCabinetLayout';
import type { ShelfWidthTier } from './useShelfBreakpoint';

// 315: Feed 책장 배치 계산은 순수 함수 네 개(getFeedDynamicBudgetPx → getFeedRowsContentBudgetPx →
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
  { name: 'mdlg 768x1024 세로', width: 768, height: 1024, tier: 'mdlg', isLandscape: false },
  { name: 'sm 430x932', width: 430, height: 932, tier: 'sm', isLandscape: false },
  { name: 'sm 375x812', width: 375, height: 812, tier: 'sm', isLandscape: false },
  { name: 'sm 375x667', width: 375, height: 667, tier: 'sm', isLandscape: false },
  { name: 'sm 320x568(최소 폭)', width: 320, height: 568, tier: 'sm', isLandscape: false },
];

// FeedList가 매 렌더 수행하는 계산과 정확히 같은 순서로 배치를 만든다 — 어느 한 단계라도 순서가
// 달라지면(예: 여백 차감을 빠뜨리면) 이 테스트는 실제 화면과 다른 것을 검증하게 된다.
function layoutFor(viewport: Viewport, measured = { navHeightPx: 0, titleHeightPx: 56 }) {
  const columnsKey: FeedColumnsKey = getFeedColumnsKey(viewport.tier, viewport.isLandscape);
  const columns = FEED_COLUMNS_BY_KEY[columnsKey];
  const budgetPx = getFeedDynamicBudgetPx(
    viewport.height,
    {
      navHeightPx: viewport.tier === 'xl' ? 0 : measured.navHeightPx,
      titleHeightPx: measured.titleHeightPx,
    },
    viewport.tier,
  );
  const contentBudgetPx = getFeedRowsContentBudgetPx(budgetPx);
  const availableGridWidthPx = getFeedGridAreaWidthPx(
    viewport.width,
    viewport.tier === 'xl' ? SIDEBAR_WIDTH_PX : 0,
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
      const budgetPx = getFeedDynamicBudgetPx(
        viewport.height,
        { navHeightPx: null, titleHeightPx: null },
        viewport.tier,
      );
      const { usedHeightPx } = layoutFor(viewport, { navHeightPx: 56, titleHeightPx: 56 });
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
