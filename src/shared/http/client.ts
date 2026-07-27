import axios, { type AxiosError } from 'axios';
import { API_BASE_URL } from '@/config/constants';
import type { ApiError } from './types';

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
// ❌ Authorization Bearer 주입 금지 — 토큰 관리는 BFF가 담당한다(docs/architecture.md 1-1, conventions.md).
httpClient.interceptors.request.use((config) => config);

httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // TODO(BFF): 401 시 처리 방식 협의 대기
      //  - refresh를 BFF가 자동 처리하는지
      //  - 프론트가 refresh 엔드포인트를 호출해야 하는지
      //  - 재발급 실패 시 로그인 화면 리다이렉트
      // 현재는 별도 분기 없이 reject만 한다.
    }

    return Promise.reject(error);
  },
);
