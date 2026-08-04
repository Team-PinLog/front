import { httpClient } from '@/shared/http/client';

export interface WithdrawalStart {
  /**
   * 공급자 인가 진입 주소.
   * 서버 상대경로일 수도, 공급자 절대 URL일 수도 있다 — **해석하지 않고 이동만 한다.**
   */
  authorizationUrl: string;
}

/**
 * ⭐ 표준 패턴: 화면(Component) → Hook → API 함수(여기) → httpClient.
 *
 * 근거: docs/reference/08_API_명세.md 3.6 — 회원 탈퇴.
 *
 * **이 요청은 아직 아무것도 지우지 않는다.** 탈퇴는 두 단계다. 서버가 공급자 연결을 끊으려면
 * 공급자가 발급한 토큰이 필요한데 로그인 시 그것을 보관하지 않으므로, 탈퇴 시점에 인가를 한 번
 * 더 받는다. 여기서 받은 주소로 **페이지를 이동**하면 그 왕복이 시작되고, 콜백에서 연결 해제가
 * 성공한 경우에만 삭제가 일어난다.
 */
export async function deleteAccount(): Promise<WithdrawalStart> {
  const response = await httpClient.delete<WithdrawalStart>('/me');
  return response.data;
}
