import { afterEach, describe, expect, it, vi } from 'vitest';
import { router } from '@/app/router';
import { logoutRequest } from '../api/logout';
import { logout } from './logout';

vi.mock('../api/logout', () => ({
  logoutRequest: vi.fn(),
}));

describe('logout', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('요청 성공 시 /login으로 이동한다', async () => {
    vi.mocked(logoutRequest).mockResolvedValue(undefined);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(undefined);

    await logout();

    expect(logoutRequest).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith({ to: '/login' });
  });

  it('요청 실패(네트워크 에러 등)해도 /login으로 이동하고 콘솔에만 에러를 남긴다', async () => {
    const requestError = new Error('Network Error');
    vi.mocked(logoutRequest).mockRejectedValue(requestError);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(undefined);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await logout();

    expect(navigateSpy).toHaveBeenCalledWith({ to: '/login' });
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String), requestError);
  });
});
