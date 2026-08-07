import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet } from '@tanstack/react-router';
import { WithdrawConfirmProvider } from '@/contexts/WithdrawConfirmProvider';
import { useWithdrawConfirm } from '@/contexts/useWithdrawConfirm';
import {
  SettingsTriggerContext,
  type SettingsTriggerValue,
} from '@/contexts/SettingsTriggerContext';
import { LayoutMetricsContext } from '@/shared/lib/LayoutMetricsContext';
import { SettingsPanel } from './SettingsPanel';
import { WithdrawConfirmDialog } from './WithdrawConfirmDialog';

// 358 후속(디자인 피드백 — "너무 팍 하고 바뀐다"): 설정 패널 등장·퇴장 모션.
// keyframe 본체는 src/index.css에 있다.
const SETTINGS_MOTION_MS = 200;

// 조건부 클래스는 문자열을 조립하지 않고 **완성된 리터럴 중 하나를 고른다**(conventions 2장) —
// Tailwind는 소스를 원시 텍스트로 스캔하므로 조립한 클래스는 스캔되지 않아 스타일이 없다.
//
// 퇴장 클래스에 pointer-events-none이 붙는 이유: 닫기 애니메이션이 도는 200ms 동안에도 요소는
// 아직 DOM에 있어서, 없으면 이미 사라져 보이는 배경막이 클릭을 계속 삼킨다.
// motion-reduce 조합: 애니메이션을 끄면 등장은 최종 상태로 즉시 나타나고, 퇴장은 즉시 투명해진다
// (unmount 지연도 아래에서 0으로 만든다).
const SETTINGS_PANEL_ENTER_CLASS =
  'animate-[settings-panel-in_200ms_ease-out] motion-reduce:animate-none';
const SETTINGS_PANEL_EXIT_CLASS =
  'pointer-events-none animate-[settings-panel-out_200ms_ease-out_forwards] motion-reduce:animate-none motion-reduce:opacity-0';
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

/**
 * 로그인 후 화면 공통 셸.
 *
 * 358에서 AppLayout을 Provider 껍데기와 AppShell로 쪼갰다. 설정 패널의 ESC 처리가 "탈퇴 확인
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
 * 네비게이션 바를 걷어낸 뒤의 셸.
 *
 * 330에서 만든 좌측 사이드바와 sm 하단 탭바를 **둘 다 삭제했다**(제품 결정 — "네비게이션 바는
 * 없도록"). 홈·탐색이 셸을 물려 종이 한 장으로 보이게 하던 몰입 장치(ShellImmersionContext,
 * index.css의 .shell-aside/.shell-bottom-nav/.shell-main)도 함께 사라졌다 — 물릴 크롬 자체가
 * 없으므로 물러나는 전환도 필요 없다. 그 전환이 도는 1.4초 동안 본문 폭이 계속 변해서 책장이
 * 뒤늦게 다시 배치되던 문제도 여기서 근본적으로 사라진다.
 *
 * ⚠️ 그래서 남은 책임이 둘뿐이다.
 *  ① 화면 높이 계약: 셸이 100dvh를 확정하고 <main> 하나만 스크롤한다(359에서 세운 규칙 유지).
 *  ② 설정 패널: 패널 자체는 여기 있고, **여는 버튼은 각 화면이 갖는다**(SettingsTriggerContext).
 *     기어 버튼이 셸 안에만 있던 구조를 그대로 두면 셸과 함께 로그아웃 경로가 사라진다.
 *
 * ⚠️ 본문 여백도 더 이상 셸이 주지 않는다. 화면마다 필요한 여백이 다르기 때문이다 — 홈·탐색은
 * 지면이 가장자리까지 차야 하고(여백 0), 책장은 사방 여백이 있어야 한다. 각 페이지가 자기
 * 여백을 직접 갖는다(shelfCabinetLayout.ts의 PAGE_INSET_PX_BY_TIER / PAGE_MIN_HEIGHT_CLASS).
 */
