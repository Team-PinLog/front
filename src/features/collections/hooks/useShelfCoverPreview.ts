import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 362: 책장에서 책등에 머무를 때 표지를 띄우는 "호버 의도(hover intent)" 상태 기계.
 *
 * 상태와 타이머만 다루고 화면은 그리지 않는다 — 그리는 쪽은 ShelfCoverPreview다. 책등
 * (shared/ui/Shelf.tsx)은 이 타이머를 알 필요가 없어서, 책등은 "들어왔다/나갔다"만 알리고
 * 지연·좌표 확정은 전부 여기서 한다.
 */

// 마우스가 책장 위를 지나가기만 해도 표지가 연쇄적으로 번쩍이면 안 된다(티켓 확인 항목 2).
// 사람이 "이 책을 보려고 멈췄다"와 "지나가는 중이다"를 가르는 구간이 대략 이 정도다. 200ms를
// 넘기면 이번엔 의도적으로 올렸는데도 반응이 굼뜬 것처럼 느껴진다.
export const SHELF_COVER_PREVIEW_DELAY_MS = 180;

/** 책등의 뷰포트 기준 사각형. 팝오버가 fixed라 이 값만 있으면 위치를 정할 수 있다. */
export interface ShelfCoverPreviewAnchor {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export interface ShelfCoverPreviewState<T> {
  item: T;
  anchor: ShelfCoverPreviewAnchor;
}

export interface ShelfCoverPreview<T> {
  preview: ShelfCoverPreviewState<T> | null;
  /** 책등에 마우스가 들어오거나 키보드 포커스가 닿았을 때. 지연 뒤에 열린다. */
  open: (item: T, element: HTMLElement) => void;
  /** 벗어남·클릭·스크롤. 대기 중인 타이머도 함께 취소한다. */
  close: () => void;
}

export function useShelfCoverPreview<T>(): ShelfCoverPreview<T> {
  const [preview, setPreview] = useState<ShelfCoverPreviewState<T> | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const open = useCallback(
    (item: T, element: HTMLElement) => {
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        // 좌표를 지연이 끝난 시점에 읽는 것이 중요하다. 책등은 호버하면 위로 떠오르고(hover
        // translateY) 기울기도 0으로 펴지므로, 진입 시점에 읽은 사각형은 표지가 뜰 때의 실제
        // 위치와 어긋난다.
        const rect = element.getBoundingClientRect();
        setPreview({
          item,
          anchor: { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom },
        });
      }, SHELF_COVER_PREVIEW_DELAY_MS);
    },
    [clearTimer],
  );

  const close = useCallback(() => {
    clearTimer();
    setPreview(null);
  }, [clearTimer]);

  // 표지가 뜨기 전에 화면을 벗어나면(라우팅 등) 타이머가 남아 사라진 요소의 좌표를 읽는다.
  useEffect(() => clearTimer, [clearTimer]);

  return { preview, open, close };
}
