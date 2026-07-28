import { API_BASE_URL } from '@/config/constants';

export type SocialProvider = 'google' | 'kakao' | 'naver';

/**
 * 페이지 전체 이동으로 공급자 로그인을 시작한다.
 * ⚠️ axios/fetch로 호출하면 공급자 리다이렉트가 동작하지 않는다(api-contract.md [확정] 소셜 로그인).
 */
export function redirectToProviderLogin(provider: SocialProvider): void {
  window.location.href = `${API_BASE_URL}/auth/${provider}/login`;
}
