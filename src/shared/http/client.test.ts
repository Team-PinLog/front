import { describe, expect, it } from 'vitest';
import type { AxiosError, AxiosResponse } from 'axios';
import { handleResponseError, handleResponseSuccess } from './client';

function fakeResponse(status: number, data: unknown): AxiosResponse {
  return { status, data } as AxiosResponse;
}

function fakeAxiosError(options: {
  status?: number;
  data?: unknown;
  message?: string;
}): AxiosError {
  const { status, data, message } = options;
  return {
    isAxiosError: true,
    message: message ?? 'Error',
    response: status === undefined ? undefined : fakeResponse(status, data),
  } as AxiosError;
}

describe('handleResponseSuccess', () => {
  it('성공 봉투(success:true)는 data만 반환한다', () => {
    const response = fakeResponse(200, { success: true, data: { foo: 'bar' } });

    const result = handleResponseSuccess(response);

    expect(result.data).toEqual({ foo: 'bar' });
  });

  it('204(본문 없음)는 언랩하지 않고 그대로 통과시킨다', () => {
    const response = fakeResponse(204, '');

    const result = handleResponseSuccess(response);

    expect(result.data).toBe('');
    expect(result.status).toBe(204);
  });
});

describe('handleResponseError', () => {
  it('에러 봉투(success:false)는 ApiError로 통일해서 reject한다', () => {
    const error = fakeAxiosError({
      status: 404,
      data: {
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: '요청한 리소스를 찾을 수 없습니다.',
          fieldErrors: [],
          traceId: '3f1c9a7e-58b2-4d6a-9f0e-7c2b1d4e8a55',
        },
      },
    });

    expect.assertions(1);
    try {
      handleResponseError(error);
    } catch (apiError) {
      expect(apiError).toEqual({
        code: 'RESOURCE_NOT_FOUND',
        message: '요청한 리소스를 찾을 수 없습니다.',
        fieldErrors: [],
        traceId: '3f1c9a7e-58b2-4d6a-9f0e-7c2b1d4e8a55',
        status: 404,
      });
    }
  });

  it('봉투 없는 에러 응답(예: 게이트웨이 에러 페이지)은 ApiError로 감싸고 status를 보존한다', () => {
    const error = fakeAxiosError({ status: 502, data: '<html>Bad Gateway</html>' });

    expect.assertions(1);
    try {
      handleResponseError(error);
    } catch (apiError) {
      expect(apiError).toMatchObject({ code: 'UNKNOWN_ERROR', status: 502 });
    }
  });

  it('응답 자체가 없는 네트워크 에러는 ApiError로 감싸고 status를 null로 보존한다', () => {
    const error = fakeAxiosError({ message: 'Network Error' });

    expect.assertions(1);
    try {
      handleResponseError(error);
    } catch (apiError) {
      expect(apiError).toEqual({
        code: 'NETWORK_ERROR',
        message: 'Network Error',
        fieldErrors: [],
        traceId: '',
        status: null,
      });
    }
  });
});
