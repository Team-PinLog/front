import { describe, expect, it } from 'vitest';
import { getCollectionAccentColor } from '@/shared/lib/getCollectionAccentColor';
import {
  FEED_COLUMNS_BY_KEY,
  FEED_MAX_ROWS_BY_KEY,
  decideFeedRows,
  getFeedCardDimensions,
  getFeedColumnsKey,
  getFeedGridAreaWidthPx,
  getFeedRowsContentBudgetPx,
  getPageContentBudgetPx,
  solveFeedScale,
} from '@/shared/lib/shelfCabinetLayout';
import type { ShelfWidthTier } from '@/shared/lib/useShelfBreakpoint';
import {
  COLLECTION_COVER_VARIANTS,
  COVER_COMPACT_WIDTH_PX,
  getCollectionCoverSlots,
  getCollectionCoverVariant,
  isCompactCoverWidth,
} from './collectionCoverVariant';

// 실제 collectionId는 생성 순서를 따르는 연속 정수다 — 무작위 정수가 아니라 이 분포로 검증해야
// 화면에서 실제로 보이는 결과를 검증하는 것이 된다(hashPaletteIndex 상단 주석과 같은 이유).
const SEQUENTIAL_IDS = Array.from({ length: 600 }, (_, index) => index + 1);

describe('getCollectionCoverVariant', () => {
  it('같은 collectionId는 항상 같은 판형을 준다', () => {
    for (const id of SEQUENTIAL_IDS.slice(0, 50)) {
      const first = getCollectionCoverVariant(id);
      expect(getCollectionCoverVariant(id)).toBe(first);
      expect(getCollectionCoverVariant(id)).toBe(first);
    }
  });

  it('정의된 판형만 반환한다', () => {
    for (const id of SEQUENTIAL_IDS) {
      expect(COLLECTION_COVER_VARIANTS).toContain(getCollectionCoverVariant(id));
    }
  });

  it('5종이 모두 나오고 특정 종에 편중되지 않는다', () => {
    const counts = new Map<string, number>();
    for (const id of SEQUENTIAL_IDS) {
      const variant = getCollectionCoverVariant(id);
      counts.set(variant, (counts.get(variant) ?? 0) + 1);
    }

    expect(counts.size).toBe(COLLECTION_COVER_VARIANTS.length);

    // 균등하면 각 120건. 편중 판정은 ±40%로 느슨하게 둔다 — 해시의 통계적 균등성을 재는 게 아니라
    // "한 판형이 서가를 뒤덮거나 아예 안 보이는" 수준의 쏠림만 걸러내는 것이 목적이다.
    const expected = SEQUENTIAL_IDS.length / COLLECTION_COVER_VARIANTS.length;
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(expected * 0.6);
      expect(count).toBeLessThan(expected * 1.4);
    }
  });

  it('연속한 id가 같은 판형으로 비정상적으로 길게 이어지지 않는다', () => {
    // 상한을 7로 둔 근거: 판형이 id마다 독립적으로 균등 배정되면 n개 중 최장 연속 길이는 대략
    // log₅(n)이고(n=600이면 약 4), 8 이상이 나올 확률은 600 / 5⁷ ≈ 0.008로 사실상 없다. 실측값은
    // 4~5다. 즉 이 테스트가 잡으려는 것은 "우연한 연속"이 아니라 해시가 뭉개져 블록 단위로 같은
    // 판형이 쏟아지는 구조적 고장이다.
    // ⚠️ 연속을 3 이하로 "보장"할 수는 없다 — 그러려면 배정이 목록 내 위치에 의존해야 하는데,
    // 그러면 같은 컬렉션이 페이지를 넘길 때마다 다른 표지가 되어 결정론 요구(위 첫 테스트)와
    // 정면으로 충돌한다. Feed 목록 순서도 id 순이 아니라 서버 추천 순서다.
    let run = 1;
    let longestRun = 1;
    for (let i = 1; i < SEQUENTIAL_IDS.length; i += 1) {
      const isSame =
        getCollectionCoverVariant(SEQUENTIAL_IDS[i]) ===
        getCollectionCoverVariant(SEQUENTIAL_IDS[i - 1]);
      run = isSame ? run + 1 : 1;
      longestRun = Math.max(longestRun, run);
    }
    expect(longestRun).toBeLessThanOrEqual(7);
  });

  it('색 팔레트와 판형이 서로 독립이다(해시 접두어 효과)', () => {
    // ⚠️ 이 티켓의 핵심 함정. 접두어 없이 hashPaletteIndex(collectionId, 5)를 쓰면 색(=%10)과
    // 판형(=%5)이 같은 h에서 나오는데 gcd(10,5)=5라 판형이 색에 완전히 종속된다 — (색,판형) 50조합
    // 중 10조합만 나타나고 "같은 색 책은 늘 같은 판형"이 된다. 접두어를 태운 지금은 두 축이
    // 독립이므로 조합이 50개에 가깝게 관측돼야 한다.
    const pairs = new Set<string>();
    for (const id of SEQUENTIAL_IDS) {
      pairs.add(`${getCollectionAccentColor(id)}|${getCollectionCoverVariant(id)}`);
    }
    expect(pairs.size).toBeGreaterThan(40);
  });
});

