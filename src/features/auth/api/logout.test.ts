import { afterEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '@/shared/http/client';
import { logoutRequest } from './logout';

describe('logoutRequest', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('POST /auth/logout을 호출한다', async () => {
    const postSpy = vi.spyOn(httpClient, 'post').mockResolvedValue({ status: 204, data: '' });

    await logoutRequest();

    expect(postSpy).toHaveBeenCalledWith('/auth/logout');
  });
});
