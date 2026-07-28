import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearPreLoginPath,
  getPreLoginPath,
  PRE_LOGIN_PATH_KEY,
  savePreLoginPath,
} from './preLoginPath';

describe('savePreLoginPath', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('전달된 경로를 sessionStorage에 저장한다', () => {
    savePreLoginPath('/collections/42');

    expect(sessionStorage.getItem(PRE_LOGIN_PATH_KEY)).toBe('/collections/42');
  });

  it('/login 경로는 저장하지 않는다', () => {
    savePreLoginPath('/login');

    expect(sessionStorage.getItem(PRE_LOGIN_PATH_KEY)).toBeNull();
  });

  it('/login에서 호출해도 이전에 저장된 값은 지우지 않는다(새로고침 후 재클릭 등)', () => {
    savePreLoginPath('/collections/42');

    savePreLoginPath('/login');

    expect(sessionStorage.getItem(PRE_LOGIN_PATH_KEY)).toBe('/collections/42');
  });

  it('인자를 생략하면 window.location.pathname을 사용한다', () => {
    const original = window.location.pathname;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, pathname: '/feed' },
    });

    savePreLoginPath();

    expect(sessionStorage.getItem(PRE_LOGIN_PATH_KEY)).toBe('/feed');

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, pathname: original },
    });
  });
});

describe('getPreLoginPath', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('저장된 값이 있으면 반환한다', () => {
    sessionStorage.setItem(PRE_LOGIN_PATH_KEY, '/collections/42');

    expect(getPreLoginPath()).toBe('/collections/42');
  });

  it('저장된 값이 없으면 null을 반환한다', () => {
    expect(getPreLoginPath()).toBeNull();
  });
});

describe('clearPreLoginPath', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('저장된 값을 제거한다', () => {
    sessionStorage.setItem(PRE_LOGIN_PATH_KEY, '/collections/42');

    clearPreLoginPath();

    expect(getPreLoginPath()).toBeNull();
  });

  it('저장된 값이 없어도 에러 없이 동작한다', () => {
    expect(() => clearPreLoginPath()).not.toThrow();
  });
});
