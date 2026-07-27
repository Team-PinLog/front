/**
 * 서버 공통 응답 타입.
 * 근거: docs/api-contract.md [확정] 공통 · 페이지네이션, docs/reference/08_API_명세.md 11.0 ApiResponse<T>.
 */

// docs/reference/08_API_명세.md 11.0 확정: { field, message }.
export interface FieldError {
  field: string;
  message: string;
}

/** 서버 에러 봉투의 error 필드. */
export interface ServerApiError {
  code: string;
  message: string;
  fieldErrors: FieldError[];
  traceId: string;
  // 일부 code는 추가 필드를 더한다. 예: DELETE_CONFIRMATION_REQUIRED → impact(08_API_명세 11.0, 5.6·5.7).
  impact?: { recordDeleted: boolean; collectionIds: number[] };
}

/**
 * httpClient가 호출부에 던지는 통일된 에러 형태.
 * status는 서버 봉투 필드가 아니라 클라이언트가 HTTP 상태 코드를 보존하기 위해 붙인다
 * (다음 401 single-flight 재발급 작업에서 판단 기준으로 사용).
 */
export interface ApiError extends ServerApiError {
  status: number | null;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: ServerApiError;
}

/** 08_API_명세 11.0: 모든 응답의 봉투. 204는 봉투가 적용되지 않으므로 이 타입으로 파싱하지 않는다. */
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasNext: boolean;
}
