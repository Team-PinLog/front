import { lazy, Suspense } from 'react';
import { Outlet, useLocation } from '@tanstack/react-router';
import { AppLayout } from '@/features/layout/components/AppLayout';

// 프로덕션 빌드에서 devtools 청크가 로드되지 않도록 동적 import + PROD 분기.
const TanStackRouterDevtoolsPanel = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import('@tanstack/react-router-devtools').then((mod) => ({
        default: mod.TanStackRouterDevtools,
      })),
    );

// AppLayout(상단 네비게이션 셸)을 씌우지 않는 경로 목록(제외 목록 방식).
// 라우트 트리에 pathless layout route를 붙이는 방식은 TanStack Router
// GitHub Issue #2130(런타임 route.id와 타입이 어긋나는 버그, 메인테이너가
// "invalid"로 닫았고 워크어라운드 없음)에 걸려 rootRoute의 component에서
// 경로 기반으로 직접 분기한다. 새 보호 라우트가 추가되면 별도 조치 없이
// 기본적으로 AppLayout이 적용된다 — 이 배열에 넣은 경로만 예외로 빠진다.
const ROUTES_WITHOUT_APP_LAYOUT = ['/login', '/auth/callback', '/collections/'];

function shouldSkipAppLayout(pathname: string): boolean {
  return ROUTES_WITHOUT_APP_LAYOUT.some((prefix) => pathname.startsWith(prefix));
}

export function RootLayout() {
  const pathname = useLocation({ select: (location) => location.pathname });
  // AppLayout은 <Outlet />을 자체적으로 렌더한다(children을 받지 않는다) — 그 내부 네비게이션
  // 마크업은 161에서 만든 그대로 건드리지 않는다. 그래서 여기서는 <AppLayout><Outlet /></AppLayout>이
  // 아니라 <AppLayout />만 렌더해 동일한 결과를 낸다.
  const content = shouldSkipAppLayout(pathname) ? <Outlet /> : <AppLayout />;

  return (
    <>
      {content}
      <Suspense fallback={null}>
        <TanStackRouterDevtoolsPanel position="bottom-right" />
      </Suspense>
    </>
  );
}
