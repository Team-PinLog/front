import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios, { AxiosHeaders, type AxiosError, type AxiosResponse } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { getPreLoginPath } from '@/features/auth/lib/preLoginPath';
import {
  attachXsrfHeader,
  extractXsrfTokenFromCookie,
  handleResponseError,
  handleResponseSuccess,
  httpClient,
} from './client';

const navigateMock = vi.fn();
vi.mock('@/app/router', () => ({
  router: { navigate: (...args: unknown[]) => navigateMock(...args) },
}));

function clearCookies() {
  for (const pair of document.cookie.split('; ')) {
    const name = pair.split('=')[0];
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }
}

function fakeRequestConfig(method: string, url = '/records'): InternalAxiosRequestConfig {
  return { method, url, headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
}

function fakeResponse(status: number, data: unknown): AxiosResponse {
  return { status, data } as AxiosResponse;
}

function fakeAxiosError(options: {
  status?: number;
  data?: unknown;
  message?: string;
  config?: InternalAxiosRequestConfig;
}): AxiosError {
  const { status, data, message, config } = options;
  return {
    isAxiosError: true,
    message: message ?? 'Error',
    response: status === undefined ? undefined : fakeResponse(status, data),
    config,
  } as AxiosError;
}

function fakeUnauthorizedErrorData() {
  return {
    success: false as const,
    error: {
      code: 'UNAUTHORIZED',
      message: '인증이 필요합니다.',
      fieldErrors: [],
      traceId: 't-1',
    },
  };
}

describe('extractXsrfTokenFromCookie', () => {
  beforeEach(clearCookies);

  it('XSRF-TOKEN 쿠키가 있으면 값을 반환한다', () => {
    document.cookie = 'XSRF-TOKEN=abc123';

    expect(extractXsrfTokenFromCookie()).toBe('abc123');
  });

  it('XSRF-TOKEN 쿠키가 없으면 undefined를 반환한다', () => {
    document.cookie = 'other=value';

    expect(extractXsrfTokenFromCookie()).toBeUndefined();
  });

  it('여러 쿠키 중 XSRF-TOKEN만 추출한다', () => {
    document.cookie = 'logged_in=1';
    document.cookie = 'XSRF-TOKEN=token-value';
    document.cookie = 'session=xyz';

    expect(extractXsrfTokenFromCookie()).toBe('token-value');
  });

  it('특수문자(URL 인코딩)를 포함한 값도 디코딩해서 반환한다', () => {
    const raw = 'a+b/c=d';
    document.cookie = `XSRF-TOKEN=${encodeURIComponent(raw)}`;

    expect(extractXsrfTokenFromCookie()).toBe(raw);
  });

  it('잘못된 퍼센트 인코딩이면 크래시 없이 undefined를 반환한다', () => {
    document.cookie = 'XSRF-TOKEN=%';

    expect(extractXsrfTokenFromCookie()).toBeUndefined();
  });
});

describe('attachXsrfHeader', () => {
  beforeEach(clearCookies);

  it.each(['post', 'put', 'patch', 'delete'])(
    '%s 요청에는 X-XSRF-TOKEN 헤더를 붙인다',
    (method) => {
      document.cookie = 'XSRF-TOKEN=csrf-token';

      const config = attachXsrfHeader(fakeRequestConfig(method));

      expect(config.headers.get('X-XSRF-TOKEN')).toBe('csrf-token');
    },
  );

  it('GET 요청에는 헤더를 붙이지 않는다', () => {
    document.cookie = 'XSRF-TOKEN=csrf-token';

    const config = attachXsrfHeader(fakeRequestConfig('get'));

    expect(config.headers.get('X-XSRF-TOKEN')).toBeUndefined();
  });

  it('대문자 method(POST)도 상태 변경 요청으로 판별한다', () => {
    document.cookie = 'XSRF-TOKEN=csrf-token';

    const config = attachXsrfHeader(fakeRequestConfig('POST'));

    expect(config.headers.get('X-XSRF-TOKEN')).toBe('csrf-token');
  });

  it('쿠키가 없으면 헤더를 생략한다(크래시 없음)', () => {
    const config = attachXsrfHeader(fakeRequestConfig('post'));

    expect(config.headers.get('X-XSRF-TOKEN')).toBeUndefined();
  });

  it('Authorization 헤더를 주입하지 않는다', () => {
    document.cookie = 'XSRF-TOKEN=csrf-token';

    const config = attachXsrfHeader(fakeRequestConfig('post'));

    expect(config.headers.get('Authorization')).toBeUndefined();
  });
});

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

describe('handleResponseError - 401 single-flight 재발급', () => {
  beforeEach(() => {
    sessionStorage.clear();
    navigateMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('401 응답이면 refresh 후 원 요청을 재시도해 성공한다', async () => {
    const refreshSpy = vi.spyOn(axios, 'post').mockResolvedValue(fakeResponse(204, ''));
    const retryResponse = fakeResponse(200, { ok: true });
    const requestSpy = vi.spyOn(httpClient, 'request').mockResolvedValue(retryResponse);

    const config = fakeRequestConfig('get');
    const error = fakeAxiosError({ status: 401, data: fakeUnauthorizedErrorData(), config });

    const result = await handleResponseError(error);

    expect(refreshSpy).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      undefined,
      expect.objectContaining({ withCredentials: true }),
    );
    expect(requestSpy).toHaveBeenCalledWith(expect.objectContaining({ _retry: true }));
    expect(result).toBe(retryResponse);
  });

  it('동시에 여러 요청이 401을 받아도 refresh는 한 번만 호출된다', async () => {
    let resolveRefresh: (() => void) | undefined;
    const refreshPromise = new Promise<AxiosResponse>((resolve) => {
      resolveRefresh = () => resolve(fakeResponse(204, ''));
    });
    const refreshSpy = vi.spyOn(axios, 'post').mockReturnValue(refreshPromise);
    const requestSpy = vi
      .spyOn(httpClient, 'request')
      .mockResolvedValue(fakeResponse(200, { ok: true }));

    const errors = [1, 2, 3].map((i) => {
      const config = fakeRequestConfig('get', `/records/${i}`);
      return fakeAxiosError({ status: 401, data: fakeUnauthorizedErrorData(), config });
    });

    const resultsPromise = Promise.all(errors.map((error) => handleResponseError(error)));
    resolveRefresh?.();
    await resultsPromise;

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(requestSpy).toHaveBeenCalledTimes(3);
  });

  it('refresh 요청 자체가 401이면 재시도 없이 ApiError(status:401)로 reject한다', async () => {
    const refreshError = fakeAxiosError({ status: 401, data: fakeUnauthorizedErrorData() });
    vi.spyOn(axios, 'post').mockRejectedValue(refreshError);
    const requestSpy = vi.spyOn(httpClient, 'request');

    const config = fakeRequestConfig('get');
    const error = fakeAxiosError({ status: 401, data: fakeUnauthorizedErrorData(), config });

    expect.assertions(2);
    try {
      await handleResponseError(error);
    } catch (apiError) {
      expect(apiError).toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
    }
    expect(requestSpy).not.toHaveBeenCalled();
  });

  it('refresh 요청 자체가 401이면 현재 경로를 저장하고 /login으로 재로그인 유도한다', async () => {
    const refreshError = fakeAxiosError({ status: 401, data: fakeUnauthorizedErrorData() });
    vi.spyOn(axios, 'post').mockRejectedValue(refreshError);

    const config = fakeRequestConfig('get', '/records/1');
    const error = fakeAxiosError({ status: 401, data: fakeUnauthorizedErrorData(), config });

    await expect(handleResponseError(error)).rejects.toMatchObject({ status: 401 });
    // redirectToLogin은 동적 import(비동기 모듈 로드) 이후 navigate를 호출하므로 완료될 때까지 기다린다.
    await vi.waitFor(() => expect(navigateMock).toHaveBeenCalled());

    expect(navigateMock).toHaveBeenCalledWith({ to: '/login' });
    expect(getPreLoginPath()).toBe(window.location.pathname);
  });

  it('재시도한 요청도 401이면 더 이상 재시도하지 않고 reject한다(무한 루프 방지)', async () => {
    const refreshSpy = vi.spyOn(axios, 'post').mockResolvedValue(fakeResponse(204, ''));
    vi.spyOn(httpClient, 'request').mockImplementation((cfg) => {
      const retriedError = fakeAxiosError({
        status: 401,
        data: fakeUnauthorizedErrorData(),
        config: cfg as InternalAxiosRequestConfig,
      });
      return Promise.reject(retriedError).catch((e) => handleResponseError(e as AxiosError));
    });

    const config = fakeRequestConfig('get');
    const error = fakeAxiosError({ status: 401, data: fakeUnauthorizedErrorData(), config });

    expect.assertions(2);
    try {
      await handleResponseError(error);
    } catch (apiError) {
      expect(apiError).toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
    }
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });
});
