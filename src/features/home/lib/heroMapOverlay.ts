/**
 * 홈 배경 지도 위에 얹히는 히어로 오버레이의 크기와 알파 마스크.
 *
 * 오버레이를 그리는 쪽(HomePage)과 그만큼 가려진다는 사실을 계산에 반영해야 하는 쪽(지도)이
 * 같은 값을 봐야 해서 한곳에 모았다. 이전에는 마스크 문자열만 HomePage 안에 있어서 지도는
 * 자기 위가 얼마나 가려지는지 알 방법이 없었다. 근거: Jira S15P11A705-325.
 */

/**
 * 오버레이 높이. Tailwind 리터럴과 아래 픽셀 값은 쌍둥이 상수이므로 **반드시 함께 고친다**
 * (shelfCabinetLayout.ts가 쓰는 것과 같은 규칙). 클래스로 두는 쪽은 Tailwind가 빌드 시점에
 * 스캔해야 해서 문자열 조합으로 만들 수 없다.
 */
export const HERO_OVERLAY_HEIGHT_CLASS = 'h-[28rem]';
const HERO_OVERLAY_HEIGHT_PX = 28 * 16;

/**
 * 마스크가 완전히 불투명하게 유지되는 구간의 비율(%). 정수 퍼센트로 두는 이유는 0.48 같은
 * 소수를 100배 할 때 생기는 부동소수점 찌꺼기가 CSS 문자열에 그대로 새어 나가기 때문이다.
 *
 * 48%를 고른 근거: 448px * 0.48 ≈ 215px가 불투명 구간인데, 실측상 SmartSearchPanel 검색바의
 * 아래끝이 약 184px(1440x900, xl)이라 30px 남짓 여유가 남는다 — 검색바 텍스트가 흐려진 지도
 * 위에 걸치지 않는다. 나머지 233px이 감쇠 구간이다.
 */
const HERO_OVERLAY_OPAQUE_PERCENT = 48;

/**
 * 배경 지도가 오버레이에 완전히 가려지는 높이(px). 지도는 이 높이만큼을 "보이지 않는 영역"으로
 * 치고 fitBounds 여유·중심 보정·화면 밖 개수 계산에 반영한다(RecordMapView).
 */
export const HERO_OVERLAY_OPAQUE_PX = Math.round(
  (HERO_OVERLAY_HEIGHT_PX * HERO_OVERLAY_OPAQUE_PERCENT) / 100,
);

/**
 * 히어로 오버레이의 알파 마스크. 위 HERO_OVERLAY_OPAQUE_PERCENT까지는 검정(=오버레이 100%
 * 표시)으로 유지해 제목부터 검색바까지를 완전히 덮고, 거기서부터 100%까지 transparent로
 * 떨어뜨려 블러와 흰 tint가 함께 서서히 사라지게 한다. 색이 같은 두 스톱 사이라 정지 구간에서
 * 단차는 생기지 않는다.
 */
export const HERO_MAP_FADE_MASK = `linear-gradient(to bottom, black 0%, black ${HERO_OVERLAY_OPAQUE_PERCENT}%, transparent 100%)`;
