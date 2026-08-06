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
 * sm(<768)은 하단 고정 탭바, md 이상은 좌측 사이드바.
 *
 * 태블릿(mdlg)을 데스크탑과 같은 사이드바로 보내는 것이 330의 제품 결정이다. tier 경계값(768)이
 * 그대로 Tailwind `md:`라서 새 breakpoint도 새 tier 값도 필요 없다.
 */
export function getNavPlacement(tier: ShelfWidthTier): NavPlacement {
  return tier === 'sm' ? 'bottom' : 'side';
}

/**
 * 좌측 사이드바가 가로에서 차지하는 폭(px). AppLayout <aside>의 Tailwind 리터럴
 * (`w-[4.5rem] xl:w-60`)과 반드시 함께 움직인다 — 클래스 문자열엔 JS 상수를 주입할 수 없다.
 *
 * mdlg를 72px 아이콘 레일로 두는 이유: 240px을 그대로 쓰면 768px에서 Feed 그리드 가용폭이
 * 592 → 424px로 떨어져 3열 카드가 26% 작아지고, 나의 책장은 열 내부 폭이 166px까지 줄어 5권 행에
 * 가로 스크롤이 생긴다. 72px이면 두 문제가 모두 사라지면서 사이드바 일관성은 지킬 수 있다.
 */
export function getSidebarWidthPx(tier: ShelfWidthTier): number {
  if (tier === 'sm') {
    return 0;
  }
  return tier === 'xl' ? SIDEBAR_WIDE_WIDTH_PX : SIDEBAR_RAIL_WIDTH_PX;
}

/** 아이콘만 있는 좁은 레일(md~lg). AppLayout <aside>의 `w-[4.5rem]`과 쌍. */
export const SIDEBAR_RAIL_WIDTH_PX = 72;
/** 라벨까지 있는 넓은 사이드바(xl). AppLayout <aside>의 `xl:w-60`과 쌍. */
export const SIDEBAR_WIDE_WIDTH_PX = 240;

/**
 * 떠 있는 하단 탭바가 세로에서 차지하는 높이의 근사치(알약 + 위아래 여백 = 80px).
 * **실측 전 첫 프레임에만** 쓴다 — 실제 값은 AppLayout이 탭바 래퍼를 ResizeObserver로 재서
 * LayoutMetricsContext로 흘려보낸다. AppLayout <main>의 하단 padding(5rem + 인셋)과 짝이다.
 *
 * safe-area를 여기에 더하지 않는 것이 중요하다. 탭바 래퍼 자신이 인셋을 padding으로 갖고 있어
 * border-box 높이에 포함돼 실측값에 자동으로 들어온다 — JS 상수로 복제하면 기기마다 다른 값을
 * 맞출 방법이 없다.
 */
export const BOTTOM_NAV_HEIGHT_PX_FALLBACK = 80;
