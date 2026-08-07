import type { ShelfCoverPreviewAnchor } from '../hooks/useShelfCoverPreview';

// 362: 책등 옆 표지 팝오버(ShelfCoverPreview)의 크기와 위치 계산. 컴포넌트 파일과 분리한 것은 이
// 레포 관례다(shelfSpine.ts 상단 주석 — react-refresh/only-export-components). 위치 계산은 화면
// 없이 검증할 수 있는 순수 함수라, 분리해 두면 테스트도 여기에 붙는다.

// Feed 카드와 같은 3:4. 폭은 책장 칸(데스크톱 레퍼런스에서 책이 놓이는 폭 약 292px)보다 작게 잡아
// 팝오버가 옆 칸까지 덮지 않게 한다.
export const PREVIEW_WIDTH_PX = 180;
export const PREVIEW_HEIGHT_PX = 240;
// 책등과 표지 사이 간격, 그리고 뷰포트 가장자리에 남기는 최소 여백.
const PREVIEW_GAP_PX = 12;
const VIEWPORT_MARGIN_PX = 8;

export interface ShelfCoverPreviewPosition {
  left: number;
  top: number;
}

/**
 * 책등 오른쪽에 두되 오른쪽이 모자라면 왼쪽으로 넘긴다. 세로는 책등 중앙에 맞추고 뷰포트 안으로
 * 밀어 넣는다.
 *
 * 팝오버가 fixed라 책장의 overflow(캐비닛의 overflow-hidden, 책 스크롤 박스의 overflow-y-auto —
 * 후자는 가로도 함께 클리핑한다)에 걸리지 않는 대신, 화면 밖으로 나가는 것은 직접 막아야 한다.
 * 오른쪽 배치를 기본으로 두는 이유는 책장이 화면 왼쪽에 있기 때문이다(Library 1열이 내 책장).
 */
export function getShelfCoverPreviewPosition(
  anchor: ShelfCoverPreviewAnchor,
  viewportWidth: number,
  viewportHeight: number,
): ShelfCoverPreviewPosition {
  const rightPlacement = anchor.right + PREVIEW_GAP_PX;
  const fitsRight = rightPlacement + PREVIEW_WIDTH_PX <= viewportWidth - VIEWPORT_MARGIN_PX;
  const left = fitsRight ? rightPlacement : anchor.left - PREVIEW_GAP_PX - PREVIEW_WIDTH_PX;
  const maxLeft = Math.max(
    VIEWPORT_MARGIN_PX,
    viewportWidth - PREVIEW_WIDTH_PX - VIEWPORT_MARGIN_PX,
  );

  const centeredTop = anchor.top + (anchor.bottom - anchor.top) / 2 - PREVIEW_HEIGHT_PX / 2;
  const maxTop = Math.max(
    VIEWPORT_MARGIN_PX,
    viewportHeight - PREVIEW_HEIGHT_PX - VIEWPORT_MARGIN_PX,
  );

  return {
    left: Math.max(VIEWPORT_MARGIN_PX, Math.min(left, maxLeft)),
    top: Math.max(VIEWPORT_MARGIN_PX, Math.min(centeredTop, maxTop)),
  };
}
