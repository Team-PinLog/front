import { describe, expect, it } from 'vitest';
import { router } from './router';
import { requireLoggedIn } from '@/features/auth/lib/requireLoggedIn';
import { handleOAuthCallback } from '@/features/auth/lib/handleOAuthCallback';

describe('router 가드 배치', () => {
  it('/ 라우트는 requireLoggedIn을 beforeLoad로 사용한다(보호 라우트)', () => {
    const route = router.routesById['/'];

    expect(route.options.beforeLoad).toBe(requireLoggedIn);
  });

  it('/login 라우트는 beforeLoad가 없다(가드 대상 아님, 무한 리다이렉트 방지)', () => {
    const route = router.routesById['/login'];

    expect(route.options.beforeLoad).toBeUndefined();
  });

  it('/auth/callback 라우트는 handleOAuthCallback을 beforeLoad로 사용하고 search를 검증한다', () => {
    const route = router.routesById['/auth/callback'];

    expect(route.options.beforeLoad).toBe(handleOAuthCallback);
    expect(route.options.validateSearch).toBeDefined();
  });
});
