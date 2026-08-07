import { describe, expect, it } from 'vitest';
import { router } from './router';
import { requireLoggedIn } from '@/features/auth/lib/requireLoggedIn';
import { redirectIfLoggedIn } from '@/features/auth/lib/redirectIfLoggedIn';
import { handleOAuthCallback } from '@/features/auth/lib/handleOAuthCallback';

describe('router 가드 배치', () => {
  it('/ 라우트는 requireLoggedIn을 beforeLoad로 사용한다(보호 라우트)', () => {
    const route = router.routesById['/'];

    expect(route.options.beforeLoad).toBe(requireLoggedIn);
  });

  it('/login 라우트는 redirectIfLoggedIn을 beforeLoad로 사용한다(로그인 상태면 홈으로, 114)', () => {
    const route = router.routesById['/login'];

    expect(route.options.beforeLoad).toBe(redirectIfLoggedIn);
  });

  it('/auth/callback 라우트는 handleOAuthCallback을 beforeLoad로 사용하고 search를 검증한다', () => {
    const route = router.routesById['/auth/callback'];

    expect(route.options.beforeLoad).toBe(handleOAuthCallback);
    expect(route.options.validateSearch).toBeDefined();
  });

  it('/me/activity 라우트는 requireLoggedIn을 beforeLoad로 사용한다(본인 집계 화면, 407)', () => {
    const route = router.routesById['/me/activity'];

    expect(route.options.beforeLoad).toBe(requireLoggedIn);
  });
});
