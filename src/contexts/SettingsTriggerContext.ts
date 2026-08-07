import { createContext } from 'react';

export interface SettingsTriggerValue {
  /** 설정 패널(계정 정보·로그아웃·탈퇴)을 연다. */
  openSettings: () => void;
}

/**
 * 설정 패널을 **화면 어디서든** 열 수 있게 하는 통로.
 *
 * 종이 지면(design-ver2 이식)을 들이면서 필요해졌다. 그전에는 패널을 여는 기어 버튼이 셸 안에만
 * 있었고(394 플로팅 네비 카드, sm 하단 탭바 4번째 칸) 그게 **유일한** 진입점이었다 — 종이 화면이
 * 자기 조판 안에 설정 진입점을 두려면 셸 바깥에서도 그 동작을 부를 수 있어야 한다.
 * 패널 자체는 AppLayout이 계속 갖고(385 중앙 모달), 그걸 여는 버튼만 화면이 놓는다
 * (shared/ui/PaperCornerNav).
 *
 * ⚠️ 셸의 기존 진입점을 대체하지 않는다 — dev의 네비 카드·탭바는 그대로다. 이 통로는 그
 * openSettings를 **한 번 더** 노출할 뿐이라, 열고 닫는 상태는 여전히 AppShell 한 곳에만 있다.
 *
 * Provider 밖(로그인·약관처럼 셸이 없는 경로)에서 써도 터지지 않도록 기본값을 둔다 — 그쪽은
 * 애초에 설정을 열 자리가 아니라 no-op이면 충분하다.
 */
export const SettingsTriggerContext = createContext<SettingsTriggerValue>({
  openSettings: () => {},
});
