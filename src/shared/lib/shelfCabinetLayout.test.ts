import { describe, expect, it } from 'vitest';
import {
  decideFeedRows,
  FEED_CARD_RATIO,
  FEED_CARD_REF_HEIGHT,
  FEED_COLUMNS_BY_KEY,
  FEED_MAX_ROWS_BY_KEY,
  FEED_PLANK_SHADOW_BLEED_PX,
  FEED_ROWS_MIN_CARD_WIDTH_PX,
  FEED_ROWS_PADDING_X_PX,
  FEED_SIDE_GUTTER_PX,
  getFeedCardDimensions,
  getFeedColumnsKey,
  getPageContainerWidthPx,
  PAGE_INSET_PX_BY_TIER,
  getPageContentBudgetPx,
  getFeedGridAreaWidthPx,
  getFeedRowsContentBudgetPx,
  getFeedShelfWidthPx,
  getLibraryCabinetHeightPx,
  getLibraryPageCount,
  getLibraryPageSlots,
  getLibraryPagingFirstColumn,
  getLibraryTierHeightPx,
  getLibraryVisibleRowCount,
  getShelfScale,
  libraryPinsMyShelf,
  LIBRARY_CABINET_CHROME_PX,
  LIBRARY_CABINET_SIDE_CHROME_PX,
  LIBRARY_COLUMNS_BY_TIER,
  LIBRARY_MAX_ROW_COUNT,
  LIBRARY_MIN_ROW_COUNT,
  LIBRARY_PAGE_INDICATOR_BLOCK_PX,
  SHELF_COLUMN_GAP_PX,
  SHELF_SCROLL_MIN_H_PX,
  SHELF_SCALE_MAX,
  SHELF_SCALE_MAX_VW_PX,
  SHELF_SCALE_MIN,
  SHELF_SCALE_MIN_VW_PX,
  SHELF_TIER_GAP_PX,
  solveFeedScale,
  type FeedColumnsKey,
} from './shelfCabinetLayout';
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
  // 328의 육안 확인 폭(375·768·1280·1920) 중 1920만 빠져 있었다.
  { name: 'xl 1920x1080', width: 1920, height: 1080, tier: 'xl', isLandscape: true },
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
function layoutFor(viewport: Viewport, measured = { titleHeightPx: 56 }) {
  const columnsKey: FeedColumnsKey = getFeedColumnsKey(viewport.tier, viewport.isLandscape);
  const columns = FEED_COLUMNS_BY_KEY[columnsKey];
  const budgetPx = getPageContentBudgetPx(
    viewport.height,
    { titleHeightPx: measured.titleHeightPx },
    viewport.tier,
  );
  const contentBudgetPx = getFeedRowsContentBudgetPx(budgetPx);
  const availableGridWidthPx = getFeedGridAreaWidthPx(viewport.width);
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
    pageContainerWidthPx: getPageContainerWidthPx(viewport.width),
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

    it('선반 덩어리가 페이지 컨테이너 안에 들어간다(가로 스크롤바가 생기지 않는다)', () => {
      const { columns, dims, pageContainerWidthPx } = layoutFor(viewport);
      const shelfWidthPx = getFeedShelfWidthPx(columns, dims.cardWidth, dims.gridGap);
      // 328: 이전엔 "가용폭 + gutter 2개"와 비교했는데, 그건 getFeedGridAreaWidthPx의 식을 그대로
      // 되짚는 검증이라 그 식이 무엇을 빼든 항상 참이었다(그림자 여백을 빼먹은 상태에서도 통과했다).
      // FeedList가 실제로 mx-auto로 얹는 박스는 이 선반 덩어리이고, 그게 넘치면 안 되는 대상은
      // PAGE_CONTAINER_CLASS가 만드는 컨테이너 폭이다 — 독립적으로 계산된 그 값과 직접 비교한다.
      expect(shelfWidthPx).toBeLessThanOrEqual(pageContainerWidthPx);
    });

    // 328: 선반 판 그림자(0 10px 16px)는 판 좌우로 8px씩 번지는데, 행 스크롤 박스의
    // overflow-y-auto가 가로도 함께 클리핑해 그 8px이 잘려 나갔다. 스크롤 박스 좌우 padding으로
    // 자리를 확보하되, 그 폭이 카드 예산을 침범하면 컨테이너를 넘어 가로 스크롤바가 생긴다.
    it('선반 판 좌우 그림자가 스크롤 박스 안에 들어갈 자리를 갖는다', () => {
      const { columns, dims } = layoutFor(viewport);
      const shelfWidthPx = getFeedShelfWidthPx(columns, dims.cardWidth, dims.gridGap);
      // 스크롤 박스 안쪽(= 선반 판) 폭 = 바깥 폭 - 좌우 padding.
      const plankWidthPx = shelfWidthPx - 2 * FEED_ROWS_PADDING_X_PX;
      // 판 좌우로 번지는 그림자까지 포함한 폭이 스크롤 박스 바깥 치수 안에 머물러야 잘리지 않는다.
      expect(plankWidthPx + 2 * FEED_PLANK_SHADOW_BLEED_PX).toBeLessThanOrEqual(shelfWidthPx);
      // 그리고 판은 여전히 책 줄보다 좌우 gutter만큼 넓어야 한다(시안의 오버행 — 314).
      const bookRowWidthPx = columns * dims.cardWidth + (columns - 1) * dims.gridGap;
      expect(plankWidthPx - bookRowWidthPx).toBe(2 * FEED_SIDE_GUTTER_PX);
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
  it('타이틀 높이 실측 전(폴백) 프레임에서도 예산을 넘지 않는다', () => {
    for (const viewport of VIEWPORTS) {
      const budgetPx = getPageContentBudgetPx(
        viewport.height,
        { titleHeightPx: null },
        viewport.tier,
      );
      // 폴백 프레임의 자기 일관성을 본다 — 예산도 레이아웃도 같은 폴백 값을 쓴다.
      const { usedHeightPx } = layoutFor(viewport, { titleHeightPx: 56 });
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
    const budgetPx = getPageContentBudgetPx(h, { titleHeightPx: 56 }, tier);
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

  // 329: 좌우 페이지 버튼 오버레이가 캐비닛 본문 영역을 그리드로 재현할 때 이 두 값을 쓴다
  // (LibraryPage). 어긋나면 "내 책장 | 첫 팔로우 책장" 경계에 놓아야 할 이전 버튼이 엉뚱한 곳에
  // 선다 — 렌더 테스트가 불가능하므로 상수 관계만이라도 고정한다.
  it('캐비닛 chrome의 한 변 값은 양쪽 합의 절반이다', () => {
    expect(LIBRARY_CABINET_SIDE_CHROME_PX * 2).toBe(LIBRARY_CABINET_CHROME_PX);
    // Shelf.tsx ShelfCabinet의 border-[10px] + 본문 p-2.5(10px) = 한 변 20px.
    expect(LIBRARY_CABINET_SIDE_CHROME_PX).toBe(20);
  });

  it('열 사이 gap은 shelfSpine 287-13 계산이 전제하는 20px이다', () => {
    // 이 값이 바뀌면 칸 트랙 폭이 바뀌어 행 수용량(getRowCapacity) 산식도 함께 손봐야 한다.
    expect(SHELF_COLUMN_GAP_PX).toBe(20);
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

describe('768 경계에서의 가로 예산', () => {
  // 767(sm) → 768(mdlg)로 넘어가는 순간 가용폭이 떨어진다. 의도된 불연속이라 값 자체를 못박아 둔다.
  // 네비게이션 바 삭제 이후 이 경계에서 생기는 것은 **페이지 좌우 여백 하나뿐**이다(sm은 0).
  // 예전에는 사이드바 레일(72px)이 함께 생겨 낙차가 훨씬 컸다.
  it('페이지 좌우 여백이 생기는 만큼 가용폭이 줄어든다', () => {
    const beforePx = getFeedGridAreaWidthPx(767);
    const afterPx = getFeedGridAreaWidthPx(768);
    // 767과 768은 getPageHorizontalPaddingPx 구간이 같으므로(둘 다 640↑1024미만 = 24) 차이는
    // 폭 1px과 페이지 좌우 여백뿐이다.
    expect(beforePx - afterPx).toBe(2 * PAGE_INSET_PX_BY_TIER.mdlg.x - 1);
  });

  it('가로 padding은 컨텐츠 폭이 아니라 뷰포트 폭 기준이다', () => {
    // 이건 버그가 아니라 CSS와 일치하는 동작이다 — PAGE_CONTAINER_CLASS의 sm:px-6은 window 폭
    // media query라, 컨테이너가 좁아져도 window가 768이면 실제로 24px가 적용된다.
    // 768 - 2*16(페이지 여백) = 736, 736 - 2*24(padding) = 688.
    expect(getPageContainerWidthPx(768)).toBe(688);
    // 328: 그 컨테이너에서 좌우 gutter(28)와 선반 판 그림자 자리(8)를 더 뺀 값이 카드 예산이다.
    // 688 - 2*28 - 2*8 = 616.
    expect(getFeedGridAreaWidthPx(768)).toBe(616);
  });

  it('768에서도 3열 카드가 가독성 하한을 넘는다', () => {
    const viewport = VIEWPORTS.find((item) => item.name === 'mdlg 768x1024 세로');
    expect(viewport).toBeDefined();
    const { columns, dims } = layoutFor(viewport!);
    expect(columns).toBe(3);
    expect(dims.cardWidth).toBeGreaterThanOrEqual(FEED_ROWS_MIN_CARD_WIDTH_PX);
  });
});

// --- 328: 선반 판 그림자 여백 ↔ 가로 예산 --------------------------------------------------------
describe('선반 판 그림자 여백', () => {
  it('스크롤 박스 좌우 padding이 그림자 번짐 폭 이상이다', () => {
    // 이보다 작으면 확보한 여백을 넘어 그림자가 다시 잘린다. 328 2차에서 그림자가 box-shadow에서
    // 좌우 페이드 마스크 레이어로 바뀌었지만 번짐 폭은 그대로다 — 그 레이어를 판보다 좌우로 정확히
    // 이만큼 넓게 잡아 그림자가 판 끝을 조금 넘어가며 사라지게 했다(Shelf.tsx ShelfPlank).
    expect(FEED_ROWS_PADDING_X_PX).toBeGreaterThanOrEqual(FEED_PLANK_SHADOW_BLEED_PX);
  });

  it('확보한 여백이 카드 가로 예산에서 차감돼 있다', () => {
    // 차감을 빠뜨리면 여백이 그대로 카드 폭을 침범해 선반 덩어리가 컨테이너를 넘는다(가로 스크롤바).
    for (const viewport of VIEWPORTS) {
      expect(getFeedGridAreaWidthPx(viewport.width)).toBe(
        getPageContainerWidthPx(viewport.width) -
          2 * (FEED_SIDE_GUTTER_PX + FEED_ROWS_PADDING_X_PX),
      );
    }
  });

  it('선반 덩어리 폭에는 같은 여백이 다시 더해진다', () => {
    // 카드 예산에서 빼기만 하고 바깥 박스에 더하지 않으면 판이 그 폭만큼 좁아진다.
    const columns = 5;
    const cardWidthPx = 180;
    const gridGapPx = 24;
    expect(getFeedShelfWidthPx(columns, cardWidthPx, gridGapPx)).toBe(
      columns * cardWidthPx +
        (columns - 1) * gridGapPx +
        2 * (FEED_SIDE_GUTTER_PX + FEED_ROWS_PADDING_X_PX),
    );
  });
});

describe('세로 예산과 네비게이션 배치', () => {
  it('사이드바 구간(mdlg·xl)은 실측 전에도 nav 높이를 빼지 않는다', () => {
    const measured = { navChromeHeightPx: null, titleHeightPx: null };
    // mdlg와 xl의 차이는 셸 상하 여백·페이지 padding·타이틀 gap뿐이다(nav 항은 둘 다 0).
    // 364: 페이지 상하 여백 항이 추가됐다(mdlg 16 / xl 24).
    const mdlgPx = getPageContentBudgetPx(1024, measured, 'mdlg');
    const xlPx = getPageContentBudgetPx(1024, measured, 'xl');
    expect(mdlgPx - xlPx).toBe(
      (PAGE_INSET_PX_BY_TIER.xl.y - PAGE_INSET_PX_BY_TIER.mdlg.y) * 2 + (24 - 12) * 2 + (32 - 20),
    );
  });

  it('페이지 상하 여백은 tier마다 다르게 빠진다', () => {
    // 네비게이션 바 삭제: 예전에 여기 있던 "sm은 폴백으로 하단 탭바 높이를 뺀다" 검증은 근거가
    // 사라졌다(뺄 탭바가 없다). 남는 tier 의존 항은 페이지 여백·padding·타이틀 gap 셋이다.
    expect(getPageContentBudgetPx(1024, { titleHeightPx: 56 }, 'sm')).toBeGreaterThan(
      getPageContentBudgetPx(1024, { titleHeightPx: 56 }, 'xl'),
    );
  });
});

// --- 329: 페이징 규칙 ↔ 페이지 인디케이터 --------------------------------------------------------
// getLibraryPageSlots(어떤 책장을 보여줄지)와 getLibraryPageCount(전체 몇 장인지)는 같은 규칙의 두
// 얼굴이다. 한쪽만 고치면 캐비닛 아래 점 개수가 실제 페이지와 어긋난다 — 렌더 테스트가 불가능하므로
// 두 함수를 서로 맞물려 검증한다.
describe('Library 페이징', () => {
  const follows = (count: number) => Array.from({ length: count }, (_, index) => index);

  describe('getLibraryPageCount', () => {
    it('3열(내 책장 고정)은 팔로우만 2개씩 나눠 담는다', () => {
      expect(getLibraryPageCount(0, 3)).toBe(1); // 팔로우가 없어도 내 책장 1페이지는 있다
      expect(getLibraryPageCount(1, 3)).toBe(1);
      expect(getLibraryPageCount(2, 3)).toBe(1);
      expect(getLibraryPageCount(3, 3)).toBe(2);
      expect(getLibraryPageCount(4, 3)).toBe(2);
      expect(getLibraryPageCount(5, 3)).toBe(3);
    });

    it('2열은 0페이지가 내 책장+팔로우 1개, 그 뒤로 2개씩이다', () => {
      expect(getLibraryPageCount(0, 2)).toBe(1);
      expect(getLibraryPageCount(1, 2)).toBe(1);
      expect(getLibraryPageCount(2, 2)).toBe(2);
      expect(getLibraryPageCount(3, 2)).toBe(2);
      expect(getLibraryPageCount(4, 2)).toBe(3);
    });

    it('1열은 내 책장 1장 + 팔로우 1장씩이다', () => {
      expect(getLibraryPageCount(0, 1)).toBe(1);
      expect(getLibraryPageCount(1, 1)).toBe(2);
      expect(getLibraryPageCount(3, 1)).toBe(4);
    });
  });

  // 두 함수를 맞물리는 핵심 불변식. 어느 한쪽만 고치면 여기서 깨진다.
  describe('getLibraryPageSlots와 페이지 수가 일치한다', () => {
    const CASES = [1, 2, 3];

    it.each(CASES)(
      '%i열 — 마지막 페이지는 비어 있지 않고, 그 다음 페이지는 비어 있다',
      (columns) => {
        for (let followCount = 0; followCount <= 12; followCount += 1) {
          const all = follows(followCount);
          const pageCount = getLibraryPageCount(followCount, columns);
          const lastPage = getLibraryPageSlots(pageCount - 1, columns, all);
          const overflowPage = getLibraryPageSlots(pageCount, columns, all);

          // 마지막 페이지에는 보여줄 것이 있어야 한다(내 책장이든 팔로우든).
          expect(lastPage.follows.length > 0 || lastPage.showMyShelf).toBe(true);
          // 세어 둔 페이지 수를 넘어가면 더 보여줄 팔로우가 없어야 한다 — 있으면 점을 덜 찍은 것이다.
          expect(overflowPage.follows).toHaveLength(0);
        }
      },
    );

    it.each(CASES)('%i열 — 모든 팔로우가 정확히 한 번씩 등장한다', (columns) => {
      const followCount = 9;
      const all = follows(followCount);
      const pageCount = getLibraryPageCount(followCount, columns);
      const seen = Array.from(
        { length: pageCount },
        (_, page) => getLibraryPageSlots(page, columns, all).follows,
      ).flat();

      expect(seen).toHaveLength(followCount);
      expect(new Set(seen).size).toBe(followCount);
    });
  });

  // 329(디자인 피드백): 좌우 버튼이 감싸는 범위와 인디케이터가 가운데를 잡는 범위가 이 값 하나로
  // 정해진다. 페이징 규칙과 어긋나면 "넘어가지 않는 내 책장"까지 감싸거나 점이 치우쳐 보인다.
  describe('getLibraryPagingFirstColumn', () => {
    it('내 책장이 고정인 구간에서는 2열부터가 넘어가는 구간이다', () => {
      expect(getLibraryPagingFirstColumn(3)).toBe(2);
    });

    it('내 책장도 함께 넘어가는 구간에서는 첫 열부터 전부가 대상이다', () => {
      expect(getLibraryPagingFirstColumn(1)).toBe(1);
      expect(getLibraryPagingFirstColumn(2)).toBe(1);
    });

    it('고정 여부(libraryPinsMyShelf)와 항상 같은 판단을 쓴다', () => {
      for (const columns of [1, 2, 3, 4, 5]) {
        const expected = libraryPinsMyShelf(columns) ? 2 : 1;
        expect(getLibraryPagingFirstColumn(columns)).toBe(expected);
        // 넘어가는 구간은 언제나 열 하나 이상이어야 한다 — 비면 버튼을 걸 자리가 없다.
        expect(columns - getLibraryPagingFirstColumn(columns) + 1).toBeGreaterThanOrEqual(1);
      }
    });
  });

  it('내 책장은 3열 이상에서만 모든 페이지에 고정된다', () => {
    // 고정 구간: 어느 페이지를 펴도 내 책장이 있다.
    expect(getLibraryPageSlots(0, 3, follows(9)).showMyShelf).toBe(true);
    expect(getLibraryPageSlots(3, 3, follows(9)).showMyShelf).toBe(true);
    // 비고정 구간: 0페이지에만 있고 그 뒤에는 없다("시작은 항상 나의 책장").
    expect(getLibraryPageSlots(0, 2, follows(9)).showMyShelf).toBe(true);
    expect(getLibraryPageSlots(1, 2, follows(9)).showMyShelf).toBe(false);
  });
});

// 329: 인디케이터가 세로를 차지하는 만큼 캐비닛이 줄어야 화면 밖으로 밀리지 않는다.
describe('getLibraryCabinetHeightPx', () => {
  it('페이지 예산에서 인디케이터 높이를 뺀다', () => {
    expect(getLibraryCabinetHeightPx(900)).toBe(900 - LIBRARY_PAGE_INDICATOR_BLOCK_PX);
  });

  it('아주 낮은 뷰포트에서도 스크롤 영역 하한 아래로 내려가지 않는다', () => {
    expect(getLibraryCabinetHeightPx(100)).toBe(SHELF_SCROLL_MIN_H_PX);
  });

  it('캐비닛+인디케이터 합이 페이지 예산을 넘지 않는다', () => {
    for (const budgetPx of [400, 600, 800, 1000, 1400]) {
      const usedPx = getLibraryCabinetHeightPx(budgetPx) + LIBRARY_PAGE_INDICATOR_BLOCK_PX;
      // 하한(SHELF_SCROLL_MIN_H_PX)에 걸린 극단적으로 낮은 뷰포트가 아니라면 예산 안에 들어간다.
      if (budgetPx - LIBRARY_PAGE_INDICATOR_BLOCK_PX > SHELF_SCROLL_MIN_H_PX) {
        expect(usedPx).toBeLessThanOrEqual(budgetPx);
      }
    }
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
