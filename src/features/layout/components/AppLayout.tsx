import { useState, type ReactNode } from 'react';
import { Link, Outlet } from '@tanstack/react-router';
import logoFull from '@/assets/logo-full.png';
import { WithdrawConfirmProvider } from '@/contexts/WithdrawConfirmProvider';
import { SettingsPanel } from './SettingsPanel';
import { WithdrawConfirmDialog } from './WithdrawConfirmDialog';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

// 책장 메뉴는 /library로 연결한다(144 완료 — 내 책장 + 팔로우 책장 통합 조회).
// /shelf(141, 내 책장 단독 조회)는 남겨두되 상단 네비 진입점으로는 쓰지 않는다.
// 169(설정/프로필)에서 진입점 구성이 바뀌면 이 매핑을 조정한다.
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

/**
 * 로그인 후 화면 공통 셸. 상단 고정 네비게이션 + 우측 설정 패널 트리거를 제공한다.
 * 목업 app-topnav(PinLog.responsive.dc.html) 구조를 참고하되 색상은 tailwind.config.js
 * 브랜드 토큰을 쓴다. 설정 패널 내용(계정 정보·로그아웃·탈퇴)은 162에서 채웠다.
 */
export function AppLayout() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <WithdrawConfirmProvider>
      <div className="min-h-screen bg-paper-white">
        <header className="fixed inset-x-0 top-0 z-40 border-b border-line-card bg-paper-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-8 py-4">
            <div className="flex items-center gap-9">
              <Link to="/" title="홈으로 이동" className="block h-7 w-[95px] overflow-hidden">
                {/* PinLog/brand-resource assets/logo-full.png(1447x1087)는 실제 심볼+워드마크 주위에 넓은 투명
                    여백이 포함돼 있다(내용 bbox 약 x:170-1280, y:364-690). 파일 자체는 원본 그대로 쓰고,
                    네비바에 맞는 크기로 보이도록 컨테이너를 overflow-hidden으로 잘라 보여준다 — 목업의
                    .brand-lockup{overflow:hidden}과 동일한 방식이다. 원본 종횡비(1447:1087)를 그대로
                    유지한 채 배경 크기만 축소하므로 로고가 왜곡되지 않는다. */}
                <span
                  aria-label="핀로그"
                  role="img"
                  className="block h-full w-full bg-no-repeat"
                  style={{
                    backgroundImage: `url(${logoFull})`,
                    backgroundSize: '124px 93px',
                    backgroundPosition: '-15px -31px',
                  }}
                />
              </Link>

              <nav className="flex items-center gap-7">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    activeOptions={{ exact: true }}
                    className="flex items-center gap-1.5 text-sm font-medium text-ink-gray transition-colors hover:text-log-mint"
                    activeProps={{ className: 'text-pin-navy font-bold' }}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.9}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {item.icon}
                    </svg>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              title="설정"
              aria-label="설정 패널 열기"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-pin-navy/[0.06] transition-colors hover:bg-pin-navy/[0.12]"
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#042142"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </header>

        <main className="pt-20">
          <Outlet />
        </main>

        {isSettingsOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-pin-navy/40"
              onClick={() => setIsSettingsOpen(false)}
              aria-hidden="true"
            />
            <aside
              role="dialog"
              aria-label="설정"
              className="fixed inset-y-0 right-0 z-50 flex w-80 max-w-full flex-col gap-4 bg-paper-white p-6 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-pin-navy">설정</h2>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
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
    </WithdrawConfirmProvider>
  );
}
