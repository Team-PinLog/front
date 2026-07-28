import { beforeEach, describe, expect, it } from 'vitest';
import { getIsLoggedIn } from './getIsLoggedIn';

function clearCookies() {
  for (const pair of document.cookie.split('; ')) {
    const name = pair.split('=')[0];
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }
}

describe('getIsLoggedIn', () => {
  beforeEach(clearCookies);

  it('logged_in=1 쿠키가 있으면 true를 반환한다', () => {
    document.cookie = 'logged_in=1';

    expect(getIsLoggedIn()).toBe(true);
  });

  it('logged_in 쿠키가 없으면 false를 반환한다', () => {
    document.cookie = 'other=value';

    expect(getIsLoggedIn()).toBe(false);
  });

  it('다른 쿠키와 함께 있어도 정확히 판별한다', () => {
    document.cookie = 'XSRF-TOKEN=abc';
    document.cookie = 'logged_in=1';

    expect(getIsLoggedIn()).toBe(true);
  });
});
