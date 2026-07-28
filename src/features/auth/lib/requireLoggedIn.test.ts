import { beforeEach, describe, expect, it } from 'vitest';
import { isRedirect } from '@tanstack/react-router';
import { requireLoggedIn } from './requireLoggedIn';
import { getPreLoginPath } from './preLoginPath';

function clearCookies() {
  for (const pair of document.cookie.split('; ')) {
    const name = pair.split('=')[0];
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }
}

describe('requireLoggedIn', () => {
  beforeEach(() => {
    clearCookies();
    sessionStorage.clear();
  });

  it('logged_in 쿠키가 없으면 현재 경로를 저장하고 /login으로 리다이렉트한다', () => {
    expect.assertions(3);
    try {
      requireLoggedIn({ location: { pathname: '/' } });
    } catch (thrown) {
      expect(isRedirect(thrown)).toBe(true);
      expect((thrown as { options: { to: string } }).options.to).toBe('/login');
    }
    expect(getPreLoginPath()).toBe('/');
  });

  it('logged_in 쿠키가 있으면 리다이렉트하지 않는다', () => {
    document.cookie = 'logged_in=1';

    expect(() => requireLoggedIn({ location: { pathname: '/' } })).not.toThrow();
    expect(getPreLoginPath()).toBeNull();
  });
});
