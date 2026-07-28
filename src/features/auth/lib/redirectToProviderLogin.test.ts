import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_URL } from '@/config/constants';
import { redirectToProviderLogin, type SocialProvider } from './redirectToProviderLogin';

describe('redirectToProviderLogin', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it.each<SocialProvider>(['google', 'kakao', 'naver'])(
    '%s 선택 시 axios/fetch 없이 window.location.href를 공급자 로그인 URL로 설정한다',
    (provider) => {
      redirectToProviderLogin(provider);

      expect(window.location.href).toBe(`${API_BASE_URL}/auth/${provider}/login`);
    },
  );
});
