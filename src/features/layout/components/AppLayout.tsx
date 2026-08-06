import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Outlet } from '@tanstack/react-router';
import logoFull from '@/assets/logo-full.png';
import { WithdrawConfirmProvider } from '@/contexts/WithdrawConfirmProvider';
import { LayoutMetricsContext } from '@/shared/lib/LayoutMetricsContext';
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
const SETTINGS_ICON = (
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </>
);

// 사이드바 아이콘 크기. 접힘/펼침에서 같은 값을 써야 한다 — 상태에 따라 크기가 달라지면 호버할
// 때마다 아이콘이 커졌다 작아졌다 한다(디자인 피드백).
// 디자인 피드백으로 한 차례 85% 축소했다(26 → 22, 하단 탭바 18 → 15).
const SIDEBAR_ICON_SIZE = 22;
// 떠 있는 하단 탭바 아이콘. 알약이 두꺼워 보이지 않게 사이드바보다 작다.
const BOTTOM_NAV_ICON_SIZE = 15;

// 사이드바 아이콘이 놓이는 고정폭 슬롯. 접힘(72px)일 때 이 슬롯의 중앙이 곧 레일의 중앙이고
// (좌우 padding 11 + 슬롯 50의 절반 = 36 = 72/2), 펼쳐도 슬롯이 그대로라 아이콘이 움직이지 않는다.
// 폭을 아이콘 크기와 분리해 두는 것이 핵심이다 — 아이콘 크기를 바꿔도 정렬 계산을 다시 하지 않는다.
const SIDEBAR_ICON_SLOT_CLASS = 'flex w-[50px] flex-none items-center justify-center';

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
 * 로그인 후 화면 공통 셸. 우측 설정 패널 트리거를 제공한다.
 *
 * 330: sm(<768)은 하단 고정 탭바(홈·탐색·책장·설정 4칸), md 이상은 좌측 고정 사이드바다 —
 * 태블릿도 데스크탑과 같은 사이드바를 쓴다. 이전의 상단 고정 헤더는 없앴다. 사이드바는 md~lg에서
 * 아이콘만 있는 72px 레일이고 xl부터 라벨을 포함한 240px로 넓어진다(appChrome.ts의
 * getSidebarWidthPx와 쌍 — 그 값이 Feed 캐비닛 가로 예산에 그대로 들어간다).
 * 같은 NAV_ITEMS·설정 트리거 로직을 두 배치가 함께 쓰고, Tailwind md:hidden/md:flex로 보이는 쪽만
 * CSS로 전환한다(마운트/언마운트 분기 아님). 색상은 tailwind.config.js 브랜드 토큰을 쓴다.
 * 설정 패널 내용(계정 정보·로그아웃·탈퇴)은 162에서 채웠다.
 */
