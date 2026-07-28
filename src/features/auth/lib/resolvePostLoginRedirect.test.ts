import { beforeEach, describe, expect, it } from 'vitest';
import { resolvePostLoginRedirect } from './resolvePostLoginRedirect';
import { getPreLoginPath, PRE_LOGIN_PATH_KEY } from './preLoginPath';

describe('resolvePostLoginRedirect', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('저장된 경로가 있으면 그 경로를 반환하고 저장값을 정리한다', () => {
    sessionStorage.setItem(PRE_LOGIN_PATH_KEY, '/collections/42');

    const result = resolvePostLoginRedirect();

    expect(result).toBe('/collections/42');
    expect(getPreLoginPath()).toBeNull();
  });

  it('저장된 경로가 없으면 메인(/)을 반환한다', () => {
    const result = resolvePostLoginRedirect();

    expect(result).toBe('/');
  });
});
