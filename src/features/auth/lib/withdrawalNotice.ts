/**
 * "이 탭에서 탈퇴를 시작했다"는 표시를 sessionStorage에 보관한다.
 *
 * 탈퇴 성공에는 쿼리 파라미터가 없다(08_API_명세.md §3.6.2 — 성공은 `error` 없이 착지한다).
 * 그래서 콜백만 봐서는 "탈퇴를 마치고 돌아온 것"과 "평범한 로그인"을 구분할 수 없다. 계약을 바꿀
 * 필요는 없다 — 탈퇴를 시작한 것은 프론트 자신이라 그 사실을 스스로 기억하면 된다.
 *
 * sessionStorage를 쓰는 이유는 preLoginPath.ts와 같다: 탭 단위로 살아 있어 공급자 도메인을
 * 다녀오는 전체 페이지 이동을 건너 유지된다. 근거: Jira S15P11A705-347(GitHub front#105).
 */
export const WITHDRAWAL_NOTICE_KEY = 'pinlog:withdrawal-notice';

/**
 * 표시를 유효하다고 볼 최대 경과 시간.
 *
 * 이 값은 **프론트가 정한 안전장치**이고 서버 쪽 인가 요청 수명을 옮겨온 것이 아니다 — 그 수명은
 * 참조 문서에 공개돼 있지 않아 추측하지 않는다. 필요한 이유는 지우기만으로는 못 막는 경로가 하나
 * 남기 때문이다: 사용자가 공급자 화면에서 그냥 이탈하면 콜백 자체가 오지 않아 지울 기회가 없고,
 * 나중에 같은 탭에서 평범히 로그인하면 `error` 없이 착지해 "탈퇴가 완료되었습니다"가 잘못 뜬다.
 * 인가 왕복 한 번이 이보다 오래 걸릴 일은 없다고 보고 그 지점을 끊는다.
 *
 * 경계를 넘겨 표시를 무시하면 최악의 결과가 "완료 문구를 못 본다"이고, 반대로 낡은 표시를 믿으면
 * "탈퇴하지도 않았는데 탈퇴됐다고 알린다"가 된다. 애매하면 무시하는 쪽으로 기운다.
 */
export const WITHDRAWAL_NOTICE_TTL_MS = 10 * 60 * 1000;

/** 「예」를 눌러 공급자 화면으로 이동하기 직전에 호출한다. */
export function saveWithdrawalNotice(now: number = Date.now()): void {
  sessionStorage.setItem(WITHDRAWAL_NOTICE_KEY, String(now));
}

/**
 * 유효한 표시가 있는지 본다. 저장값이 없거나, 숫자가 아니거나(다른 코드·확장이 덮어쓴 경우),
 * 경과 시간이 [0, TTL] 밖이면 false다. 미래 시각(기기 시계가 되돌아간 경우)도 여기서 걸러진다.
 */
export function hasWithdrawalNotice(now: number = Date.now()): boolean {
  const saved = sessionStorage.getItem(WITHDRAWAL_NOTICE_KEY);
  if (saved === null) {
    return false;
  }
  const savedAt = Number(saved);
  if (!Number.isFinite(savedAt)) {
    return false;
  }
  const elapsed = now - savedAt;
  return elapsed >= 0 && elapsed <= WITHDRAWAL_NOTICE_TTL_MS;
}

/**
 * 표시를 지운다. 콜백에 착지하면 성공·실패 어느 쪽이든 **읽은 직후 반드시** 호출한다 —
 * 남겨두면 이후 같은 탭의 평범한 로그인에서 완료 문구가 잘못 뜬다.
 */
export function clearWithdrawalNotice(): void {
  sessionStorage.removeItem(WITHDRAWAL_NOTICE_KEY);
}
