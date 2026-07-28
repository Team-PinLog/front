import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isRedirect } from '@tanstack/react-router';
import { handleOAuthCallback } from './handleOAuthCallback';
import { getPreLoginPath, PRE_LOGIN_PATH_KEY } from './preLoginPath';

function getRedirectTarget(thrown: unknown): string {
  return (thrown as { options: { to: string } }).options.to;
}

describe('handleOAuthCallback', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('성공(error 없음)', () => {
    it('저장된 경로가 있으면 그 경로로 리다이렉트하고 저장값을 정리한다', () => {
      sessionStorage.setItem(PRE_LOGIN_PATH_KEY, '/collections/42');

      expect.assertions(3);
      try {
        handleOAuthCallback({ search: {} });
      } catch (thrown) {
        expect(isRedirect(thrown)).toBe(true);
        expect(getRedirectTarget(thrown)).toBe('/collections/42');
      }
      expect(getPreLoginPath()).toBeNull();
    });

    it('저장된 경로가 없으면 메인(/)으로 리다이렉트한다', () => {
      expect.assertions(2);
      try {
        handleOAuthCallback({ search: {} });
      } catch (thrown) {
        expect(isRedirect(thrown)).toBe(true);
        expect(getRedirectTarget(thrown)).toBe('/');
      }
    });
  });

  describe('실패(error=OAUTH_FAILED)', () => {
    let alertSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    });

    afterEach(() => {
      alertSpy.mockRestore();
    });

    it('실패 알림을 표시하고 /login으로 리다이렉트한다', () => {
      expect.assertions(3);
      try {
        handleOAuthCallback({ search: { error: 'OAUTH_FAILED' } });
      } catch (thrown) {
        expect(isRedirect(thrown)).toBe(true);
        expect(getRedirectTarget(thrown)).toBe('/login');
      }
      expect(alertSpy).toHaveBeenCalledTimes(1);
    });

    it('저장된 복귀 경로가 있어도 사용하지 않고 지우지도 않는다', () => {
      sessionStorage.setItem(PRE_LOGIN_PATH_KEY, '/collections/42');

      expect.assertions(2);
      try {
        handleOAuthCallback({ search: { error: 'OAUTH_FAILED' } });
      } catch (thrown) {
        expect(getRedirectTarget(thrown)).toBe('/login');
      }
      expect(getPreLoginPath()).toBe('/collections/42');
    });
  });
});
