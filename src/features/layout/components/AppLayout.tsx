import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, Outlet } from '@tanstack/react-router';
import { SettingsTriggerContext } from '@/contexts/SettingsTriggerContext';
import { WithdrawConfirmProvider } from '@/contexts/WithdrawConfirmProvider';
import { useWithdrawConfirm } from '@/contexts/useWithdrawConfirm';
import { LayoutMetricsContext } from '@/shared/lib/LayoutMetricsContext';
import { FOCUSABLE_SELECTOR } from '@/shared/lib/focusableSelector';
import { SettingsPanel } from './SettingsPanel';
import { WithdrawConfirmDialog } from './WithdrawConfirmDialog';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

// 책장 메뉴는 /library로 연결한다(144 완료 — 내 책장 + 팔로우 책장 통합 조회).
// /shelf(141, 내 책장 단독 조회)는 남겨두되 진입점으로는 쓰지 않는다.
// 169(설정/프로필)에서 진입점 구성이 바뀌면 이 매핑을 조정한다.
// 330: 이 배열과 아이콘은 sm의 하단 탭바와 md 이상의 좌측 사이드바가 그대로 함께 쓴다 — 새 SVG를
// 만들지 않고 배치만 다른 컨테이너에서 바꾼다.
// 414: md 이상의 좌측 네비(330 레일 → 394 플로팅 카드)가 사라져 이제 소비자는 **sm 하단 탭바
// 하나**다. 배열을 유지하는 이유는 그 탭바가 여전히 세 칸을 그리기 때문이고, md 이상의 이동은
// 각 화면이 지면 위에 얹는 PaperCornerNav가 맡는다.
const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: '홈',
    icon: <path d="M3.5 10.6 12 3.8l8.5 6.8M5.7 9.3v10.2h12.6V9.3M9.5 19.5v-6.2h5v6.2" />,
  },
  {
    to: '/feed',
    label: '탐색',
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z" />
      </>
    ),
  },
  {
    to: '/library',
    label: '책장',
    icon: <path d="M4 5.2h4.3v13.6H4zM8.3 5.2h4.3v13.6H8.3zm6.1.8 4-1 3.1 12.9-4 1zM3 20h18" />,
  },
];

// 330: 설정 기어는 사이드바 하단 버튼과 sm 탭바 4번째 칸이 함께 쓴다. 이전에는 상단 헤더와
// 사이드바에 같은 path가 두 벌 복제돼 있었는데, 탭바가 생기면서 세 벌이 될 참이라 하나로 모았다.
// NAV_ITEMS에 합치지 않는 이유: 설정은 라우트 이동이 아니라 패널을 여는 <button>이라 Link로
// 렌더되면 안 된다.
// 414: 남은 자리는 sm 탭바 4번째 칸뿐이다. md 이상은 PaperCornerNav의 「설정」이 대신한다 —
// 그쪽은 아이콘이 아니라 글자라 이 path를 쓰지 않는다.
const SETTINGS_ICON = (
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </>
);

// 떠 있는 하단 탭바 아이콘. 디자인 피드백으로 한 차례 85% 축소한 값이다(18 → 15).
// 414: 짝이던 SIDEBAR_ICON_SIZE(22)와 카드 조판 상수(NAV_CARD_*)는 카드와 함께 지웠다.
const BOTTOM_NAV_ICON_SIZE = 15;

// 358 후속(디자인 피드백 — "너무 팍 하고 바뀐다"): 설정 등장·퇴장 모션.
// keyframe 본체는 src/index.css에 있다.
// 385: 값(200ms)은 그대로 두고 대상만 바뀌었다 — 서랍 패널이 중앙 모달이 되면서 사이드바 폭
// transition과 맞출 이유는 사라졌지만(모달은 사이드바를 건드리지 않는다), 배경막과는 여전히 같은
// 길이여야 카드와 딤이 따로 노는 것처럼 보이지 않는다.
const SETTINGS_MOTION_MS = 200;