// 331: "탐색 화면에서 표지에 Keyword가 안 보인다"의 원인 후보 중 하나가 축약 모드였다 — 카드 폭이
// COVER_COMPACT_WIDTH_PX 미만이면 getCollectionCoverSlots가 카테고리·부제를 **의도적으로** 버린다.
// 카드 폭은 뷰포트에서 순수 함수 합성으로 나오므로(FeedList가 이 결과를 그대로 style에 쓴다) 그
// 후보의 진위는 브라우저 없이 여기서 판정할 수 있고, 328에서 폭 계산이 바뀐 뒤에도 결론이 유지되는지
// 이 테스트가 계속 감시한다. 결론: PC 구간에서는 축약이 걸리지 않는다 — 즉 PC에서 Keyword가 안
// 보인다면 원인은 카드 폭이 아니라 응답의 keywords가 비었거나(정상 상태다) 판형 쪽이다.
interface CardWidthCase {
  name: string;
  width: number;
  height: number;
  tier: ShelfWidthTier;
  isLandscape: boolean;
}

// FeedList가 매 렌더 수행하는 계산과 같은 순서다(shelfCabinetLayout.test.ts의 layoutFor와 같은 합성).
function cardWidthFor({ width, height, tier, isLandscape }: CardWidthCase): number {
  const columnsKey = getFeedColumnsKey(tier, isLandscape);
  const columns = FEED_COLUMNS_BY_KEY[columnsKey];
  const contentBudgetPx = getFeedRowsContentBudgetPx(
    getPageContentBudgetPx(
      height,
      // 실측 전 폴백이 아니라 실제로 보고되는 값에 가깝게 둔다(하단 탭바는 sm에만 있다).
      { titleHeightPx: 56 },
      tier,
    ),
  );
  const availableGridWidthPx = getFeedGridAreaWidthPx(width);
  const rows = decideFeedRows({
    columns,
    maxRows: FEED_MAX_ROWS_BY_KEY[columnsKey],
    budgetPx: contentBudgetPx,
    availableGridWidthPx,
  });
  const scale = solveFeedScale({ columns, rows, budgetPx: contentBudgetPx, availableGridWidthPx });
  return getFeedCardDimensions(scale).cardWidth;
}

// PinLog는 PC 웹이 기준이다(AGENTS.md) — 이 구간에서 축약이 걸리면 그건 원인이 아니라 버그다.
const PC_CASES: CardWidthCase[] = [
  { name: 'xl 1920x1080', width: 1920, height: 1080, tier: 'xl', isLandscape: true },
  { name: 'xl 1512x982', width: 1512, height: 982, tier: 'xl', isLandscape: true },
  { name: 'xl 1440x900', width: 1440, height: 900, tier: 'xl', isLandscape: true },
  { name: 'xl 1366x768', width: 1366, height: 768, tier: 'xl', isLandscape: true },
  { name: 'xl 1280x720(가장 좁은 xl)', width: 1280, height: 720, tier: 'xl', isLandscape: true },
  { name: 'mdlg 1024x768 가로', width: 1024, height: 768, tier: 'mdlg', isLandscape: true },
  { name: 'mdlg 768x1024 세로', width: 768, height: 1024, tier: 'mdlg', isLandscape: false },
];

describe('표지 축약 판정(Keyword 노출 구간)', () => {
  it('PC 구간에서는 축약이 걸리지 않는다 — 카드 폭이 임계값 위다', () => {
    for (const testCase of PC_CASES) {
      const widthPx = cardWidthFor(testCase);
      expect(widthPx, testCase.name).toBeGreaterThanOrEqual(COVER_COMPACT_WIDTH_PX);
      expect(isCompactCoverWidth(widthPx), testCase.name).toBe(false);
      // 축약이 아니면 keywords가 있는 한 카테고리·부제 슬롯이 반드시 채워진다.
      expect(
        getCollectionCoverSlots('제목', ['카페', '조용한'], isCompactCoverWidth(widthPx)).category,
      ).toBe('카페');
    }
  });

  it('축약은 좁은 휴대폰 폭에서만 일어난다', () => {
    // 424px 근방이 경계다(같은 세로에서 폭만 줄여가며 확인한 값). 그 아래는 카테고리 글자가 6px
    // 밑으로 내려가 읽히지 않으므로 생략이 맞다 — 정상 동작이지 회귀가 아니다.
    expect(
      isCompactCoverWidth(
        cardWidthFor({
          name: 'sm 390x844',
          width: 390,
          height: 844,
          tier: 'sm',
          isLandscape: false,
        }),
      ),
    ).toBe(true);
    expect(
      isCompactCoverWidth(
        cardWidthFor({
          name: 'sm 430x932',
          width: 430,
          height: 932,
          tier: 'sm',
          isLandscape: false,
        }),
      ),
    ).toBe(false);
  });
});

describe('getCollectionCoverSlots', () => {
  it('keywords를 카테고리·부제 순으로 배정한다', () => {
    const slots = getCollectionCoverSlots('비 오는 날 카페', ['비 오는 날', '카페', '혼자'], false);
    expect(slots).toEqual({ title: '비 오는 날 카페', category: '비 오는 날', subtitle: '카페' });
  });

  it('keywords가 빈 배열이어도 제목만으로 성립한다', () => {
    // AI 미완료 상태의 정상 응답이다 — 오류로 처리하지 않는다(architecture.md 5장).
    expect(getCollectionCoverSlots('제목만 있는 컬렉션', [], false)).toEqual({
      title: '제목만 있는 컬렉션',
      category: null,
      subtitle: null,
    });
  });

  it('keywords가 1개면 부제를 비운다', () => {
    expect(getCollectionCoverSlots('한 개', ['카페'], false).subtitle).toBeNull();
  });

  it('축약 모드에서는 카테고리·부제를 모두 버린다', () => {
    expect(getCollectionCoverSlots('좁은 카드', ['카페', '혼자', '독서'], true)).toEqual({
      title: '좁은 카드',
      category: null,
      subtitle: null,
    });
  });
});