export function AppLayout() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [navChromeHeightPx, setNavChromeHeightPx] = useState<number | null>(null);
  const [titleHeightPx, setTitleHeightPx] = useState<number | null>(null);
  const bottomNavRef = useRef<HTMLDivElement>(null);

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
    <WithdrawConfirmProvider>
      <div className="min-h-screen bg-paper-white">
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
              onClick={() => setIsSettingsOpen(true)}
              aria-label="설정 패널 열기"
              aria-haspopup="dialog"
              className="flex min-w-[3.5rem] flex-col items-center justify-center gap-0.5 rounded-full px-3.5 py-1.5 text-[10px] font-medium leading-none text-ink-gray transition-colors hover:text-log-mint"
            >
              <NavIcon size={BOTTOM_NAV_ICON_SIZE}>{SETTINGS_ICON}</NavIcon>
              <span>설정</span>
            </button>
          </nav>
        </div>

        {/* 330: md(≥768) 이상 좌측 고정 사이드바 — sm에서는 hidden으로 완전히 숨긴다(마운트는 유지,
            CSS로만 전환).

            md~lg는 아이콘만 있는 72px 레일이고, **호버(또는 내부 포커스) 시 240px로 펼쳐진다**
            (디자인 피드백 — "평소엔 접혀 있다가 호버하면 펼쳐진 것처럼"). xl은 처음부터 펼친 상태다.

            ⚠️ 펼침은 레이아웃을 밀지 않고 컨텐츠 위에 겹친다. <main>의 md:pl-[4.5rem]과
            getSidebarWidthPx(mdlg)=72는 접힌 폭 그대로 유지된다 — 펼칠 때 실제 폭을 밀면 Feed 카드
            크기·행 수 계산이 호버할 때마다 다시 돌아 화면이 출렁인다. 예약 폭은 고정하고 시각적으로만
            덮는 것이 맞다.

            펼침 조건이 :hover와 :has(:focus-visible)인 이유 — 처음엔 :focus-within을 썼는데, 메뉴를
            클릭해 페이지를 옮기면 그 <Link>에 포커스가 남아 마우스를 떼도 계속 펼쳐진 채였다.
            :focus-visible은 브라우저가 키보드 조작에만 적용하므로 클릭 후에는 걸리지 않고, 탭 이동
            으로 들어온 경우에는 그대로 펼쳐진다. :has()를 지원하지 않는 구형 브라우저에서는 호버
            전용으로 자연스럽게 후퇴하며, 그때도 접힌 상태의 <Link> title과 설정 버튼 aria-label이
            남아 접근성 이름 자체는 유지된다.

            폭은 appChrome.ts의 getSidebarWidthPx와 반드시 같은 값을 유지한다(md~lg 72px = w-[4.5rem],
            xl 240px = w-60) — Feed 캐비닛 가로 예산이 그 값을 그대로 읽는다.
            pl-[env(safe-area-inset-left)]: viewport-fit=cover를 켜면 가로 인셋도 활성화되는데, 폰
            가로(예: 932x430)는 tier가 mdlg라 이 사이드바가 뜨고 left-0이면 노치에 가린다. */}
        {/* 배경은 본문(bg-paper-white)보다 한 단계 흰 snow-white를 쓴다 — 확정 디자인 이미지에서
            사이드바가 본문과 미세한 명도 차이로 구분되기 때문이다. 브랜드 토큰으로 추가했다
            (tailwind.config.js, 사용자 승인). 육안으로는 거의 흰색으로 보이는 것이 정상이다. */}
        <aside className="group fixed inset-y-0 left-0 z-40 hidden w-[4.5rem] flex-col overflow-hidden border-r border-line-card bg-snow-white pl-[env(safe-area-inset-left)] transition-[width] duration-200 ease-out hover:w-60 has-[:focus-visible]:w-60 md:flex xl:w-60">
          <div className="flex flex-col gap-8 px-[11px] py-4 xl:py-6">
            {/* 접힘↔펼침에서 심볼이 제자리에 머물고 워드마크만 드러나야 한다(디자인 피드백 —
                "번쩍이지 말고 텍스트만 생기는 것처럼"). 그래서 이미지를 갈아끼우지 않고 **같은 이미지의
                보이는 폭만** 24px↔81px로 늘린다 — 배경 위치가 고정이라 심볼은 1px도 움직이지 않는다.
                24px 창에 워드마크가 걸치지 않는 것은 실측으로 확인했다(105x79로 축소 후 -13,-26 오프셋
                기준 심볼 폭이 약 24px).
                ml-[13px]: 심볼(24px)의 중앙을 아래 아이콘 슬롯과 같은 36px에 맞춘다(11 + 13 + 12 = 36).
                이게 없으면 로고만 왼쪽으로 11px 치우쳐 보인다(디자인 피드백).
                logo-full.png(1447x1087)는 심볼+워드마크 주위에 넓은 투명 여백이 있어(내용 bbox 약
                x:170-1280, y:364-690) 파일은 원본 그대로 두고 컨테이너로 잘라 쓴다. 원본 종횡비를
                유지한 채 배경 크기만 줄이므로 왜곡되지 않는다. */}
            <Link
              to="/"
              title="홈으로 이동"
              aria-label="핀로그 홈으로 이동"
              className="ml-[13px] block h-6 w-6 flex-none overflow-hidden bg-no-repeat transition-[width] duration-200 ease-out group-hover:w-[81px] group-has-[:focus-visible]:w-[81px] xl:w-[81px]"
              style={{
                backgroundImage: `url(${logoFull})`,
                backgroundSize: '105px 79px',
                backgroundPosition: '-13px -26px',
              }}
            />

            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  title={item.label}
                  activeOptions={{ exact: true }}
                  className="flex items-center gap-1 rounded-xl py-2.5 text-sm font-medium text-pin-navy/60 transition-colors hover:text-log-mint"
                  activeProps={{ className: 'bg-pin-navy/[0.06] text-pin-navy font-bold' }}
                >
                  <span className={SIDEBAR_ICON_SLOT_CLASS}>
                    <NavIcon size={SIDEBAR_ICON_SIZE}>{item.icon}</NavIcon>
                  </span>
                  <span className="hidden whitespace-nowrap group-hover:inline group-has-[:focus-visible]:inline xl:inline">
                    {item.label}
                  </span>
                </Link>
              ))}
            </nav>
          </div>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            title="설정"
            aria-label="설정 패널 열기"
            aria-haspopup="dialog"
            className="mt-auto flex items-center gap-1 px-[11px] py-6 text-sm font-medium text-pin-navy/60 transition-colors hover:text-log-mint"
          >
            <span className={SIDEBAR_ICON_SLOT_CLASS}>
              <NavIcon size={SIDEBAR_ICON_SIZE}>{SETTINGS_ICON}</NavIcon>
            </span>
            <span className="hidden whitespace-nowrap group-hover:inline group-has-[:focus-visible]:inline xl:inline">
              설정
            </span>
          </button>
        </aside>

        {/* 330: sm은 떠 있는 탭바가 차지하는 높이(알약 + 위아래 여백 = 5rem)만큼 아래를 비운다 —
            이전의 pt-14가 뒤집힌 것이다. safe-area 인셋만큼 더 내려가므로 그만큼도 함께 뺀다. md 이상은 탭바가 없어
            pb가 필요 없고(md:pb-0), 대신 좌측 사이드바 폭만큼 민다(md:pl-[4.5rem] xl:pl-60 —
            appChrome.ts의 getSidebarWidthPx와 동일 값). FeedPage/LibraryPage/HomePage의
            PAGE_MIN_HEIGHT_CLASS도 이 값과 짝을 맞춘다.
            (이슈 1.1: pb/pl 값 자체는 여전히 레이아웃 시프트 방지용 Tailwind 리터럴이고, sm의 실제
            예산 계산은 아래 Context로 흘려보내는 navChromeHeightPx 실측값을 쓴다 — 둘은 별개다.) */}
        <main className="pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-[4.5rem] xl:pl-60">
          <LayoutMetricsContext.Provider
            value={{ navChromeHeightPx, titleHeightPx, reportTitleHeightPx: setTitleHeightPx }}
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
