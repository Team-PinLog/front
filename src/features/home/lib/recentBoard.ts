/**
 * "최근의 장소" 카드가 붙는 **보드(대시보드) 배경면**. 근거: Jira S15P11A705-377 추가 지시.
 *
 * 왜 배경면이 필요한가 — 이전에는 카드들이 지도 위에 그대로 떠 있었다. 압정으로 종이를 박아 둔
 * 모양인데 정작 박을 판이 없어서, 카드가 공중에 뜬 채 지도만 비쳤다. 판을 깔면 압정이 "무언가에
 * 꽂혀 있다"가 되고, 지도 뷰·지역 뷰 어느 쪽에서도 카드 영역이 같은 자리로 읽힌다.
 *
 * ⚠️ 아래 값들은 **조정 가능한 재질값**이다(화면 보면서 바꿔도 되는 자리). 브랜드 색 토큰이 아니라
 * 이 영역 전용 재질이라 tailwind.config가 아니라 여기 둔다 — ContextStickyNote의 포스트잇 색,
 * RecentRecordCard의 폴백 색과 같은 성격이다.
 */
export const RECENT_BOARD = {
  /** 판 바탕. paper-white보다 한 단계 진한 종이 보드 톤이다. 코르크처럼 붉게 가고 싶으면 더 진하게. */
  baseColor: '#EFE7DA',
  /** 판 테두리·아래쪽 두께감. baseColor보다 어두워야 판이 떠 보인다. */
  edgeColor: '#DCCFBB',
  /** 결(노이즈) 진하기. 0.03~0.07이 "종이 결"이고, 0.1을 넘으면 지저분해진다. */
  grainAlpha: 0.055,
  /** 결 무늬가 반복되는 주기(px). 작을수록 촘촘하다. */
  grainTileSizePx: 140,
} as const;

/**
 * 판의 결 이미지(data URI). 지도 톤 마스크의 종이 질감과 같은 방식이라 asset 파일이 필요 없다.
 * 두 곳이 같은 기법을 쓰는 것은 의도한 것이다 — 화면 전체가 한 종류의 종이로 보여야 한다.
 */
export function getRecentBoardGrainImage(): string {
  const size = RECENT_BOARD.grainTileSizePx;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