// 조건부 클래스는 문자열을 조립하지 않고 **완성된 리터럴 중 하나를 고른다**(conventions 2장) —
// Tailwind는 소스를 원시 텍스트로 스캔하므로 조립한 클래스는 스캔되지 않아 스타일이 없다.
//
// 퇴장 클래스에 pointer-events-none이 붙는 이유: 닫기 애니메이션이 도는 200ms 동안에도 요소는
// 아직 DOM에 있어서, 없으면 이미 사라져 보이는 배경막이 클릭을 계속 삼킨다.
// motion-reduce 조합: 애니메이션을 끄면 등장은 최종 상태로 즉시 나타나고, 퇴장은 즉시 투명해진다
// (unmount 지연도 아래에서 0으로 만든다).
// 385: pointer-events를 **여기 두 리터럴에만** 둔다. 카드 기본 클래스에 pointer-events-auto를 두고
// 퇴장 클래스에 -none을 얹으면 한 요소에 두 유틸리티가 함께 붙어, 승자가 클래스 나열 순서가 아니라
// Tailwind가 출력한 CSS 규칙 순서로 정해진다(coverParts.tsx가 text-*로 겪은 것과 같은 함정).
// 등장/퇴장 둘 중 하나만 붙으므로 이렇게 나누면 충돌 자체가 없다.
const SETTINGS_MODAL_ENTER_CLASS =
  'pointer-events-auto animate-[settings-modal-in_200ms_ease-out] motion-reduce:animate-none';
const SETTINGS_MODAL_EXIT_CLASS =
  'pointer-events-none animate-[settings-modal-out_200ms_ease-out_forwards] motion-reduce:animate-none motion-reduce:opacity-0';
const SETTINGS_SCRIM_ENTER_CLASS =
  'animate-[settings-scrim-in_200ms_ease-out] motion-reduce:animate-none';
const SETTINGS_SCRIM_EXIT_CLASS =
  'pointer-events-none animate-[settings-scrim-out_200ms_ease-out_forwards] motion-reduce:animate-none motion-reduce:opacity-0';

/**
 * 모션을 줄여 달라는 OS 설정. 퇴장 애니메이션이 없으면 unmount를 기다릴 이유도 없으므로 지연을 0으로
 * 만드는 데 쓴다 — CSS만으로는 "요소를 언제 트리에서 뺄지"를 표현할 수 없다.
 */
function getSettingsUnmountDelayMs(): number {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : SETTINGS_MOTION_MS;
}

