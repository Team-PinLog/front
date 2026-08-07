/**
 * 활동 기록 화면(407) 2×2 격자 카드의 공통 클래스. 조건부 조립 없이 **완성된 리터럴**만 둔다
 * (conventions 2장 — Tailwind는 소스를 원시 텍스트로 스캔한다).
 */
export const ACTIVITY_CARD_CLASS =
  'flex min-w-0 flex-col gap-4 rounded-2xl border border-line-card bg-snow-white p-5 xl:p-6';

export const ACTIVITY_CARD_TITLE_CLASS = 'text-base font-bold text-pin-navy';

export const ACTIVITY_CARD_HINT_CLASS = 'text-xs text-ink-gray-light';

/**
 * 막대 색. **한 색뿐이다** — 최고값을 다른 색으로 칠하지 않는다(docs 이슈 #55 차트 규칙: 색이
 * 순위를 따라가면 다음 달에 최고값이 바뀌며 색이 막대 사이를 옮겨다닌다). 강조는 값 라벨로 한다.
 *
 * ⚠️ 브랜드 민트(log-mint #3BB7A2)를 쓰지 않은 이유: 카드 면(snow-white #FDFDFD) 대비 2.43:1로
 * 비텍스트 대비 3:1에 못 미친다. 막대는 면이라 대비가 형태를 읽는 유일한 단서다(지도 핀처럼 흰
 * 테두리가 형태를 잡아주는 자리와 다르다). 같은 계열에서 3:1을 통과하는 가장 밝은 단계인
 * #2E9C88을 쓴다 — 값의 근거는 docs 이슈 #55 「막대 색에 토큰 추가가 필요합니다」다.
 *
 * ⚠️ 토큰(tailwind.config.js)이 아니라 arbitrary value인 이유는 그 파일이 이 티켓의 파일 범위 밖이기
 * 때문이다. 소비처가 이 상수 하나로 모여 있으므로, 토큰이 생기면 여기 한 줄만 바꾸면 된다.
 */
export const ACTIVITY_BAR_COLOR_CLASS = 'bg-[#2E9C88]';

/** 막대가 놓이는 홈(가로 막대 배경). 값이 0이어도 줄이 어디까지 이어지는지 보이게 한다. */
export const ACTIVITY_BAR_TRACK_CLASS = 'bg-line-subtle';
