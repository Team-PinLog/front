import type { ReactNode } from 'react';

/**
 * 진행 중 표시(396). 버튼 라벨을 "처리 중…"으로 갈아 끼우던 자리를 대체한다.
 *
 * 라벨을 다른 문자열로 바꾸면 버튼 폭이 그 문자열 길이를 따라가서, 누르는 순간 버튼이
 * 늘었다 줄었다 한다("팔로우"(3자) ↔ "처리 중…"(5자)). 그래서 **라벨은 그대로 두고**
 * 흐리게만 만든 뒤, 그 위에 스피너를 absolute로 겹친다 — 레이아웃 폭을 정하는 건 항상
 * 원래 라벨이므로 pending 전후로 폭이 1px도 움직이지 않는다.
 *
 * 접근성:
 * - 상태는 버튼 쪽 `aria-busy`가 알린다(이 컴포넌트를 쓰는 곳에서 함께 붙인다).
 * - 스피너 SVG는 `aria-hidden`이고, 대신 sr-only 텍스트로 "처리 중"을 읽어 준다.
 * - `prefers-reduced-motion`이면 회전을 끄고(`motion-reduce:animate-none`) 궤도 원을
 *   불투명하게 올려, 멈춘 스피너가 아니라 **의도된 정적 표시**로 보이게 한다.
 */
interface PendingLabelProps {
  /** 진행 중이면 라벨을 흐리게 하고 스피너를 겹친다. */
  pending: boolean;
  /** 스크린리더가 읽을 진행 상태 문구. */
  pendingText?: string;
  /** 항상 렌더되는 원래 라벨. 폭의 기준이다. */
  children: ReactNode;
}

export function PendingLabel({ pending, pendingText = '처리 중', children }: PendingLabelProps) {
  return (
    <span className="relative inline-flex items-center justify-center">
      <span className={pending ? 'opacity-25' : undefined}>{children}</span>
      {pending && (
        <>
          <span className="absolute inset-0 flex items-center justify-center">
            <InlineSpinner />
          </span>
          <span className="sr-only">{pendingText}</span>
        </>
      )}
    </span>
  );
}

/**
 * 인라인 스피너. 궤도 원 위에 4분의 1 호만 진하게 얹어 회전이 눈에 보이게 한다
 * (`CoverStylePicker`의 로컬 Spinner와 같은 문법이다 — 그쪽은 파일권이 달라 이번엔 그대로 둔다).
 * 색은 `currentColor`라 버튼 색 계열을 그대로 따라간다.
 */
export function InlineSpinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={
        className ?? 'h-4 w-4 animate-spin motion-reduce:animate-none motion-reduce:opacity-70'
      }
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25 motion-reduce:opacity-100"
      />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
