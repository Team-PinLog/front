import { describe, expect, it } from 'vitest';
import {
  getShelfCoverPreviewPosition,
  PREVIEW_HEIGHT_PX,
  PREVIEW_WIDTH_PX,
} from './shelfCoverPreviewPosition';

// 362: 표지 팝오버는 fixed라 책장의 overflow에 잘리지 않는 대신, 화면 밖으로 나가는 것을 이 함수가
// 직접 막는다. 화면 없이 검증할 수 있는 유일한 부분이라 여기에 고정해 둔다.

// 데스크톱 레퍼런스 뷰포트.
const VIEWPORT = { width: 1440, height: 900 };

/** 책장 1열의 책등 한 권 정도(폭 40px, 높이 170px)를 화면 좌측에 둔 앵커. */
function anchorAt(left: number, top: number, width = 40, height = 170) {
  return { left, top, right: left + width, bottom: top + height };
}

describe('getShelfCoverPreviewPosition', () => {
  it('기본은 책등 오른쪽이고, 세로는 책등 중앙에 맞춘다', () => {
    const anchor = anchorAt(200, 300);
    const { left, top } = getShelfCoverPreviewPosition(anchor, VIEWPORT.width, VIEWPORT.height);

    expect(left).toBeGreaterThan(anchor.right);
    // 책등 세로 중앙과 팝오버 세로 중앙이 같다.
    expect(top + PREVIEW_HEIGHT_PX / 2).toBeCloseTo(
      anchor.top + (anchor.bottom - anchor.top) / 2,
      5,
    );
  });

  it('오른쪽 공간이 모자라면 책등 왼쪽으로 넘어간다', () => {
    // 뷰포트 오른쪽 끝에 붙은 책등 — 오른쪽에 두면 화면을 벗어난다.
    const anchor = anchorAt(VIEWPORT.width - 60, 300);
    const { left } = getShelfCoverPreviewPosition(anchor, VIEWPORT.width, VIEWPORT.height);

    expect(left + PREVIEW_WIDTH_PX).toBeLessThanOrEqual(anchor.left);
  });

  it('어느 위치에서도 뷰포트를 벗어나지 않는다', () => {
    for (const left of [0, 40, 300, 900, 1380, 1439]) {
      for (const top of [0, 20, 400, 860, 899]) {
        const position = getShelfCoverPreviewPosition(
          anchorAt(left, top),
          VIEWPORT.width,
          VIEWPORT.height,
        );
        expect(position.left).toBeGreaterThanOrEqual(0);
        expect(position.top).toBeGreaterThanOrEqual(0);
        expect(position.left + PREVIEW_WIDTH_PX).toBeLessThanOrEqual(VIEWPORT.width);
        expect(position.top + PREVIEW_HEIGHT_PX).toBeLessThanOrEqual(VIEWPORT.height);
      }
    }
  });

  it('팝오버보다 낮은 화면에서도 위쪽에 붙여 좌표가 음수가 되지 않는다', () => {
    // 세로 예산이 팝오버 높이보다 작은 극단(짧은 창). 아래로 잘릴지언정 위로 넘치지는 않는다.
    const { top } = getShelfCoverPreviewPosition(anchorAt(200, 10, 40, 100), 1440, 200);
    expect(top).toBeGreaterThanOrEqual(0);
  });

  it('팝오버 비율은 Feed 카드와 같은 3:4다', () => {
    expect(PREVIEW_WIDTH_PX / PREVIEW_HEIGHT_PX).toBeCloseTo(3 / 4, 5);
  });
});
