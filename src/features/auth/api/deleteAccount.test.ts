import { describe, expect, it, vi } from 'vitest';
import { httpClient } from '@/shared/http/client';
import { deleteAccount } from './deleteAccount';

vi.mock('@/shared/http/client', () => ({
  httpClient: { delete: vi.fn() },
}));

describe('deleteAccount', () => {
  it('응답의 authorizationUrl을 돌려준다', async () => {
    // 이 값을 버리면 왕복을 시작할 수 없다. 화면은 "탈퇴 완료"를 띄우고 이동하지만
    // 서버는 아무것도 지우지 않은 상태라, 사용자에게 거짓을 말하게 된다.
    vi.mocked(httpClient.delete).mockResolvedValue({
      data: { authorizationUrl: '/api/core/v1/auth/authorize/google?ticket=stub' },
    });

    await expect(deleteAccount()).resolves.toEqual({
      authorizationUrl: '/api/core/v1/auth/authorize/google?ticket=stub',
    });
  });

  it('DELETE /me를 호출한다', async () => {
    vi.mocked(httpClient.delete).mockResolvedValue({ data: { authorizationUrl: '/x' } });

    await deleteAccount();

    expect(httpClient.delete).toHaveBeenCalledWith('/me');
  });
});
