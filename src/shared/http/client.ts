import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/config/constants';
import { queryClient } from '@/app/queryClient';
import { savePreLoginPath } from '@/features/auth/lib/preLoginPath';
import type { ApiError, ApiResponse, ServerApiError } from './types';

/**
 * 공통 Axios 인스턴스.
 * 근거: docs/api-contract.md [확정] 공통, docs/architecture.md 1-1(인증/BFF).
 */
export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  // BFF 쿠키 인증 전제. [확정]
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
const XSRF_HEADER_NAME = 'X-XSRF-TOKEN';
const MUTATION_METHODS = new Set(['post', 'put', 'patch', 'delete']);

/** document.cookie에서 XSRF-TOKEN 값만 추출한다. 없으면 undefined(에러로 취급하지 않음). */
export function extractXsrfTokenFromCookie(): string | undefined {
  const entry = document.cookie.split('; ').find((pair) => pair.startsWith(`${XSRF_COOKIE_NAME}=`));
  if (!entry) {
    return undefined;
  }
  const value = entry.slice(XSRF_COOKIE_NAME.length + 1);
  if (!value) {
    return undefined;
  }
  try {
    // 잘못된 퍼센트 인코딩은 무시(크래시 대신 헤더 생략으로 처리).
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

/**
 * 상태 변경 요청(POST/PUT/PATCH/DELETE)에만 X-XSRF-TOKEN 헤더를 붙인다(api-contract.md [확정] CSRF).
 * ❌ Authorization Bearer 주입 금지 — 토큰 관리는 서버가 담당한다(docs/architecture.md 1-1, conventions.md).
 */
export function attachXsrfHeader(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const method = config.method?.toLowerCase();
  if (!method || !MUTATION_METHODS.has(method)) {
    return config;
  }

  const xsrfToken = extractXsrfTokenFromCookie();
  if (xsrfToken) {
    config.headers.set(XSRF_HEADER_NAME, xsrfToken);
  }
  return config;
}

httpClient.interceptors.request.use(attachXsrfHeader);

function isEnvelope(data: unknown): data is ApiResponse<unknown> {
  return typeof data === 'object' && data !== null && 'success' in data;
}

/** success:false 봉투에서만 서버 error를 꺼낸다. 봉투가 아니거나 success:true면 undefined. */
function toServerError(data: unknown): ServerApiError | undefined {
  if (isEnvelope(data) && !data.success) {
    return data.error;
  }
  return undefined;
}

function buildApiError(
  serverError: ServerApiError | undefined,
  status: number | null,
  fallbackMessage: string,
): ApiError {
  if (serverError) {
    return { ...serverError, status };
  }
  // 봉투가 아닌 응답(게이트웨이 에러 페이지 등)이거나 응답 자체가 없는 경우(네트워크 끊김·타임아웃).
  return {
    code: status === null ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR',
    message: fallbackMessage,
    fieldErrors: [],
    traceId: '',
    status,
  };
}

/**
 * 성공 응답 처리.
 * - 봉투({ success, data })면 data만 꺼내 response.data에 채운다(언랩). 호출부는 봉투를 모르고 data만 다룬다.
 * - success:false가 2xx로 오는 경우까지 방어적으로 ApiError로 통일해서 던진다.
 * - 봉투가 아닌 응답(204 등 본문 없는 응답 포함)은 그대로 통과시킨다 — 언랩을 시도하지 않는다.
 */
export function handleResponseSuccess(response: AxiosResponse): AxiosResponse {
  const body: unknown = response.data;

  if (!isEnvelope(body)) {
    return response;
  }

  if (body.success) {
    response.data = body.data;
    return response;
  }

  throw buildApiError(body.error, response.status, body.error.message);
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<void> | null = null;

/**
 * 탭·창 사이의 재발급 직렬화에 쓰는 Web Locks 이름.
 * 값 자체에 의미는 없고 같은 오리진의 모든 탭이 같은 문자열을 써야 한다는 점만 중요하다.
 */
const REFRESH_LOCK_NAME = 'pinlog:auth-refresh';

/** 실제 재발급 호출. 락 안에서만 부른다. */
function postRefresh(): Promise<void> {
  return axios
    .post(`${API_BASE_URL}/auth/refresh`, undefined, { withCredentials: true })
    .then(() => undefined);
}

/**
 * 재발급을 탭 간에도 직렬화한다(11_인증_설계.md 4.4 — "탭·창 사이에서도 하나로 묶어야 합니다").
 *
 * 인증 쿠키는 오리진 단위로 탭이 공유하는데 Refresh는 회전 발급이라, 탭마다 따로 묶으면 두 탭이
 * 같은 Refresh 토큰으로 동시에 회전시켜 늦게 도착한 쪽이 401을 받고 사용자가 로그아웃된다.
 *
 * BroadcastChannel이 아니라 Web Locks를 쓴다 — BroadcastChannel은 메시지 전달 수단일 뿐이라
 * 상호배제를 직접 구현해야 하고(리더 선출·타임아웃), 락을 쥔 탭이 닫히면 남은 탭이 영구히 대기한다.
 * Web Locks는 브라우저가 상호배제를 보장하고 탭이 죽으면 락을 자동 회수한다.
 *
 * 락은 "동시 호출"만 막고 "중복 호출"은 막지 않는다 — 두 번째 탭은 락을 얻은 뒤 이미 회전된
 * 새 Refresh 쿠키로 다시 재발급하므로 성공한다. 문제였던 것은 순서가 아니라 동시성이다.
 *
 * navigator.locks가 없는 환경(구형 Safari, 비보안 컨텍스트, 테스트 환경)에서는 탭 내 single-flight로
 * 폴백한다 — 크로스탭 보장이 없어질 뿐 기존 동작보다 나빠지지 않는다.
 */
function withRefreshLock(run: () => Promise<void>): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.locks) {
    return run();
  }
  return navigator.locks.request(REFRESH_LOCK_NAME, run);
}

/**
 * 401 재발급을 single-flight로 처리한다(api-contract.md [확정] 401 처리).
 * 탭 안에서는 진행 중인 refresh Promise를 공유해 /auth/refresh 호출이 하나만 나가고,
 * 탭 사이에서는 Web Locks가 그 호출을 직렬화한다.
 */
function refreshAccessToken(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = withRefreshLock(postRefresh).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * 재발급 자체가 401로 실패했을 때 재로그인 화면으로 유도한다(architecture.md 1-1).
 * router.tsx를 정적 import하면 router.tsx → (pages) → ... → client.ts 기존 의존 체인과
 * 순환 참조가 생기므로 호출 시점에 동적 import로 가져온다.
 * queryClient.ts는 '@tanstack/react-query'만 의존하는 leaf 모듈이라 순환 참조가 없어 정적 import한다.
 *
 * cancelQueries()가 끝나기 전에 navigate가 먼저 실행되면 in-flight 쿼리들이 그 사이에 계속 401을
 * 받아 각자 refresh를 재유발해 루프가 길어질 수 있다(S15P11A705-256). 이를 막기 위해 취소 완료를
 * await한 뒤 navigate한다. 특정 쿼리키만 취소하면 이 함수를 거치는 모든 인증 필수 쿼리(map 외
 * records/$recordId, feed, shelf, library 등)를 여기서 일일이 나열해야 하므로, 401 재로그인이라는
 * 전역 이벤트의 의미에 맞게 무조건 전체 취소한다.
 * cancelQueries()가 reject해도(거의 없지만) 재로그인 이동 자체는 막지 않아야 하므로 실패를 무시하고
 * navigate는 항상 실행한다.
 */
async function redirectToLogin(): Promise<void> {
  savePreLoginPath();
  try {
    await queryClient.cancelQueries();
  } catch {
    // 쿼리 취소 실패는 재로그인 이동을 막을 이유가 아니므로 무시한다.
  }
  const { router } = await import('@/app/router');
  void router.navigate({ to: '/login' });
}

/**
 * 실패 응답 처리.
 * - 401이면 /auth/refresh(single-flight)로 재발급 후 원 요청을 1회 재시도한다.
 * - 재발급 자체가 401이거나, 재시도한 요청이 다시 401이면 더 이상 재시도하지 않고
 *   재로그인 화면으로 유도한 뒤 ApiError(status:401)로 reject한다.
 * - 401이 아닌 실패는 원인에 관계없이 항상 ApiError로 통일해서 reject한다 — 호출부는 항상 ApiError를 받는다고 가정할 수 있다.
 *
 * ❌ 503을 401과 같은 분기로 묶지 않는다(11_인증_설계.md 4.4). 503은 자격증명을 거절한 것이 아니라
 * 인증 여부를 확인하지 못한 상태라 재발급해도 같은 결과가 반복되고, 세션을 버리면 일시적 장애가
 * 전체 로그아웃으로 번진다. 여기서는 세션을 유지한 채 ApiError로 넘기고 재시도·오류 표시는 호출부가 정한다.
 */
export function handleResponseError(error: AxiosError): Promise<AxiosResponse> | never {
  const status = error.response?.status ?? null;
  const config = error.config as RetryableRequestConfig | undefined;

  if (status === 401 && config && !config._retry) {
    config._retry = true;
    return refreshAccessToken().then(
      () => httpClient.request(config),
      (refreshError: AxiosError) => {
        // 재로그인 이동(쿼리 취소 → navigate)은 이 reject 체인의 결과와 무관한 side effect라
        // 호출부가 완료를 기다릴 필요가 없다 — fire-and-forget으로 의도를 명시한다.
        void redirectToLogin();
        throw buildApiError(
          toServerError(refreshError.response?.data),
          refreshError.response?.status ?? 401,
          refreshError.message || '인증이 만료되었습니다.',
        );
      },
    );
  }

  const serverError = toServerError(error.response?.data);
  throw buildApiError(serverError, status, error.message || '요청 처리 중 오류가 발생했습니다.');
}

httpClient.interceptors.response.use(handleResponseSuccess, handleResponseError);
