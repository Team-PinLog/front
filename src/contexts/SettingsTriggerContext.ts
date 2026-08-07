import { createContext } from 'react';

export interface SettingsTriggerValue {
  /** 설정 패널(계정 정보·로그아웃·탈퇴)을 연다. */
  openSettings: () => void;
}

/**
 * 설정 패널을 **화면 어디서든** 열 수 있게 하는 통로.
 *
 * 네비게이션 바(사이드바·하단 탭바)를 없애면서 필요해졌다. 그전에는 패널을 여는 기어 버튼이
 * 셸 안에 두 개(사이드바 하단, 탭바 4번째 칸) 있었고 그게 **유일한** 진입점이었다 — 셸을
 * 지우는 순간 로그아웃할 방법이 사라진다. 이제 패널 자체는 AppLayout이 계속 갖고, 그걸 여는
 * 버튼만 각 화면이 자기 조판 안에 놓는다(shared/ui/PaperCornerNav).
 *
 * Provider 밖(로그인·약관처럼 셸이 없는 경로)에서 써도 터지지 않도록 기본값을 둔다 — 그쪽은
 * 애초에 설정을 열 자리가 아니라 no-op이면 충분하다.
 */
export const SettingsTriggerContext = createContext<SettingsTriggerValue>({
  openSettings: () => {},
});
