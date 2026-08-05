import axios, { type AxiosError } from 'axios';
import { IMAGE_API_BASE_URL } from '@/config/constants';

/**
 * 317: AI 파트 이미지 서비스(Collection 표지 생성) 전용 Axios 인스턴스.
 *
 * **httpClient를 재사용할 수 없다.** 두 가지가 다르다.
 *  1. baseURL — httpClient는 `/api/core/v1`이고 이쪽은 `/image/api`다. 아예 다른 서비스다.
 *  2. 응답 형태 — core는 `{ success, data }` 봉투를 쓰고 httpClient 인터셉터가 그걸 벗기는데,
 *     이미지 API는 **봉투 없는 원시 JSON**을 반환한다. httpClient로 부르면 언랩 로직이
 *     `success` 키를 못 찾아 그대로 통과시키긴 하지만, 401 재발급·CSRF 헤더 같은 core 전용
 *     인터셉터가 함께 붙는다. 이미지 서비스는 그 어느 것도 쓰지 않는다.
 *
 * 인증 헤더를 붙이지 않는다 — front#99 가이드의 호출 예제에 인증이 없다. 다만 비로그인 허용
 * 여부·rate limit은 아직 미확정이라(docs/api-contract.md [협의 필요]), **인증이 붙게 되면 이
 * 파일 한 곳만 고치면 되도록** 이미지 서비스 호출을 전부 이 인스턴스로 모은다.
 * same-origin 요청이라 브라우저가 쿠키는 어차피 함께 보낸다(withCredentials는 교차 출처에만
 * 영향을 준다) — 서버가 무시할 뿐이다.
 *
 * ❌ WORKER_TOKEN을 이 파일에도, VITE_* 환경변수에도 넣지 않는다. `/image/jobs/*`도 호출하지
 *    않는다 — 워커 전용 경로다(docs/api-contract.md Collection 표지 생성).
 */
export const imageClient = axios.create({
  baseURL: IMAGE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 이미지 서비스 호출 실패.
 *
 * ⚠️ **"GPU 작업 실패"와 다른 것이다.** 잡 실패는 200 응답 본문의 `status: "failed"`로 오고,
 * 이 오류는 요청 자체가 실패한 경우(네트워크 끊김, 404, 422, 5xx)다. 화면에서 둘을 구분해
 * 안내해야 해서(front#99 UX 권장사항) 타입을 분리한다.
 */
export interface ImageApiError {
  /** HTTP 상태. 응답을 못 받았으면(네트워크 오류·타임아웃) null. */
  status: number | null;
  message: string;
}

/** 응답을 받지 못한 경우 status가 null이라는 사실로 네트워크 오류를 구분한다. */
export function isNetworkError(error: ImageApiError): boolean {
  return error.status === null;
}

const MESSAGE_BY_STATUS: Record<number, string> = {
  // front#99 오류 표: 404는 잘못되었거나 존재하지 않는 request_id.
  404: '표지 생성 요청을 찾을 수 없어요. 다시 시도해 주세요.',
  // 422는 요청 필드 누락 또는 잘못된 style_id — 프론트 버그이거나 계약 변경이다.
  422: '표지 생성 요청이 올바르지 않아요. 다시 시도해 주세요.',
};

function toMessage(status: number | null): string {
  if (status === null) {
    return '네트워크 연결을 확인해 주세요.';
  }
  if (MESSAGE_BY_STATUS[status]) {
    return MESSAGE_BY_STATUS[status];
  }
  if (status >= 500) {
    return '표지 생성 서비스가 일시적으로 응답하지 않아요. 잠시 후 다시 시도해 주세요.';
  }
  return '표지 생성 요청에 실패했어요.';
}

/**
 * 호출부가 항상 ImageApiError를 받는다고 가정할 수 있도록 실패를 한 형태로 통일한다
 * (httpClient의 handleResponseError와 같은 취지 — 다만 봉투가 없어 서버 error 코드를 꺼낼 게 없다).
 */
imageClient.interceptors.response.use(undefined, (error: AxiosError) => {
  const status = error.response?.status ?? null;
  const imageApiError: ImageApiError = { status, message: toMessage(status) };
  return Promise.reject(imageApiError);
});
