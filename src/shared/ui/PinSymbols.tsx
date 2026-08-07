import { useId } from 'react';

/**
 * 핀 2종 체계의 SVG 심볼. 근거: Jira S15P11A705-377, 사용자 제공 "핀 목업 v2"
 * (구현 참조 문서 `/tmp/pinlog-pin-mockup-v2-reference.html`).
 *
 * ⚠️ path 값은 참조 문서 원본 그대로다 — **수정 금지.** 후속 티켓(378·379)이 이 컴포넌트를
 * import해서 쓰므로, 모양을 바꾸면 여러 화면이 한꺼번에 달라진다.
 *
 * 핀은 두 종류이고 쓰임이 다르다:
 * - **마커 핀**(pin-standing / pin-outline): 지도·배지·상태 표시. 색은 currentColor.
 *   지도 위 실제 마커는 여전히 `assets/color-markers/*.svg` 20색 자산을 쓴다(그쪽은 색 해시
 *   규약이 걸려 있다). 이 심볼은 그 형상이 필요한 **다른 자리**를 위한 것이다.
 * - **압정**(pin-tack): 종이·카드를 대시보드에 고정하는 장식. 캡·목·받침 + 강철 바늘.
 *
 * 새 음영·광택을 덧붙이지 않는다 — 목업 v1에서 입체 음영을 시도했다가 "과하다"로 폐기됐다.
 */

/** 마커 핀 그림자. asset 내장값과 같은 값이라 두 경로가 같은 그림자를 갖는다. */
export const PIN_MARKER_SHADOW = 'drop-shadow(0 4px 4px rgba(11,35,64,.22))';
/** 압정 그림자. 마커보다 낮고 좁다 — 종이 위에 놓인 작은 금속이다. */
export const PIN_TACK_SHADOW = 'drop-shadow(0 3px 3px rgba(4,33,66,.28))';

interface PinSymbolProps {
  /** px 단위 높이. 폭은 원본 비율(마커 64:76, 압정 64:112)로 따라간다. */
  height?: number;
  className?: string;
}

/** 꽂힌 마커 핀. 색은 currentColor를 따른다. */
export function PinStanding({ height = 19, className }: PinSymbolProps) {
  return (
    <svg
      viewBox="0 0 64 76"
      height={height}
      width={(height * 64) / 76}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M32 4C17.64 4 6 15.64 6 30c0 18.5 18.5 32.42 24.15 38.32a2.55 2.55 0 0 0 3.7 0C39.5 62.42 58 48.5 58 30 58 15.64 46.36 4 32 4Z"
        fill="currentColor"
      />
      <circle cx="32" cy="30" r="10" fill="#FFFFFF" />
    </svg>
  );
}

/** 점선 아웃라인 — "아직 꽂히지 않은 자리"를 뜻한다(빈 상태). */
export function PinOutline({ height = 19, className }: PinSymbolProps) {
  return (
    <svg
      viewBox="0 0 64 76"
      height={height}
      width={(height * 64) / 76}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M32 4C17.64 4 6 15.64 6 30c0 18.5 18.5 32.42 24.15 38.32a2.55 2.55 0 0 0 3.7 0C39.5 62.42 58 48.5 58 30 58 15.64 46.36 4 32 4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
        strokeDasharray="7 6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * 압정. **그리는 순서가 곧 겹침 순서다** — 바늘을 먼저 깔아야 받침이 바늘 뿌리를 덮는다.
 * 순서를 바꾸면 바늘이 받침 위로 튀어나와 압정이 아니라 못처럼 보인다.
 *
 * 강철 그라디언트 id는 useId로 인스턴스마다 다르게 만든다. 같은 id를 여러 번 심으면 문서 전체에서
 * 첫 번째 정의 하나로 수렴하는데(color-markers의 filter id 충돌에서 이미 겪은 문제),
 * 지금은 정의가 모두 같아 눈에 띄지 않더라도 나중에 색을 바꾸는 순간 조용히 틀어진다.
 */
export function PinTack({ height = 49, className }: PinSymbolProps) {
  const gradientId = `pin-tack-steel-${useId()}`;
  return (
    <svg
      viewBox="0 0 64 112"
      height={height}
      width={(height * 64) / 112}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0" stopColor="#8D99A6" />
          <stop offset=".38" stopColor="#E6EBEF" />
          <stop offset=".62" stopColor="#B7C1CB" />
          <stop offset="1" stopColor="#79848F" />
        </linearGradient>
      </defs>
      <path d="M32 111 L29.4 60 h5.2 Z" fill={`url(#${gradientId})`} />
      <path d="M24 23 h16 l4.5 33 h-25 Z" fill="currentColor" />
      <path d="M26.6 24 h4.4 l-1.7 30 h-5 Z" fill="#fff" fillOpacity=".2" />
      <ellipse cx="32" cy="62" rx="23" ry="12.5" fill="currentColor" />
      <ellipse cx="32" cy="62" rx="23" ry="12.5" fill="#000" fillOpacity=".2" />
      <ellipse
        cx="21"
        cy="56.5"
        rx="7.5"
        ry="3.2"
        fill="#fff"
        fillOpacity=".16"
        transform="rotate(-14 21 56.5)"
      />
      <path d="M13 15 v9 a19 7.5 0 0 0 38 0 v-9 Z" fill="currentColor" />
      <path d="M13 15 v9 a19 7.5 0 0 0 38 0 v-9 Z" fill="#000" fillOpacity=".12" />
      <ellipse cx="32" cy="15" rx="19" ry="7.5" fill="currentColor" />
      <path
        d="M40.8 9 A16.5 6.4 0 0 1 49.2 13.8 A14.5 4.8 0 0 0 40.8 10.6 Z"
        fill="#fff"
        fillOpacity=".6"
      />
    </svg>
  );
}

/**
 * 카드·종이 위에 압정을 "박아 놓는" 래퍼.
 *
 * 핵심은 **바늘이 종이 뒤로 가려지고 받침만 종이 위에 남는 것**이다(참조 문서 2번 항목).
 * 그래서 압정 래퍼는 종이보다 뒤(z-0)에 두고, 종이 위쪽 밖으로 받침 높이만큼만 꺼내 놓는다.
 * 압정 전체 높이의 약 66.5%가 받침 아래끝이라, 그만큼만 위로 올리면 바늘이 종이에 가려진다.
 *
 * ⚠️ 이 컴포넌트를 쓰는 카드는 `overflow-hidden`이면 안 된다 — 압정이 카드 바깥으로 나와야 한다.
 */
export function PinTackMount({
  height = 34,
  className = '',
}: {
  height?: number;
  className?: string;
}) {
  // 받침(ellipse cy=62, ry=12.5)의 아래끝은 viewBox 112 중 74.5 → 약 66.5%.
  const visibleRatio = 0.665;
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 ${className}`}
      style={{ top: -height * visibleRatio, filter: PIN_TACK_SHADOW }}
    >
      <PinTack height={height} />
    </span>
  );
}
