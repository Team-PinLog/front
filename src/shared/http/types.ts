/**
 * 서버 공통 응답 타입.
 * 근거: docs/api-contract.md [확정] 공통 · 페이지네이션
 */

// docs/api-contract.md: 필드 단위 검증 오류 형태는 명세에 없어 { field, message }로 추정.
// 명세 확정 시(08_API_명세) 이 타입을 교체한다.
export interface FieldError {
  field: string;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  fieldErrors: FieldError[];
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasNext: boolean;
}
