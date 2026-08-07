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
// 387: 레퍼런스(흰 종이 클로즈업, "만져질 듯 말 듯")에 맞춰 결을 더 곱고 무방향으로 조정했다.
// baseFrequency를 0.85 → 1.15로 올려 알갱이를 잘게 부수고(높을수록 곱다), numOctaves를 3 → 4로
// 늘려 큰 얼룩 없이 균질하게 만든다. 대신 눈에 닿는 양이 줄어 opacity는 0.035 → 0.05로 올렸다.
// 타일도 140 → 180px로 키워 반복 주기가 눈에 잡히지 않게 했다.
const PAPER_NOISE_IMAGE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.15' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")";

/**
 * 펼침 페이지 표면. 기존 배경색(bg-snow-white)은 그대로 두고 그 **위에** 질감만 얹는다
 * — backgroundImage만 주므로 배경색 클래스를 지우거나 바꾸지 않는다.
 *
 * 387: 가로 괘선(repeating-linear-gradient 32px)을 **뺐다**. 사용자가 원한 것은 줄노트의 줄무늬가
 * 아니라 방향이 없는 미세한 종이 결이고, 괘선은 그 자체로 강한 가로 방향성을 만들어 레퍼런스와
 * 정반대로 읽혔다. 이제 질감은 노이즈 한 겹뿐이다.
 */
export const BINDER_PAGE_SURFACE: CSSProperties = {
  backgroundImage: PAPER_NOISE_IMAGE,
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

// ── 3. (제거됨) Context 뒤 "찢은 종이" 받침 ───────────────────────────────
//
// 387: 포스트잇 뒤에 깔던 베이지 종이 받침(BINDER_TORN_PAPER_STYLE)을 삭제했다. 화면에서는
// "메모에 배경 박스가 붙은 것"으로 읽혀서, 메모지가 페이지에 직접 붙어 있다는 인상을 오히려
// 방해했다. 되살리려면 이 자리에 받침 상수를 두고 CollectionDetailView의 aria-hidden 레이어를
// 복원하면 된다(378 롤백 지점 3/3 주석 참고).
