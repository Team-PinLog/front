/**
 * 앱 셸 크롬(네비게이션)이 화면에서 차지하는 자리.
 *
 * 왜 shelfCabinetLayout.ts가 아니라 별도 파일인가 — 그 파일은 스스로 범위를 "Feed·Library 캐비닛의
 * 반응형 규칙"으로 못박고 있는데, 셸 크롬은 그보다 넓은 개념이고 AppLayout도 소비자다.
 *
 * 330 이전에는 `tier === 'xl'` 하나가 세 가지 다른 뜻으로 쓰였다 — ①"사이드바가 가로를 먹는가"
 * ②"네비게이션이 세로를 먹는가" ③"3열 배치인가". 사이드바가 md로 내려오면서 셋이 갈라졌다.
 * 이 파일은 그중 ①②를 맡고, ③은 열 수 개념이라 shelfCabinetLayout.ts에 남는다.
 *
 * 개념을 JSX 인라인 조건이 아니라 순수 함수로 두는 것 자체가 테스트 전략이다 — 이 프로젝트는
 * @testing-library가 없어 렌더 테스트를 못 하므로, 여기 담긴 것만 자동 검증된다.
 */

import type { ShelfWidthTier } from './useShelfBreakpoint';

/** 네비게이션이 놓이는 자리. 'bottom'만 세로 공간을 먹는다. */
export type NavPlacement = 'bottom' | 'side';

/**
 * sm(<768)은 떠 있는 하단 탭바, md 이상은 셸 네비가 없다.
 *
 * 414 전에는 md 이상이 좌측 사이드바였다. 그것이 사라진 지금 'side'가 뜻하는 것은 "가로에
 * 무언가 서 있다"가 아니라 **"세로를 먹지 않는다"** 하나다 — 이 함수의 유일한 소비자
 * (shelfCabinetLayout의 세로 예산)가 처음부터 그 뜻으로만 읽어 왔다. 이름을 바꾸지 않는 이유는
 * 'bottom'이라는 반대편 값이 여전히 정확하기 때문이고, 그 경계값(768)도 그대로 Tailwind `md:`다.
 */
export function getNavPlacement(tier: ShelfWidthTier): NavPlacement {
  return tier === 'sm' ? 'bottom' : 'side';
}

/**
 * 좌측 네비게이션 크롬이 가로에서 **예약하는 폭**(px). 본문(`<main>`)의 왼쪽 padding이 이 값에서
 * 나오고, Feed 캐비닛·나의 책장의 가로 예산도 이 값을 그대로 뺀다.
 *
 * ⚠️ 414부터 **모든 구간에서 0이다.** 좌측 네비가 통째로 사라졌기 때문이다(330 레일 → 394
 * 플로팅 카드 → 414 폐기). 화면 이동은 각 지면이 자기 위에 인쇄하는 조판 링크
 * (shared/ui/PaperCornerNav)와 sm 하단 탭바가 맡고, 둘 다 가로를 예약하지 않는다 —
 * 조판 링크는 지면 위에 얹히고 탭바는 세로만 먹는다.
 *
 * 그런데도 **함수를 지우지 않는 이유**: "본문 왼쪽에 무엇이 얼마를 예약하는가"는 여전히 셸의
 * 개념이고, 지금 답이 0일 뿐이다. 호출부(FeedList, shelfCabinetLayout 계산, 그 테스트들)가
 * 이 물음을 함수로 물어보는 형태를 유지하면, 나중에 좌측에 무언가 다시 서더라도 값 한 곳만
 * 바뀐다. 시그니처를 지우면 그 지식이 호출부마다 리터럴 0으로 흩어진다.
 */
export function getSidebarWidthPx(tier: ShelfWidthTier): number {
  return SIDEBAR_WIDTH_PX_BY_TIER[tier];
}

/**
 * 구간별 예약 폭. 414 전에는 sm 0 / mdlg 72 / xl 240이었고, 지금은 셋 다 0이다.
 * 분기(`tier === 'xl' ? … : …`)가 아니라 표로 두는 이유 — 값이 전부 같아진 지금도 "구간마다 답이
 * 있다"는 구조를 남겨야, 좌측에 무언가 다시 설 때 함수 본문이 아니라 이 표 한 곳만 바뀐다.
 */
const SIDEBAR_WIDTH_PX_BY_TIER: Record<ShelfWidthTier, number> = { sm: 0, mdlg: 0, xl: 0 };

/**
 * ⚠️ 414: 좌측 네비가 사라져 **둘 다 0**이 됐다(각각 72·240이었다).
 * 쌍이던 AppLayout `<main>`의 `md:pl-[5.5rem]`·`xl:pl-[16.5rem]`도 함께 지웠다.
 * 지금은 shelfCabinetLayout.test.ts가 "예약 폭이 0이다"를 못박는 데만 쓰인다 —
 * 소비자가 그 테스트뿐이므로, 좌측에 아무것도 서지 않는 것이 확정되면 후속에서 정리한다.
 */
export const SIDEBAR_RAIL_WIDTH_PX = 0;
/** 위와 같다(414 전 240px). */
export const SIDEBAR_WIDE_WIDTH_PX = 0;

/**
 * 화면 왼쪽 끝에서 좌측 네비의 오른쪽 끝까지의 거리(px). "여기까지는 불투명한 크롬이 덮고
 * 있다"는 한 줄짜리 사실이고, 풀블리드 지도가 그만큼을 피해 중심을 잡는 데 쓰였다
 * (RecordMapView의 leftObstructionEdgeXPx).
 *
 * ⚠️ 414: 덮는 것이 없어져 **항상 0이다.** 위 getSidebarWidthPx와 뜻이 다르다는 점은 그대로다 —
 * 그쪽은 "본문을 얼마나 밀어내는가", 이쪽은 "무엇이 화면을 가리는가"다. 지금은 우연히 둘 다 0이다.
 * 현재 호출부가 없다(410에서 홈이 이 보정을 걷어냈다). 시그니처를 남겨 두는 이유는
 * getSidebarWidthPx와 같다.
 */
export function getNavCardRightEdgePx(tier: ShelfWidthTier): number {
  return NAV_CARD_RIGHT_EDGE_PX_BY_TIER[tier];
}

/** 414 전에는 sm 0 / mdlg 64(8+56) / xl 232(24+208)였다. 카드가 사라져 셋 다 0이다. */
const NAV_CARD_RIGHT_EDGE_PX_BY_TIER: Record<ShelfWidthTier, number> = { sm: 0, mdlg: 0, xl: 0 };

export const BOTTOM_NAV_HEIGHT_PX_FALLBACK = 80;
