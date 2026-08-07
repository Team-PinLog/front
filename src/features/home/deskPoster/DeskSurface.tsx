import {
  DESK_GRAIN_ALPHA,
  getPaperGrainImage,
  GRAIN_TILE_PX,
  HOME_DESK_POSTER_ENABLED,
} from './deskPoster';

/**
 * 책상 면. 근거: Jira S15P11A705-384.
 *
 * 색은 페이지 배경(paper-white)을 그대로 쓰고 **아주 옅은 결만** 얹는다 — 색 토큰을 새로 만들지
 * 않으려는 것이기도 하고(추가가 필요하면 보고 대상), 책상이 진해지면 그 위의 흰 포스터·메모가
 * 붕 떠 보이기 때문이다. 결이 있으면 같은 흰색이라도 "종이가 놓인 면"으로 읽힌다.
 *
 * 클릭을 받지 않는 장식이라 pointer-events-none이다 — 이게 없으면 지도 위 어디를 눌러도 이
 * 레이어가 먼저 받는다.
 */
export function DeskSurface() {
  if (!HOME_DESK_POSTER_ENABLED) {
    return null;
  }
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0"
      style={{
        backgroundImage: getPaperGrainImage(),
        backgroundRepeat: 'repeat',
        backgroundSize: `${GRAIN_TILE_PX}px ${GRAIN_TILE_PX}px`,
        opacity: DESK_GRAIN_ALPHA,
        mixBlendMode: 'multiply',
      }}
    />
  );
}