function AppShell() {
  // 두 상태가 나뉜 이유: isSettingsOpen은 **사용자의 의도**(열려 있어야 하나)이고,
  // isSettingsMounted는 **DOM에 남아 있나**다. 닫는 순간 바로 unmount하면 퇴장 애니메이션이 첫
  // 프레임에 잘려 나가므로, 의도가 먼저 false가 되고 mount는 애니메이션이 끝난 뒤 따라 내려간다.
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsMounted, setIsSettingsMounted] = useState(false);
  const [titleHeightPx, setTitleHeightPx] = useState<number | null>(null);
  const settingsPanelRef = useRef<HTMLElement>(null);
  // 열기 직전에 포커스를 갖고 있던 트리거. 닫을 때 여기로 되돌린다 — 어느 화면의 어느 버튼에서
  // 열렸는지 이 컴포넌트가 미리 알 필요가 없다(셸을 지우면서 트리거가 화면마다 흩어졌다).
  const settingsTriggerRef = useRef<HTMLElement | null>(null);
  const withdrawConfirm = useWithdrawConfirm();
  const isWithdrawConfirmOpen = withdrawConfirm.isOpen;

  // 358 후속: 퇴장 애니메이션이 끝난 뒤에 트리에서 뺀다. 닫히는 중에 다시 열면 정리 함수가 타이머를
  // 취소하므로 그대로 등장 애니메이션으로 이어진다.
  //
  // ⚠️ 여는 쪽을 여기서 처리하지 않는 이유가 두 가지다. ①effect 안에서 동기 setState를 하면 렌더가
  // 연쇄된다(eslint react-hooks). ②그 한 프레임 지연 때문에 같은 커밋에서 도는 아래 포커스 effect가
  // 아직 없는 패널을 찾아 포커스 이동이 통째로 불발된다. 여는 것은 openSettings가 두 상태를 한 번에
  // 올리는 것으로 끝내고, 이 effect는 **닫은 뒤 붙잡아 두는 일만** 한다.
  useEffect(() => {
    if (isSettingsOpen || !isSettingsMounted) {
      return;
    }
    const timer = window.setTimeout(() => setIsSettingsMounted(false), getSettingsUnmountDelayMs());
    return () => window.clearTimeout(timer);
  }, [isSettingsOpen, isSettingsMounted]);

  // 참조를 고정한다 — 화면들이 Context로 받아 이벤트 핸들러에 넣으므로, 매번 새 함수를 주면
  // 셸이 리렌더될 때마다 화면 쪽 메모이제이션이 전부 깨진다.
  const openSettings = useCallback(() => {
    setIsSettingsOpen(true);
    setIsSettingsMounted(true);
  }, []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
  const settingsTrigger = useMemo<SettingsTriggerValue>(() => ({ openSettings }), [openSettings]);

  // 358 ①: 포커스 이동/복귀. 열릴 때 패널 자신(tabIndex=-1)에 포커스를 주므로 이어지는 Tab이 패널 안
  // 첫 요소로 들어가고, 스크린리더도 dialog 라벨부터 읽는다. 닫으면 열기 직전 요소로 되돌린다.
  //
  // ⚠️ 아래 ESC effect와 **일부러 분리했다.** 하나로 합치면 의존성에 탈퇴 다이얼로그 상태가 들어가고,
  // 그 다이얼로그를 여닫을 때마다 정리→재실행이 돌면서 포커스를 트리거로 되돌렸다가 패널로 다시
  // 뺏는다. 포커스는 "설정 패널이 열렸나"에만 반응해야 한다.
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
  // 설정 패널 안의 「탈퇴하기」로 열리는 더 위층이라, ESC로 뒤쪽 패널을 먼저 닫으면 다이얼로그만
  // 덩그러니 남는다.
  useEffect(() => {
    if (!isSettingsOpen || isWithdrawConfirmOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, isWithdrawConfirmOpen]);

  return (
    <SettingsTriggerContext.Provider value={settingsTrigger}>
      {/* 359 — 전역 높이 계약 ②: 셸이 **확정 높이**를 선언한다.
          min-h-screen이었을 때는 "최소 뷰포트만큼"이라 내용이 넘치면 그만큼 문서가 자라 페이지
          전체가 스크롤됐다. h-[100dvh]로 셸의 높이를 화면에 고정하고, 넘치는 만큼은 아래 <main>
          안에서만 스크롤한다.

          100vh가 아니라 100dvh인 이유 — iOS Safari의 100vh는 주소창이 보이는 상태에서도 "주소창이
          숨겨졌을 때의 큰 화면"을 가리켜 실제 보이는 높이보다 크다. dvh는 지금 실제로 보이는 높이다.

          overflow-hidden은 안전판이다. 아래 <main>이 flex-1이라 이 높이를 넘을 수 없지만, 나중에
          in-flow 형제가 하나 늘면 조용히 문서가 자라는 것을 막는다.
          ⚠️ 고정 위치 자식(설정 패널·배경막)은 이 overflow에 잘리지 않는다 — 이 div에 transform·
          filter가 없어 containing block이 되지 않기 때문이다. transform 계열을 추가하면 잘린다. */}
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-paper-white">
        {/* 359 — 전역 높이 계약 ③: 남는 세로를 전부 차지하는 **유일한 스크롤 영역**.
            flex-1로 셸의 남은 높이를 받고, min-h-0으로 "flex 자식은 내용보다 작아지지 않는다"는
            기본값을 푼다 — 이 한 줄이 없으면 내용 높이만큼 늘어나 overflow-y-auto가 영영 발동하지
            않는다(flex 스크롤 박스의 고전적인 함정).

            ⚠️ padding이 없다. 네비게이션 바를 걷어내면서 여백의 소유권도 각 페이지로 넘겼다
            (AppShell 주석) — 여기 값을 하나라도 두면 여백이 필요 없는 종이 화면(홈·탐색)이 다시
            그만큼 밀린다. 이 영역의 content box 높이는 정확히 100dvh이고, 그게 곧
            PAGE_MIN_HEIGHT_CLASS가 뷰포트에서 자기 여백만 빼면 되는 근거다. */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <LayoutMetricsContext.Provider
            value={{ titleHeightPx, reportTitleHeightPx: setTitleHeightPx }}
          >
            <Outlet />
          </LayoutMetricsContext.Provider>
        </main>

        {/* 렌더 여부는 isSettingsOpen(의도)이 아니라 isSettingsMounted다. 둘은 열 때 openSettings가
            한 번에 올려 같은 렌더에서 참이 되고, 닫을 때만 갈라진다. */}
        {isSettingsMounted && (
          <>
            <div
              className={`fixed inset-0 z-40 bg-pin-navy/40 ${
                isSettingsOpen ? SETTINGS_SCRIM_ENTER_CLASS : SETTINGS_SCRIM_EXIT_CLASS
              }`}
              onClick={closeSettings}
              aria-hidden="true"
            />
            {/* 358은 이 패널을 사이드바 **옆**(md:left-60)에 붙여 두 면이 이어 보이게 했는데,
                사이드바가 사라져 붙을 면이 없다 — 화면 왼쪽 가장자리에서 그대로 밀려 들어온다.
                등장 애니메이션(settings-panel-in)이 원래 자기 폭만큼 왼쪽에서 들어오는 모션이라
                시작 위치가 곧 화면 밖이 되어, 서랍이 열리는 인상은 그대로 남는다.
                overflow-y-auto: 세로가 짧은 화면(가로 모드 폰)에서 탈퇴 링크까지 닿아야 한다.
                z는 배경막(40) 위, 탈퇴 확인 다이얼로그(50) 아래다. */}
            <aside
              ref={settingsPanelRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="설정"
              className={`fixed inset-y-0 left-0 z-[45] flex w-80 max-w-full flex-col gap-4 overflow-y-auto bg-paper-white p-6 shadow-xl outline-none ${
                isSettingsOpen ? SETTINGS_PANEL_ENTER_CLASS : SETTINGS_PANEL_EXIT_CLASS
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-pin-navy">설정</h2>
                <button
                  type="button"
                  onClick={closeSettings}
                  aria-label="설정 패널 닫기"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-pin-navy/[0.08] text-pin-navy"
                >
                  ✕
                </button>
              </div>
              <SettingsPanel />
            </aside>
          </>
        )}

        <WithdrawConfirmDialog />
      </div>
    </SettingsTriggerContext.Provider>
  );
}
