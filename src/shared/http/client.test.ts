import { beforeEach, describe, expect, it } from 'vitest';
import { AxiosHeaders, type AxiosError, type AxiosResponse } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import {
  attachXsrfHeader,
  extractXsrfTokenFromCookie,
  handleResponseError,
  handleResponseSuccess,
} from './client';

function clearCookies() {
  for (const pair of document.cookie.split('; ')) {
    const name = pair.split('=')[0];
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }
}

function fakeRequestConfig(method: string): InternalAxiosRequestConfig {
  return { method, headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
}

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
