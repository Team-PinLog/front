import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면(Component) → Hook → API 함수(여기) → httpClient.
 *
 * ⚠️ 이 구현은 옛 계약(204 = 탈퇴 완료) 기준이라 현재 서버 동작과 어긋난다.
 * 08_API_명세.md 3.6이 탈퇴를 2단계로 개정해, `DELETE /me`는 이제 `200 { authorizationUrl }`을
 * 돌려주고 **이 시점에는 아무것도 삭제되지 않는다** — 프론트가 그 URL로 페이지 이동해 공급자 인가를
 * 마쳐야 서버가 연결 해제 후 삭제한다. 지금 코드는 응답 본문을 버리고 성공으로 간주하므로
 * 화면이 "탈퇴가 완료되었습니다"를 띄우지만 계정은 그대로 남는다.
 *
 * 2단계 흐름 구현은 별도 티켓으로 분리했다(docs/api-contract.md [확정] "회원 탈퇴 — 2단계").
 * 여기서 반쪽만 고치면(응답 파싱만 추가) 콜백 처리가 없어 상태가 더 나빠지므로 손대지 않는다.
 */
export async function deleteAccount(): Promise<void> {
  await httpClient.delete('/me');
}
