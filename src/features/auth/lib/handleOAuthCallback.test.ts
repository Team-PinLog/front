import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isRedirect } from '@tanstack/react-router';
import { handleOAuthCallback } from './handleOAuthCallback';
import { getPreLoginPath, PRE_LOGIN_PATH_KEY } from './preLoginPath';
import { logoutRequest } from '../api/logout';

vi.mock('../api/logout', () => ({
  logoutRequest: vi.fn(),
}));

function getRedirectTarget(thrown: unknown): string {
  return (thrown as { options: { to: string } }).options.to;
}

describe('handleOAuthCallback', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('성공(error 없음)', () => {
    it('저장된 경로가 있으면 그 경로로 리다이렉트하고 저장값을 정리한다', async () => {
      sessionStorage.setItem(PRE_LOGIN_PATH_KEY, '/collections/42');

      expect.assertions(3);
      try {
        await handleOAuthCallback({ search: {} });
      } catch (thrown) {
        expect(isRedirect(thrown)).toBe(true);
        expect(getRedirectTarget(thrown)).toBe('/collections/42');
      }
      expect(getPreLoginPath()).toBeNull();
    });

    it('저장된 경로가 없으면 메인(/)으로 리다이렉트한다', async () => {
      expect.assertions(2);
      try {
        await handleOAuthCallback({ search: {} });
      } catch (thrown) {
        expect(isRedirect(thrown)).toBe(true);
        expect(getRedirectTarget(thrown)).toBe('/');
      }
    });

    it('로그아웃 API를 호출하지 않는다', async () => {
      expect.assertions(1);
      try {
        await handleOAuthCallback({ search: {} });
      } catch {
        // 리다이렉트만 확인하면 되므로 무시한다.
      }
      expect(logoutRequest).not.toHaveBeenCalled();
    });
  });

  describe('실패(error=OAUTH_FAILED)', () => {
    let alertSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
      vi.mocked(logoutRequest).mockReset();
    });

    afterEach(() => {
      alertSpy.mockRestore();
    });

    it('실패 알림을 표시하고 /login으로 리다이렉트한다', async () => {
      vi.mocked(logoutRequest).mockResolvedValue(undefined);

      expect.assertions(3);
      try {
        await handleOAuthCallback({ search: { error: 'OAUTH_FAILED' } });
      } catch (thrown) {
        expect(isRedirect(thrown)).toBe(true);
        expect(getRedirectTarget(thrown)).toBe('/login');
      }
      expect(alertSpy).toHaveBeenCalledTimes(1);
    });

    it('이전 세션의 logged_in 쿠키를 정리하기 위해 로그아웃 API를 호출한다', async () => {
      vi.mocked(logoutRequest).mockResolvedValue(undefined);

      expect.assertions(1);
      try {
        await handleOAuthCallback({ search: { error: 'OAUTH_FAILED' } });
      } catch {
        // 리다이렉트만 확인하면 되므로 무시한다.
      }
      expect(logoutRequest).toHaveBeenCalledTimes(1);
    });

    it('로그아웃 API가 실패해도 /login으로 이동한다', async () => {
      const requestError = new Error('Network Error');
      vi.mocked(logoutRequest).mockRejectedValue(requestError);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      expect.assertions(2);
      try {
        await handleOAuthCallback({ search: { error: 'OAUTH_FAILED' } });
      } catch (thrown) {
        expect(getRedirectTarget(thrown)).toBe('/login');
      }
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String), requestError);

      consoleErrorSpy.mockRestore();
    });

    it('저장된 복귀 경로가 있어도 사용하지 않고 지우지도 않는다', async () => {
      vi.mocked(logoutRequest).mockResolvedValue(undefined);
      sessionStorage.setItem(PRE_LOGIN_PATH_KEY, '/collections/42');

      expect.assertions(2);
      try {
        await handleOAuthCallback({ search: { error: 'OAUTH_FAILED' } });
      } catch (thrown) {
        expect(getRedirectTarget(thrown)).toBe('/login');
      }
      expect(getPreLoginPath()).toBe('/collections/42');
    });
  });
});
