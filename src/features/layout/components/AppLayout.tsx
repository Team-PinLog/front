import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Outlet } from '@tanstack/react-router';
import logoFull from '@/assets/logo-full.png';
import { WithdrawConfirmProvider } from '@/contexts/WithdrawConfirmProvider';
import { LayoutMetricsContext } from '@/shared/lib/LayoutMetricsContext';
import { PAGE_CONTAINER_CLASS } from '@/shared/lib/shelfCabinetLayout';
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
// 304: 이 배열과 아이콘은 sm·mdlg의 상단 가로 nav, xl의 좌측 세로 사이드바 nav가 그대로 함께
// 쓴다 — 새 SVG를 만들지 않고 배치(가로→세로)만 다른 컨테이너에서 바꾼다.
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
 * 로그인 후 화면 공통 셸. 우측 설정 패널 트리거를 제공한다.
 * sm·mdlg(<1280)는 상단 고정 가로 네비게이션(목업 app-topnav 구조, 162에서 확정)을 그대로 쓰고,
 * xl(≥1280)은 304(공통 AppShell 좌측 사이드바 재구성) 확정 목업 기준으로 좌측 고정 세로
 * 사이드바로 전환한다 — 같은 NAV_ITEMS·설정 트리거 로직을 두 레이아웃이 함께 쓰고, Tailwind
 * hidden/xl:flex·xl:hidden으로 보이는 쪽만 CSS로 전환한다(마운트/언마운트 분기 아님). 색상은
 * tailwind.config.js 브랜드 토큰을 쓴다. 설정 패널 내용(계정 정보·로그아웃·탈퇴)은 162에서 채웠다.
 */
export function AppLayout() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [navHeightPx, setNavHeightPx] = useState<number | null>(null);
  const [titleHeightPx, setTitleHeightPx] = useState<number | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  // 295 추가 수정(이슈 1.1): 캐비닛 세로 예산 계산에 쓰던 nav바 높이가 하드코딩 추정치(56px)였다 —
  // 헤더에 ref를 달아 ResizeObserver로 실제 렌더링된 높이를 측정하고, LayoutMetricsContext를 통해
  // 하위 페이지(FeedList 등)가 이 실측값을 쓰게 한다. padding이 xl에서만 py-4로 바뀌는 등 헤더
  // 내부가 나중에 또 바뀌어도, 이 ref는 항상 "지금 실제로 렌더링된 높이"를 보고하므로 계산 쪽 코드는
  // 손댈 필요가 없다.
  useEffect(() => {
    const element = headerRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setNavHeightPx(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <WithdrawConfirmProvider>
      <div className="min-h-screen bg-paper-white">
        {/* 304: xl(≥1280)에서는 좌측 사이드바(아래 <aside>)로 대체되므로 이 상단 헤더는 숨긴다.
            display:none이 되면 ResizeObserver가 보고하는 navHeightPx도 자연히 0이 되는데, xl에서는
            FeedList.tsx가 이 값을 애초에 쓰지 않아(고정 SHELF_SCROLL_MAX_H_PX — 319에서 삭제 — 만 사용) 별도 처리가
            필요 없다. */}
        <header
          ref={headerRef}
          className="fixed inset-x-0 top-0 z-40 border-b border-line-card bg-paper-white/95 backdrop-blur xl:hidden"
        >
          {/* 287-8: 좌우 padding/max-width(PAGE_CONTAINER_CLASS)를 FeedPage/LibraryPage의 페이지
              컨텐츠 컨테이너와 그대로 공유한다 — 로고~설정 아이콘의 좌우 끝이 그 아래 페이지 컨텐츠
              (캐비닛 포함)의 좌우 끝과 같은 x좌표에 맞춰지게 하기 위해서다.
              295 추가 수정(요구사항 2.2): xl(≥1280, PC)은 기존 py-4(16px)를 유지하고, sm·mdlg
              (<1280, 모바일/태블릿)는 py-2(8px)로 줄인다 — 고정 nav바가 차지하는 비중을 줄여 캐비닛에
              세로 공간을 더 내준다. 이 padding이 바뀌면 위 ResizeObserver가 자동으로 새 높이를
              다시 보고하므로, shelfCabinetLayout.ts에 값을 따로 맞출 필요가 없다(이슈 1.1). */}
          <div
            className={`${PAGE_CONTAINER_CLASS} flex items-center justify-between gap-6 py-2 xl:py-4`}
          >
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

        {/* 304: xl(≥1280) 전용 좌측 고정 사이드바 — sm·mdlg에서는 hidden으로 완전히 숨긴다(마운트는
            유지, CSS로만 전환). 폭은 shelfCabinetLayout.ts의 SIDEBAR_WIDTH_PX(240px = w-60)와 반드시
            같은 값을 유지한다 — Feed 캐비닛 가로 예산 계산이 그 상수를 그대로 읽는다. */}
        {/* 배경은 본문(bg-paper-white)보다 한 단계 흰 snow-white를 쓴다 — 확정 디자인 이미지에서
            사이드바가 본문과 미세한 명도 차이로 구분되기 때문이다. 브랜드 토큰으로 추가했다
            (tailwind.config.js, 사용자 승인). 육안으로는 거의 흰색으로 보이는 것이 정상이다. */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line-card bg-snow-white xl:flex">
          <div className="flex flex-col gap-8 p-6">
            <Link to="/" title="홈으로 이동" className="block h-7 w-[95px] overflow-hidden">
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

            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: true }}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-pin-navy/60 transition-colors hover:text-log-mint"
                  activeProps={{ className: 'bg-pin-navy/[0.06] text-pin-navy font-bold' }}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
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
            className="mt-auto flex items-center gap-3 px-10 py-6 text-sm font-medium text-pin-navy/60 transition-colors hover:text-log-mint"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>설정</span>
          </button>
        </aside>

        {/* 295 추가 수정(요구사항 2.2): sm·mdlg는 pt-14(56px)로 상단 헤더 높이만큼 밀어낸다(위 header
            py 축소로 실제 헤더 높이가 짧아진 만큼(약 52px, 4px 여유) 맞춘 값). FeedPage/LibraryPage의
            min-h-[calc(100dvh-...)]도 이 값과 반드시 같이 맞춘다.
            304: xl은 상단 헤더가 없어져 pt가 필요 없다(pt-0) — 대신 좌측 사이드바 폭만큼
            pl-60(SIDEBAR_WIDTH_PX와 동일 값)으로 민다. FeedPage/LibraryPage의 xl:min-h-[100dvh]도
            이 변경과 짝을 맞춘다.
            (이슈 1.1: pt/pl 값 자체는 여전히 레이아웃 시프트 방지용 Tailwind 리터럴이고, sm·mdlg의
            실제 예산 계산은 아래 Context로 흘려보내는 navHeightPx 실측값을 쓴다 — 둘은 별개다.) */}
        <main className="pt-14 xl:pl-60 xl:pt-0">
          <LayoutMetricsContext.Provider
            value={{ navHeightPx, titleHeightPx, reportTitleHeightPx: setTitleHeightPx }}
          >
            <Outlet />
          </LayoutMetricsContext.Provider>
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