/** NAV_ITEMS·설정 버튼이 공유하는 아이콘 렌더. size만 자리마다 다르다. */
function NavIcon({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className="flex-none"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/**
 * 로그인 후 화면 공통 셸. 설정 모달 트리거를 제공한다.
 *
 * 358에서 AppLayout을 Provider 껍데기와 AppShell로 쪼갰다. 설정의 ESC 처리가 "탈퇴 확인
 * 다이얼로그가 떠 있으면 ESC를 양보한다"를 알아야 하는데, 그 상태는 WithdrawConfirmContext에 있고
 * 자기 자신이 심은 Provider의 값은 같은 컴포넌트에서 읽을 수 없기 때문이다.
 */
export function AppLayout() {
  return (
    <WithdrawConfirmProvider>
      <AppShell />
    </WithdrawConfirmProvider>
  );
}

/**
 * 414: **md 이상의 좌측 네비를 완전히 걷어냈다**(사용자 결정 — 394 카드도, 그 앞의 330 레일도).
 * design-ver2 원본 셸이 도달한 지점과 같다: 셸에 남은 책임은 ①화면 높이 계약과 ②설정 패널
 * 뿐이고, 화면 이동은 각 지면이 자기 위에 인쇄하는 조판 링크(shared/ui/PaperCornerNav)가 맡는다.
 *
 * 함께 사라진 것 둘:
 *  · `<main>`의 좌측 예약 padding(md 5.5rem / xl 16.5rem) — appChrome.ts getSidebarWidthPx가
 *    이제 모든 구간에서 0을 돌려준다. 예약이 사라지면 무대 컨테이너 폭 = 뷰포트 폭이 되어,
 *    홈 곁열이 사라지는 경계(컨테이너 1080px)와 코너 링크가 접히는 경계(뷰포트 1081px)의
 *    어긋남도 함께 해소된다(410 보고 관찰 ②, index.css .paper-corner-nav--rails).
 *  · `<main>`의 사방 여백(364의 SHELL_INSET) — 종이 무대가 가장자리까지 가야 한다는 요구다.
 *    ⚠️ 그 결과 shelfCabinetLayout.ts의 SHELL_INSET_PX_BY_TIER·PAGE_MIN_HEIGHT_CLASS는 실제보다
 *    32/48px 더 덜어내는 **보수적인** 값이 됐다(캐비닛이 조금 작아질 뿐 넘치지는 않는다).
 *    그 파일은 이 티켓 범위 밖이라 값 정리는 후속으로 넘긴다.
 *
 * ⚠️ **sm 하단 탭바는 남긴다.** 판단 근거 셋:
 *  ① 조판 링크는 종이 지면 위에 절대 위치로 앉는 요소라 좁은 폭에서 지면 조판과 자리를 다툰다.
 *     반대로 탭바는 이미 "떠 있는 알약"이고 세이프에어리어까지 맞춰져 있다.
 *  ② 이 탭바는 아래 ResizeObserver로 **세로 예산 계약**에 물려 있다(navChromeHeightPx →
 *     LayoutMetricsContext → getPageContentBudgetPx). 지우면 sm의 캐비닛 세로 계산과
 *     PAGE_MIN_HEIGHT_CLASS의 sm 리터럴(5rem)이 함께 흔들리는데, 그 파일이 범위 밖이다.
 *  ③ 홈의 곁열(표지 두 권)은 컨테이너 1080px 미만에서 display:none이라 sm에는 애초에 없다.
 *     탭바까지 지우면 sm에서 이동 수단이 조판 링크 한 줄뿐이 된다.
 *
 * 330: sm(<768)은 하단 고정 탭바(홈·탐색·책장·설정 4칸), md 이상은 좌측 고정 사이드바였다 —
 * 태블릿도 데스크탑과 같은 사이드바를 쓴다. 이전의 상단 고정 헤더는 없앴다. 사이드바는 md~lg에서
 * 아이콘만 있는 72px 레일이고 xl부터 라벨을 포함한 240px로 넓어진다(appChrome.ts의
 * getSidebarWidthPx와 쌍 — 그 값이 Feed 캐비닛 가로 예산에 그대로 들어간다).
 * 같은 NAV_ITEMS·설정 트리거 로직을 두 배치가 함께 쓰고, Tailwind md:hidden/md:flex로 보이는 쪽만
 * CSS로 전환한다(마운트/언마운트 분기 아님). 색상은 tailwind.config.js 브랜드 토큰을 쓴다.
 * 설정 내용(계정 정보·로그아웃·탈퇴)은 162에서 채웠다.
 *
 * 358: 설정은 우측이 아니라 **설정 버튼과 같은 좌측**에서 사이드바에 붙어 열리는 서랍이었다(방식 A).
 * 385: 그 서랍을 **중앙 모달**로 대체했다(사용자 결정). 358이 서랍을 위해 마련했던 장치 —
 * 사이드바를 펼친 채 고정하던 data-settings-open, 사이드바 옆에서 시작하는 가로 슬라이드 —
 * 는 함께 걷어냈다. 중앙 모달은 사이드바와 위치 관계가 없어서 그 고정이 오히려 "딤 위에 사이드바만
 * 떠 있는" 그림을 만든다. 반면 358이 잡아 둔 **동작**(ESC 닫기, 닫을 때 기어로 포커스 복귀, 탈퇴
 * 다이얼로그가 떠 있으면 ESC 양보, reduced-motion)은 하나도 바뀌지 않았고, 385에서 포커스 트랩이
 * 추가됐다.
 */
function AppShell() {
  // 두 상태가 나뉜 이유: isSettingsOpen은 **사용자의 의도**(열려 있어야 하나)이고,
  // isSettingsMounted는 **DOM에 남아 있나**다. 닫는 순간 바로 unmount하면 퇴장 애니메이션이 첫
  // 프레임에 잘려 나가므로, 의도가 먼저 false가 되고 mount는 애니메이션이 끝난 뒤 따라 내려간다.
  // 하나의 사실을 둘로 쪼갠 것이 아니라 서로 다른 두 사실이다.
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsMounted, setIsSettingsMounted] = useState(false);
  const [navChromeHeightPx, setNavChromeHeightPx] = useState<number | null>(null);
  const [titleHeightPx, setTitleHeightPx] = useState<number | null>(null);
  const bottomNavRef = useRef<HTMLDivElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  // 열기 직전에 포커스를 갖고 있던 트리거(사이드바 기어 or 탭바 기어). 닫을 때 여기로 되돌린다 —
  // 어느 쪽에서 열렸는지 컴포넌트가 미리 알 필요가 없다.
  const settingsTriggerRef = useRef<HTMLElement | null>(null);
  const withdrawConfirm = useWithdrawConfirm();
  const isWithdrawConfirmOpen = withdrawConfirm.isOpen;

  // 358 후속: 퇴장 애니메이션이 끝난 뒤에 트리에서 뺀다. 닫히는 중에 다시 열면 정리 함수가 타이머를
  // 취소하므로 그대로 등장 애니메이션으로 이어진다.
  //
  // ⚠️ 여는 쪽을 여기서 처리하지 않는 이유가 두 가지다. ①effect 안에서 동기 setState를 하면 렌더가
  // 연쇄된다(eslint react-hooks). ②그 한 프레임 지연 때문에 같은 커밋에서 도는 아래 포커스 effect가
  // 아직 없는 모달을 찾아 포커스 이동이 통째로 불발된다. 여는 것은 openSettings가 두 상태를 한 번에
  // 올리는 것으로 끝내고, 이 effect는 **닫은 뒤 붙잡아 두는 일만** 한다.
  useEffect(() => {
    if (isSettingsOpen || !isSettingsMounted) {
      return;
    }
    const timer = window.setTimeout(() => setIsSettingsMounted(false), getSettingsUnmountDelayMs());
    return () => window.clearTimeout(timer);
  }, [isSettingsOpen, isSettingsMounted]);

  // 409: 이 함수를 셸 밖(각 화면의 조판)에서도 부를 수 있게 Context로 흘려보낸다. 그래서
  // 렌더마다 새로 만들지 않는다 — 아래 Provider value가 매 렌더 갈리면 구독하는 화면이 전부
  // 다시 그려진다. setState 갱신자는 안정적이라 의존성은 비어 있다.
  const openSettings = useCallback(() => {
    setIsSettingsOpen(true);
    setIsSettingsMounted(true);
  }, []);
  const closeSettings = () => setIsSettingsOpen(false);

  // 409: 설정 진입점을 화면 어디서든 열 수 있게 하는 통로(SettingsTriggerContext).
  // ⚠️ **패널과 그 상태는 그대로 이 컴포넌트가 갖는다** — 넘기는 것은 여는 동작 하나뿐이다.
  // 셸의 기존 진입점(394 네비 카드, sm 탭바 4번째 칸)도 그대로 살아 있다.
  const settingsTrigger = useMemo(() => ({ openSettings }), [openSettings]);

  // 358 ①: 포커스 이동/복귀. 열릴 때 모달 자신(tabIndex=-1)에 포커스를 주므로 이어지는 Tab이 모달 안
  // 첫 요소로 들어가고, 스크린리더도 dialog 라벨부터 읽는다. 닫으면 열기 직전 요소로 되돌린다.
  //
  // ⚠️ 아래 ESC effect와 **일부러 분리했다.** 하나로 합치면 의존성에 탈퇴 다이얼로그 상태가 들어가고,
  // 그 다이얼로그를 여닫을 때마다 정리→재실행이 돌면서 포커스를 트리거로 되돌렸다가 패널로 다시
  // 뺏는다. 포커스는 "설정이 열렸나"에만 반응해야 한다.
  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }
    settingsTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    settingsPanelRef.current?.focus();
    return () => {
      settingsTriggerRef.current?.focus();
      settingsTriggerRef.current = null;
    };
  }, [isSettingsOpen]);

  // 358 ②: ESC 닫기. 탈퇴 확인 다이얼로그가 떠 있으면 아예 listener를 걸지 않는다 — 그 다이얼로그는
  // 설정 안의 「탈퇴하기」로 열리는 더 위층이라, ESC로 뒤쪽 설정을 먼저 닫으면 다이얼로그만
  // 덩그러니 남는다.
  //
  // 385 ③: 여기에 **포커스 트랩**을 함께 건다(ConfirmDialog와 같은 규칙). 서랍이던 시절에도 필요한
  // 동작이었지만 빠져 있었다 — aria-modal은 보조기술에만 알릴 뿐 실제 Tab 순서를 막아주지 않아,
  // Tab을 계속 누르면 딤 뒤의 사이드바·본문으로 포커스가 새어 나갔다.
  // 트랩도 ESC와 같은 조건(탈퇴 다이얼로그가 없을 때)에서만 돈다. 그 다이얼로그가 뜨면 키보드
  // 주도권은 그쪽이 가져가고(자기 트랩을 갖고 있다), 여기까지 살아 있으면 두 트랩이 같은 Tab을
  // 두 번 가로채 포커스가 튄다.
  useEffect(() => {
    if (!isSettingsOpen || isWithdrawConfirmOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSettingsOpen(false);
        return;
      }

      if (event.key !== 'Tab' || settingsPanelRef.current === null) {
        return;
      }

      const focusables = Array.from(
        settingsPanelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusables.length === 0) {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const isInside = settingsPanelRef.current.contains(active);

      if (event.shiftKey && (active === first || !isInside)) {
        event.preventDefault();
        last.focus();
        return;
      }
      if (!event.shiftKey && (active === last || !isInside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, isWithdrawConfirmOpen]);

  // 295 추가 수정(이슈 1.1): 캐비닛 세로 예산 계산에 쓰던 nav바 높이가 하드코딩 추정치(56px)였다 —
  // ref를 달아 ResizeObserver로 실제 렌더링된 높이를 측정하고, LayoutMetricsContext를 통해
  // 하위 페이지(FeedList 등)가 이 실측값을 쓰게 한다. 내부 마크업이 나중에 또 바뀌어도 이 ref는
  // 항상 "지금 실제로 렌더링된 높이"를 보고하므로 계산 쪽 코드는 손댈 필요가 없다.
  // 330: 관찰 대상이 상단 헤더에서 하단 탭바로 바뀌었다. 로직은 그대로다 — 탭바가 md:hidden이라
  // md 이상에서는 blockSize가 0으로 들어오고, 그게 곧 "사이드바 모드는 세로를 안 먹는다"가 된다.
  // 탭바의 safe-area padding도 border-box 높이에 포함되므로 인셋을 JS 상수로 복제할 필요가 없다.
  useEffect(() => {
    const element = bottomNavRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setNavChromeHeightPx(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* 359 — 전역 높이 계약 ②: 셸이 **확정 높이**를 선언한다.
          min-h-screen이었을 때는 "최소 뷰포트만큼"이라 내용이 넘치면 그만큼 문서가 자라 페이지
          전체가 스크롤됐다. 해상도에 따라 앱이 화면 밖으로 흘러 반응형이 깨진 인상을 준 원인이다.
          h-[100dvh]로 바꿔 셸의 높이를 화면에 고정하고, 넘치는 만큼은 아래 <main> 안에서만 스크롤한다.

          100vh가 아니라 100dvh인 이유 — iOS Safari의 100vh는 주소창이 보이는 상태에서도 "주소창이
          숨겨졌을 때의 큰 화면"을 가리켜 실제 보이는 높이보다 크다. 고정 높이로 못 박는 순간 그
          차이가 그대로 잘려 하단 탭바가 화면 밖으로 밀려난다. dvh는 지금 실제로 보이는 높이다.
          (이미 PAGE_MIN_HEIGHT_CLASS와 PlaceRecordSheet가 dvh 기준이라 단위도 여기서 통일된다.)

          overflow-hidden은 안전판이다. 아래 <main>이 flex-1이라 이 높이를 넘을 수 없지만, 나중에
          in-flow 형제가 하나 늘면 조용히 문서가 자라는 것을 막는다.
          ⚠️ 고정 위치 자식(사이드바·탭바·설정 모달·배경막)은 이 overflow에 잘리지 않는다 — 이 div에
          transform·filter가 없어 containing block이 되지 않기 때문이다. 여기에 transform 계열
          속성을 추가하면 그 순간 전부 잘린다. */}
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-paper-white">
        {/* 330: sm(<768) 전용 하단 탭바. 화면 바닥에 붙는 딱딱한 바 대신 둥근 알약이 떠 있는 형태다
            (디자인 피드백). md 이상은 좌측 사이드바가 대신하므로 md:hidden으로 숨긴다 —
            display:none이 되면 아래 ResizeObserver가 높이 0을 보고하고, 그게 그대로 "사이드바 모드는
            세로 예산을 안 먹는다"가 된다.

            ⚠️ ref가 알약(<nav>)이 아니라 바깥 래퍼에 붙어 있는 것이 중요하다. 세로 예산에서 빼야 할
            값은 알약 높이가 아니라 "알약 + 위아래 여백 + safe-area 인셋" 전체이고, 래퍼를 재면 그
            합계가 한 번에 나온다. 알약만 재면 여백만큼 컨텐츠가 알약 뒤로 들어간다.
            safe-area 인셋도 래퍼 padding이라 border-box 높이에 포함된다 — 기기마다 다른 값을 JS
            상수로 복제할 방법이 없으므로 이 구조가 유일하게 정확하다. 동작하려면 index.html의
            viewport meta에 viewport-fit=cover가 있어야 한다(없으면 env()가 항상 0).

            래퍼는 pointer-events-none이고 알약만 auto다 — 떠 있는 알약 좌우의 빈 공간은 시각적으로
            비어 있으므로 그 아래 컨텐츠가 클릭을 받아야 한다.

            로고는 이 구간에서 화면에 나오지 않는다 — 탭바에 넣을 자리가 없고, 상단에 로고만을 위한
            바를 남기면 세로 예산을 그만큼 잃는다. */}
        <div
          ref={bottomNavRef}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2 md:hidden"
        >
          <nav
            aria-label="주요 메뉴"
            className="pointer-events-auto flex max-w-full items-stretch gap-0.5 rounded-full border border-line-card bg-paper-white/95 p-1 shadow-[0_10px_30px_-8px_rgba(4,33,66,0.35)] backdrop-blur"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: true }}
                className="flex min-w-[3.5rem] flex-col items-center justify-center gap-0.5 rounded-full px-3.5 py-1.5 text-[10px] font-medium leading-none text-ink-gray transition-colors hover:text-log-mint"
                activeProps={{ className: 'bg-log-mint text-paper-white font-bold' }}
              >
                <NavIcon size={BOTTOM_NAV_ICON_SIZE}>{item.icon}</NavIcon>
                <span>{item.label}</span>
              </Link>
            ))}

            <button
              type="button"
              onClick={openSettings}
              aria-label="설정 열기"
              aria-haspopup="dialog"
              className="flex min-w-[3.5rem] flex-col items-center justify-center gap-0.5 rounded-full px-3.5 py-1.5 text-[10px] font-medium leading-none text-ink-gray transition-colors hover:text-log-mint"
            >
              <NavIcon size={BOTTOM_NAV_ICON_SIZE}>{SETTINGS_ICON}</NavIcon>
              <span>설정</span>
            </button>
          </nav>
        </div>

        {/* 414: 이 자리에 있던 md 이상의 좌측 네비(330 레일 → 394 플로팅 카드)를 삭제했다.
            로고 링크·메뉴 세 줄·설정 기어가 통째로 사라졌고, 그 역할은 각 지면이 오른쪽 어깨에
            인쇄하는 조판 링크(shared/ui/PaperCornerNav)가 이어받는다 — 홈·탐색·책장 셋 다
            그 줄에 「설정」을 항상 포함하므로 계정·로그아웃·탈퇴로 가는 길도 끊기지 않는다.
            셸에 떠 있는 조각이 하나도 남지 않아야 종이 무대가 화면 전체를 차지할 수 있다. */}

        {/* 330: sm은 떠 있는 탭바가 차지하는 높이(알약 + 위아래 여백 = 5rem)만큼 아래를 비운다 —
            safe-area 인셋만큼 더 내려가므로 그만큼도 함께 뺀다. 이 pb는 스크롤 **내용 안쪽**에
            남아야 한다 — 목록 맨 아래까지 스크롤했을 때 마지막 항목이 떠 있는 알약에 가리지 않게
            하는 여백이라, 스크롤 박스 바깥으로 빼면 효과가 없다.
            (이슈 1.1: 이 리터럴은 레이아웃 시프트 방지용이고, sm의 실제 세로 예산 계산은 아래
            Context로 흘려보내는 navChromeHeightPx 실측값을 쓴다 — 둘은 별개다.)

            414: 그 밖의 padding은 **전부 사라졌다.**
            · 좌측 예약(md 5.5rem / xl 16.5rem)은 밀어낼 네비가 없어졌다.
            · 364가 md 이상에 두던 사방 여백(pt/pr/pb 4·6)도 함께 걷었다 — 종이 무대(홈)가
              가장자리까지 가야 한다는 요구가 그 여백과 정면으로 부딪힌다. 여백의 소유권은
              화면 쪽에 있다: Feed·Library는 이미 PAGE_CONTAINER_CLASS(px-4/6/8)와
              PAGE_VERTICAL_PADDING_CLASS(py-3/6)로 자기 여백을 갖고 있어 가장자리에 붙지 않는다.
            ⚠️ shelfCabinetLayout.ts의 SHELL_INSET_PX_BY_TIER·PAGE_MIN_HEIGHT_CLASS는 아직 그
            여백이 있다고 보고 32/48px을 더 덜어낸다. **넘치는 쪽이 아니라 남기는 쪽**의 오차라
            (캐비닛이 그만큼 작아질 뿐 가로 넘침·상시 스크롤바는 생기지 않는다) 안전하지만,
            그 파일은 이 티켓 범위 밖이므로 값 정리는 후속으로 넘긴다. */}
        {/* 359 — 전역 높이 계약 ③: 남는 세로를 전부 차지하는 **유일한 스크롤 영역**.
            flex-1로 셸의 남은 높이를 받고, min-h-0으로 "flex 자식은 내용보다 작아지지 않는다"는
            기본값을 푼다 — 이 한 줄이 없으면 내용 높이만큼 늘어나 overflow-y-auto가 영영 발동하지
            않는다(flex 스크롤 박스의 고전적인 함정). 페이지 스크롤이 이 영역 안의 스크롤로 옮겨온다. */}
        <main className="min-h-0 flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
          <SettingsTriggerContext.Provider value={settingsTrigger}>
            <LayoutMetricsContext.Provider
              value={{ navChromeHeightPx, titleHeightPx, reportTitleHeightPx: setTitleHeightPx }}
            >
              <Outlet />
            </LayoutMetricsContext.Provider>
          </SettingsTriggerContext.Provider>
        </main>

        {/* 렌더 여부는 isSettingsOpen(의도)이 아니라 isSettingsMounted다. 둘은 열 때 openSettings가
            한 번에 올려 같은 렌더에서 참이 되고, 닫을 때만 갈라진다 — 의도가 먼저 false가 되어
            퇴장 애니메이션이 돌고, mount는 그것이 끝난 뒤 내려간다. */}
        {isSettingsMounted && (
          <>
            <div
              className={`fixed inset-0 z-40 bg-pin-navy/40 ${
                isSettingsOpen ? SETTINGS_SCRIM_ENTER_CLASS : SETTINGS_SCRIM_EXIT_CLASS
              }`}
              onClick={closeSettings}
              aria-hidden="true"
            />
            {/* 385: 사이드바 옆 서랍(358 방식 A)을 **중앙 모달**로 대체한다. 오버레이가 화면을 덮고
                그 가운데 카드가 뜬다 — 348의 ConfirmDialog·탈퇴 다이얼로그와 같은 문법이라, 이 앱에서
                "위에 덮이는 층"은 전부 같은 모양으로 나타난다. sm(탭바)에서도 같은 모달을 쓴다:
                358에서도 이 자리는 분기가 없었고, 중앙 정렬은 사이드바 유무와 무관하게 성립한다.

                레이어 순서는 그대로 지킨다 — 배경막 z-40 < 이 카드 z-[45] < 탈퇴 확인 다이얼로그
                z-50. 설정 안의 「탈퇴하기」로 열리는 그 다이얼로그가 반드시 이 카드 위에 떠야 한다.

                바깥 div가 위치만 잡고(fixed inset-0 grid place-items-center) 카드가 애니메이션을
                갖는다. 둘을 한 요소에 합치면 keyframe의 transform(translateY/scale)이 중앙 정렬용
                레이아웃과 싸운다.
                ⚠️ 바깥 div는 pointer-events-none이다. 안 그러면 이 투명한 층이 화면 전체를 덮어
                배경막의 클릭(=닫기)을 가로챈다. 카드만 auto로 되돌린다. */}
            <div className="pointer-events-none fixed inset-0 z-[45] grid place-items-center p-4">
              {/* max-h/overflow-y-auto: 세로가 짧은 화면(가로 모드 폰)에서도 탈퇴 링크까지 닿아야
                  한다. 서랍일 때는 inset-y-0라 자연히 화면 높이였지만, 중앙 카드는 내용 높이만큼만
                  차지하므로 상한을 직접 준다.
                  카드 폭(max-w-md)은 ConfirmDialog(max-w-sm)보다 한 단계 넓다 — 그쪽은 문장 한두
                  줄이지만 여기는 계정 정보·로그아웃·탈퇴가 들어가는 목록이다. */}
              <div
                ref={settingsPanelRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label="설정"
                className={`flex max-h-full w-full max-w-md flex-col gap-4 overflow-y-auto rounded-lg bg-paper-white p-6 shadow-[0_18px_40px_rgba(4,33,66,.22)] outline-none ${
                  isSettingsOpen ? SETTINGS_MODAL_ENTER_CLASS : SETTINGS_MODAL_EXIT_CLASS
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-pin-navy">설정</h2>
                  <button
                    type="button"
                    onClick={closeSettings}
                    aria-label="설정 닫기"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-pin-navy/[0.08] text-pin-navy"
                  >
                    ✕
                  </button>
                </div>
                <SettingsPanel />
              </div>
            </div>
          </>
        )}

        <WithdrawConfirmDialog />
      </div>
    </>
  );
}
