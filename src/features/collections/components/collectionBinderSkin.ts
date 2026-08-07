import type { CSSProperties } from 'react';

/**
 * S15P11A705-378 — 컬렉션 펼침 화면 "바인더 질감" 스킨.
 *
 * ⚠️ 롤백 지점 ⚠️
 * 이 화면의 질감·테이프·찢은 종이 표현은 전부 이 파일 하나에 모아 뒀다. 되돌리려면
 * CollectionDetailView.tsx에서 이 모듈을 참조하는 3곳(파일 내 "378 롤백 지점" 주석)을 지우고
 * 이 파일을 삭제하면 된다 — 레이아웃·동선 코드에는 손대지 않았으므로 그 이상 정리할 것이 없다.
 *
 * 원칙:
 * - **표면(스킨)만**. 332에서 6라운드로 확정된 구조(책 닫기 동선·목차·페이지 넘김·recordSize)는
 *   한 줄도 바꾸지 않는다. 크기·간격·DOM 순서를 바꾸는 값은 여기에 두지 않는다.
 * - **외부 asset·폰트 없음**. 노이즈는 인라인 SVG data URI, 나머지는 CSS 그라디언트다
 *   (Shelf.tsx의 나뭇결 PLANK_GRAIN_IMAGE, 373 노트 페이지 도트 그리드와 같은 방식).
 * - **가독성 우선**. 질감·괘선의 알파는 0.1 이하로 유지한다 — 글자·지도 위에서 소음이 되면 안 된다.
 * - 중앙 링 제본은 범위에서 제외됐다(사용자 결정 — 현재 잡지 느낌과 충돌).
 */

// ── 1. 페이지 종이 질감 + 괘선 ──────────────────────────────────────────────

// 종이 섬유 노이즈. feTurbulence를 SVG data URI로 깔면 asset 없이 미세한 결이 생긴다.
// baseFrequency가 높을수록 결이 곱다. opacity 0.035는 "있는 줄 모르지만 빼면 허전한" 정도로,
// 확대해야 보이는 수준이다(가독성 우선 원칙).
const PAPER_NOISE_IMAGE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")";

// 미세 괘선. 간격·알파는 373 노트 페이지에서 확정한 값을 그대로 쓴다(32px, 0.09) — 두 화면이
// 같은 "노트" 계열이라 괘선 리듬이 어긋나면 안 된다.
const PAGE_RULE_LINES =
  'repeating-linear-gradient(to bottom, transparent 0 31px, rgba(120,110,100,0.09) 31px 32px)';

/**
 * 펼침 페이지 표면. 기존 배경색(bg-snow-white)은 그대로 두고 그 **위에** 질감만 얹는다
 * — backgroundImage만 주므로 배경색 클래스를 지우거나 바꾸지 않는다.
 * 순서상 노이즈가 위, 괘선이 아래다(노이즈가 괘선의 선명한 경계를 살짝 흐려 인쇄된 줄처럼 보인다).
 */
export const BINDER_PAGE_SURFACE: CSSProperties = {
  backgroundImage: `${PAPER_NOISE_IMAGE}, ${PAGE_RULE_LINES}`,
};

// ── 2. 사진·액자의 마스킹 테이프 부착 ───────────────────────────────────────

/**
 * 페이지에 붙은 "액자"의 폴라로이드 테두리. 373 폴라로이드(흰 테두리 5px + 낮은 확산 그림자)와
 * 같은 값이라 두 화면의 사진 표현이 한 벌로 읽힌다.
 * ⚠️ 크기·여백은 건드리지 않는다 — 테두리 폭만 기존 1px에서 늘어난다.
 */
export const BINDER_PHOTO_FRAME_CLASS =
  'border-[5px] border-white shadow-[0_10px_24px_-12px_rgba(60,54,48,0.45)]';

/** 마스킹 테이프 색. shared/ui/ContextStickyNote의 NOTE_TAPE_COLOR와 같은 크라프트 톤이다 —
 *  "같은 테이프로 붙였다"는 인상이 화면 전체에서 유지되어야 한다(332 주석의 판단을 그대로 따른다). */
const BINDER_TAPE_COLOR = 'rgba(214,196,150,0.62)';

/**
 * 액자 모서리에 비스듬히 걸치는 테이프 한 조각. 위치(left/right)만 다르고 나머지는 같다.
 * pointer-events는 호출부에서 none으로 막는다 — 지도 위 조작을 가리면 안 된다(332 동선 불변).
 */
export function binderTapeStyle(side: 'left' | 'right'): CSSProperties {
  return {
    backgroundColor: BINDER_TAPE_COLOR,
    transform: `rotate(${side === 'left' ? '-38deg' : '38deg'})`,
    boxShadow: '0 1px 2px rgba(90,80,30,0.22)',
  };
}

export const BINDER_TAPE_CLASS = 'pointer-events-none absolute z-30 h-5 w-16 rounded-[2px]';

// ── 3. Context가 놓이는 "찢은 종이" 받침 ────────────────────────────────────

/**
 * Context 포스트잇 뒤에 깔리는 찢어낸 종이 조각. 포스트잇 자체(shared/ui/ContextStickyNote)는
 * 건드리지 않는다 — 색·회전·테이프는 332에서 확정된 3색 해시 그대로다. 대신 그 뒤에 종이를 깔아
 * "노트에서 찢어낸 조각 위에 맥락을 붙였다"는 인상을 만든다.
 *
 * 아래쪽 가장자리를 conic-gradient 마스크로 톱니처럼 잘라 찢긴 단면을 만든다(asset 없이 CSS만).
 * 마스크는 이 받침 레이어에만 걸린다 — 포스트잇은 이 레이어의 자식이 아니라 형제라서 잘리지 않는다.
 */
export const BINDER_TORN_PAPER_STYLE: CSSProperties = {
  backgroundColor: '#FDFAF3',
  backgroundImage: PAPER_NOISE_IMAGE,
  boxShadow: '0 1px 2px rgba(60,54,48,0.12)',
  WebkitMaskImage: 'conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg)',
  maskImage: 'conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg)',
  WebkitMaskSize: '14px 100%',
  maskSize: '14px 100%',
  WebkitMaskRepeat: 'repeat-x',
  maskRepeat: 'repeat-x',
};
