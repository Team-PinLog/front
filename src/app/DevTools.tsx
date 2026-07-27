import { lazy, Suspense } from 'react';

// 프로덕션 빌드에서 devtools 청크가 로드되지 않도록 동적 import + PROD 분기.
const ReactQueryDevtoolsPanel = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import('@tanstack/react-query-devtools').then((mod) => ({
        default: mod.ReactQueryDevtools,
      })),
    );

export function QueryDevTools() {
  return (
    <Suspense fallback={null}>
      <ReactQueryDevtoolsPanel initialIsOpen={false} />
    </Suspense>
  );
}
