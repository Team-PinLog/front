import { lazy, Suspense } from 'react';
import { Outlet } from '@tanstack/react-router';

// 프로덕션 빌드에서 devtools 청크가 로드되지 않도록 동적 import + PROD 분기.
const TanStackRouterDevtoolsPanel = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import('@tanstack/react-router-devtools').then((mod) => ({
        default: mod.TanStackRouterDevtools,
      })),
    );

export function RootLayout() {
  return (
    <>
      <Outlet />
      <Suspense fallback={null}>
        <TanStackRouterDevtoolsPanel position="bottom-right" />
      </Suspense>
    </>
  );
}
