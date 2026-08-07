import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import './index.css';
import { QueryProvider } from './app/QueryProvider';
import { router } from './app/router';
import { CoverJobProvider } from './contexts/CoverJobProvider';

// CoverJobProvider는 QueryProvider 안쪽, 라우터 바깥이다(326).
// 안쪽인 이유: 표지 폴링·저장이 TanStack Query를 쓴다.
// 바깥인 이유: 표지를 백그라운드에서 완성하는 동안 사용자는 어디로든 이동한다 — 라우터 안(특히
// AppLayout 안)에 두면 화면 전환으로 트리가 빠지면서 폴링 구독자가 사라져 저장이 취소된다.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <CoverJobProvider>
        <RouterProvider router={router} />
      </CoverJobProvider>
    </QueryProvider>
  </StrictMode>,
);
