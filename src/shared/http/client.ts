import axios, { type AxiosError, type AxiosResponse } from 'axios';
import { API_BASE_URL } from '@/config/constants';
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

// 요청 인터셉터 자리.
// ❌ Authorization Bearer 주입 금지 — 토큰 관리는 서버가 담당한다(docs/architecture.md 1-1, conventions.md).
// TODO(인증 티켓): 상태 변경 요청(POST/PUT/PATCH/DELETE)에 X-XSRF-TOKEN 헤더 부착 예정(api-contract.md CSRF).
httpClient.interceptors.request.use((config) => config);

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

/**
 * 실패 응답 처리. 원인에 관계없이 항상 ApiError로 통일해서 reject한다 — 호출부는 항상 ApiError를 받는다고 가정할 수 있다.
 * status는 다음 401 single-flight 재발급 작업의 판단 기준이므로 항상 보존한다.
 * TODO(인증 티켓): status === 401이면 여기서 /auth/refresh를 single-flight로 호출해 원 요청을 재시도.
 *  재발급 자체의 401은 재시도하지 않고 즉시 재로그인으로 유도한다(api-contract.md 401 처리).
 */
export function handleResponseError(error: AxiosError): never {
  const status = error.response?.status ?? null;
  const serverError = toServerError(error.response?.data);

  throw buildApiError(serverError, status, error.message || '요청 처리 중 오류가 발생했습니다.');
}

httpClient.interceptors.response.use(handleResponseSuccess, handleResponseError);
