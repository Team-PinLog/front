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
 * 좌측 네비게이션 크롬이 가로에서 **예약하는 폭**(px). 본문(<main>)의 왼쪽 padding이 이 값에서
 * 나오고, Feed 캐비닛·나의 책장의 가로 예산도 이 값을 그대로 뺀다.
 *
 * 394 전에는 이 값이 곧 화면에 꽉 찬 사이드바 레일의 폭이었다. 지금은 레일이 **떠 있는 카드**로
 * 바뀌어 실제로 그려지는 폭(NAV_CARD_*)은 이보다 작지만, **예약 폭은 그대로 둔다** —
 *  ① 카드가 예약 구간 안에 얌전히 들어앉아 홈 이외의 화면은 배치가 1px도 바뀌지 않고,
 *  ② 이 값에 물려 있는 캐비닛 계산(shelfCabinetLayout.ts)과 그 테스트가 그대로 유효하다.
 * 즉 394는 "무엇이 그 자리를 차지하는가"만 바꿨고 "얼마를 비워 두는가"는 건드리지 않는다.
 *
 * mdlg를 72px로 두는 이유: 240px을 그대로 쓰면 768px에서 Feed 그리드 가용폭이 592 → 424px로
 * 떨어져 3열 카드가 26% 작아지고, 나의 책장은 열 내부 폭이 166px까지 줄어 5권 행에 가로 스크롤이
 * 생긴다. 72px이면 두 문제가 모두 사라지면서 좌측 네비 일관성은 지킬 수 있다.
 */
export function getSidebarWidthPx(tier: ShelfWidthTier): number {
  if (tier === 'sm') {
    return 0;
  }
  return tier === 'xl' ? SIDEBAR_WIDE_WIDTH_PX : SIDEBAR_RAIL_WIDTH_PX;
}

/** 좁은 구간(md~lg)이 좌측 네비에 예약하는 폭. AppLayout <main>의 `md:pl-[5.5rem]`(72+16)과 쌍. */
export const SIDEBAR_RAIL_WIDTH_PX = 72;
/** 넓은 구간(xl)이 좌측 네비에 예약하는 폭. AppLayout <main>의 `xl:pl-[16.5rem]`(240+24)과 쌍. */
export const SIDEBAR_WIDE_WIDTH_PX = 240;

/**
 * 394: 좌상단에 떠 있는 네비게이션 카드가 **실제로 차지하는 자리**.
 *
 * 위 예약 폭과 뜻이 다르다 — 예약 폭은 "본문을 얼마나 밀어낼까"이고, 이쪽은 "화면 어디에 불투명한
 * 카드가 떠 있나"다. 홈처럼 본문이 예약 구간 아래까지 풀블리드로 깔리는 화면은 후자를 알아야
 * 지도가 카드에 가리는 만큼을 보정할 수 있다(getNavCardRightEdgePx).
 *
 * ⚠️ 값은 AppLayout <aside>의 Tailwind 리터럴과 쌍둥이다(클래스 문자열엔 JS 상수를 주입할 수 없다):
 *   left-2(8px) / xl:left-6(24px), w-14(56px) / xl:w-52(208px), hover 시 w-52.
 * 접힌 폭 + 좌측 여백이 예약 폭 안에 들어가는 것이 이 값들의 유일한 제약이다
 * (8+56=64 ≤ 72, 24+208=232 ≤ 240).
 */
export const NAV_CARD_INSET_PX = { mdlg: 8, xl: 24 } as const;
/** 평소(접힘) 카드 폭. md~lg는 아이콘만, xl은 라벨까지 보이는 폭이다. */
export const NAV_CARD_WIDTH_PX = { mdlg: 56, xl: 208 } as const;

/**
 * 화면 왼쪽 끝에서 네비 카드의 오른쪽 끝까지의 거리(px). "여기까지는 불투명한 카드가 덮고 있다"는
 * 한 줄짜리 사실이다.
 *
 * **호버로 펼쳐진 폭이 아니라 접힌 폭**을 쓴다. 펼침은 마우스를 올린 동안만이고 그때마다 지도가
 * 다시 맞춰지면 화면이 출렁인다 — 예약 폭을 접힌 값으로 고정한 것(330)과 같은 판단이다.
 * sm은 카드가 없다(하단 탭바가 대신한다).
 */
export function getNavCardRightEdgePx(tier: ShelfWidthTier): number {
  if (tier === 'sm') {
    return 0;
  }
  const key = tier === 'xl' ? 'xl' : 'mdlg';
  return NAV_CARD_INSET_PX[key] + NAV_CARD_WIDTH_PX[key];
}

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
