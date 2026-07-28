import { describe, expect, it } from 'vitest';
import { router } from './router';
import { requireLoggedIn } from '@/features/auth/lib/requireLoggedIn';

describe('router 가드 배치', () => {
  it('/ 라우트는 requireLoggedIn을 beforeLoad로 사용한다(보호 라우트)', () => {
    const route = router.routesById['/'];

    expect(route.options.beforeLoad).toBe(requireLoggedIn);
  });

  it('/login 라우트는 beforeLoad가 없다(가드 대상 아님, 무한 리다이렉트 방지)', () => {
    const route = router.routesById['/login'];

    expect(route.options.beforeLoad).toBeUndefined();
  });
});
