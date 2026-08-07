/**
 * "책상 위에 붙인 종이 지도 포스터" 구도의 조정값. 근거: Jira S15P11A705-384.
 *
 * ## 롤백 안내 (사용자 명시)
 * 이 기능은 `src/features/home/deskPoster/` **한 폴더에 격리돼 있다.** 되돌리려면
 *   ① 아래 `HOME_DESK_POSTER_ENABLED`를 false로 두면 즉시 이전 화면(그라데이션 페이드)으로 돌아가고,
 *   ② 완전히 지우려면 HomePage에서 `<MapPosterFrame>` 래퍼와 `<DeskSurface />` 두 줄을 지운 뒤
 *      이 폴더를 삭제하면 된다.
 * 기존 지도·카드 컴포넌트는 **한 줄도 뜯지 않았다** — 이 폴더는 바깥을 감싸기만 한다
 * (376 regionView와 같은 문법).
 *
 * ⚠️ 아래 값은 전부 **취향 조정 지점**이다. 화면을 보면서 값만 바꾸면 된다.
 */

/**
 * 포스터 구도 사용 여부. false면 384 이전 상태(지도가 배경으로 페이드되는 방식)로 즉시 돌아간다.
 * HomePage가 이 값 하나로 페이드 폭까지 함께 되돌린다.
 */
export const HOME_DESK_POSTER_ENABLED = true;

/** 책상(배경)과 포스터 사이의 여백(px). 이 값이 곧 "포스터가 책상 위에 놓인 정도"다. */
export const POSTER_DESK_MARGIN_PX = { sm: 12, md: 20, xl: 28 } as const;

/**
 * 포스터의 흰 종이 테두리 폭(px). 폴라로이드처럼 아래쪽을 조금 더 넓게 둔다 — 위·좌·우가 같고
 * 아래만 넓은 비대칭이 "인쇄된 종이"의 인상을 만든다.
 */
export const POSTER_FRAME_PX = { x: 14, top: 14, bottom: 26 } as const;

/**
 * 포스터 기울기(도). 0.5~1도가 "손으로 붙인" 느낌의 실용 구간이고, 그 이상은 화면이 기울어 보인다.
 *
 * ⚠️ **카카오 지도에는 적용하지 않는다**(아래 상수). 지도 SDK는 마우스 좌표를 컨테이너의 축정렬
 * 경계(getBoundingClientRect)를 기준으로 환산하는데, 조상이 회전해 있으면 그 사각형이 실제 종이와
 * 어긋나 드래그·마커 클릭이 몇 px씩 밀린다. 지역 뷰는 우리가 그리는 SVG라 그 문제가 없어 기울인다.
 */
export const POSTER_ROTATE_DEG = 0.7;

/**
 * 카카오 지도 포스터에도 기울기를 적용할지. 기본 false — 위 주석의 좌표 어긋남 때문이다.
 * 실제로 써 보고 어긋남이 없다고 판단되면 true로 바꾸면 두 뷰가 같은 각도로 기운다.
 */
export const POSTER_ROTATE_KAKAO_ENABLED = false;

/** 책상 위에 놓인 그림자. 종이 한 장이라 넓고 옅게, 아래쪽으로만 진다. */
export const POSTER_SHADOW =
  '0 18px 40px -22px rgba(4,33,66,0.45), 0 3px 10px -6px rgba(4,33,66,0.28)';

/**
 * 모서리 핀 크기(px)와 모서리에서의 거리(px).
 * 386에서 압정(PinTack) → 시안 푸시핀(PinPush)으로 갈아끼웠다. 푸시핀은 기울어져 있어 같은 높이라도
 * 더 커 보이므로 값을 조금 줄였다.
 */
export const POSTER_TACK = { heightPx: 24, insetPx: 4 } as const;

/** 종이 결·책상 결의 진하기. 0.03~0.06이 "있는 듯 없는 듯"이고 0.1을 넘으면 지저분해진다. */
export const POSTER_PAPER_GRAIN_ALPHA = 0.05;
export const DESK_GRAIN_ALPHA = 0.035;
/** 결 무늬가 반복되는 주기(px). */
export const GRAIN_TILE_PX = 160;

/**
 * 결 이미지(data URI). 374의 지도 종이 질감과 같은 기법이다 — 화면 전체가 한 종류의 종이로 보여야
 * 해서 일부러 같은 방식을 쓴다. asset 파일이 필요 없다.
 */
export function getPaperGrainImage(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${GRAIN_TILE_PX}" height="${GRAIN_TILE_PX}"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
