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

/**
 * 386: 푸시핀 그림자. 압정보다 크고 비스듬히 서 있어 그림자도 더 길게, 왼쪽 아래로 진다
 * (시안의 광원이 좌상단이다).
 */
export const PIN_PUSH_SHADOW = 'drop-shadow(-2px 5px 5px rgba(4,33,66,.30))';

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
 * 386: 레코드를 찝어 두는 **푸시핀**. 근거: Jira S15P11A705-386, 사용자 제공 시안
 * (`/tmp/pinlog-pin-mint.png`, `/tmp/pinlog-pin-navy.png`)을 보고 같은 실루엣으로 다시 그렸다.
 * PNG를 asset으로 쓰지 않는다 — 색을 바꿔 쓸 수 있어야 하고(민트·네이비 외 확장), 어느 크기에서도
 * 또렷해야 하기 때문이다.
 *
 * ⚠️ 지도 마커 20색과는 **무관하다.** 저쪽은 "장소"를 가리키는 기호이고 이것은 "종이를 찝는 물건"이다.
 *
 * ## 구조 (시안을 좌표로 옮긴 것)
 * 시안의 핀은 비스듬히 꽂혀 있다. 기울어진 도형을 하나하나 회전시켜 그리면 좌표를 읽을 수 없으므로,
 * **똑바로 선 핀을 그린 뒤 그룹 전체를 한 번 회전**시킨다(TILT_DEG). 그래서 아래 좌표들은 전부
 * "똑바로 선 상태" 기준이고, 각 부품의 관계(캡이 목보다 넓다, 받침이 캡보다 넓다)를 그대로 읽을 수 있다.
 *
 * 그리는 순서가 곧 겹침 순서다 — 바늘 → 목 → 받침 → 캡. 받침이 목의 아래끝을, 캡이 목의 위끝을
 * 덮어야 부품이 이어져 보인다. 순서를 바꾸면 목이 받침 위로 떠오른다.
 *
 * 색은 currentColor 하나로 받고, 입체감은 **흰색·검정 반투명 오버레이**로만 만든다(압정과 같은 문법).
 * 그래서 어떤 색을 주입해도 같은 광택·음영이 유지된다.
 */
const PIN_PUSH_TILT_DEG = 22;

/**
 * 좌표는 시안 PNG(500x500)를 실측해 옮긴 것이다. 부품 사이 **거리**가 형태를 결정한다 —
 * 처음엔 캡과 받침을 가깝게 잡았다가 둘이 겹쳐 목이 통째로 가려졌고(렌더로 확인), 시안에서
 * 캡 중심~받침 중심이 약 189px(내용 높이 365px의 절반 이상)인 것을 다시 재어 벌렸다.
 */
export function PinPush({ height = 34, className }: PinSymbolProps) {
  return (
    <svg
      viewBox="0 0 100 128"
      height={height}
      width={(height * 100) / 128}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <g transform={`rotate(${PIN_PUSH_TILT_DEG} 50 70)`}>
        {/* 바늘. 받침에 가려 아래쪽만 보인다 — 그래서 받침보다 먼저 그린다. 시안에서는 바늘도 핀
            색을 띠고 왼쪽에 밝은 줄이 서 있어, 금속 그라디언트 대신 currentColor + 흰 줄로 낸다. */}
        <path d="M47.4 100 h5.2 v19 a2.6 2.6 0 0 1 -5.2 0 Z" fill="currentColor" />
        <path d="M47.4 100 h2 v19.1 a1 1 0 0 1 -2 0 Z" fill="#fff" fillOpacity=".5" />
        <path d="M50.8 100 h1.8 v19 a1.3 1.3 0 0 1 -1.8 .7 Z" fill="#000" fillOpacity=".2" />

        {/* 목. 캡 아래에서 받침까지 이어지는 굵은 기둥이고, 아래로 가며 조금 벌어진다.
            ⚠️ 이 부품이 보이려면 **캡 아래끝과 받침 위끝 사이에 실제 간격**이 있어야 한다.
            두 번 놓쳤던 지점이다 — 캡·받침을 크게 잡으면 둘이 맞닿아 목이 통째로 사라진다. */}
        <path
          d="M40.5 28 C39.2 44 38.8 54 39.6 76 L60.4 76 C61.2 54 60.8 44 59.5 28 Z"
          fill="currentColor"
        />
        <path
          d="M40.5 28 C39.2 44 38.8 54 39.6 76 L45 76 C44.4 54 44.6 44 45.6 28 Z"
          fill="#fff"
          fillOpacity=".15"
        />
        <path
          d="M54.6 28 C55.6 44 55.8 54 55 76 L60.4 76 C61.2 54 60.8 44 59.5 28 Z"
          fill="#000"
          fillOpacity=".17"
        />

        {/* 받침(돔). 핀에서 가장 넓은 부품 — 캡보다 넓어야 "눌러 박는 판"으로 읽힌다. */}
        <ellipse cx="50" cy="84" rx="30" ry="20" fill="currentColor" />
        {/* 왼쪽 위 광택. 광원이 좌상단이다. 좁고 흐리게 둔다 — 넓게 주면 색이 빠져 보인다. */}
        <ellipse
          cx="36"
          cy="75"
          rx="10"
          ry="5"
          fill="#fff"
          fillOpacity=".3"
          transform="rotate(-26 36 75)"
        />
        {/* 오른쪽 아래 음영. */}
        <ellipse
          cx="58"
          cy="95"
          rx="19"
          ry="7"
          fill="#000"
          fillOpacity=".1"
          transform="rotate(-10 58 95)"
        />

        {/* 캡 옆면(원통의 옆구리). 윗면보다 어둡다. */}
        <rect x="26" y="20" width="48" height="10" fill="currentColor" />
        <ellipse cx="50" cy="30" rx="24" ry="14" fill="currentColor" />
        <rect x="26" y="20" width="48" height="10" fill="#000" fillOpacity=".17" />
        <ellipse cx="50" cy="30" rx="24" ry="14" fill="#000" fillOpacity=".17" />

        {/* 캡 윗면. 위에서 비스듬히 본 원이라 타원이다. */}
        <ellipse cx="50" cy="20" rx="24" ry="14" fill="currentColor" />
        {/* 윗면 가장자리를 도는 얇은 테 — 윗면과 옆면을 가르는 선이다. */}
        <ellipse
          cx="50"
          cy="20"
          rx="24"
          ry="14"
          fill="none"
          stroke="#fff"
          strokeOpacity=".2"
          strokeWidth="1"
        />
        {/* 윗면 광택(시안의 초승달)과 그 안의 밝은 점. */}
        <ellipse
          cx="41"
          cy="14.5"
          rx="9.5"
          ry="4.2"
          fill="#fff"
          fillOpacity=".42"
          transform="rotate(-27 41 14.5)"
        />
        <ellipse
          cx="38"
          cy="12.8"
          rx="3.6"
          ry="1.8"
          fill="#fff"
          fillOpacity=".62"
          transform="rotate(-27 38 12.8)"
        />
        {/* 윗면 오른쪽 아래 그늘. */}
        <ellipse
          cx="60"
          cy="26"
          rx="12"
          ry="3.6"
          fill="#000"
          fillOpacity=".07"
          transform="rotate(-14 60 26)"
        />
      </g>
    </svg>
  );
}

/**
 * 386: 카드·종이 위에 **푸시핀을 꽂아 두는** 래퍼. 압정(PinTackMount)과 배치 방식이 다르다.
 *
 * 압정은 "바늘이 종이 뒤로 숨고 받침만 위"였지만, 이 핀은 비스듬히 꽂힌 모양이라 **핀 전체가 종이
 * 위에 얹히고** 바늘 끝만 종이에 박힌 것으로 보이면 된다(티켓 지시). 그래서 z를 종이 위로 올리고,
 * 눌린 느낌은 바늘 끝 자리에 생기는 **접촉 그림자**로 낸다.
 */
export function PinPushMount({
  height = 34,
  className = '',
}: {
  height?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute z-20 ${className}`}
      style={{ filter: PIN_PUSH_SHADOW }}
    >
      <PinPush height={height} />
    </span>
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
