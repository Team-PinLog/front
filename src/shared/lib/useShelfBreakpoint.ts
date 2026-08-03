import { useEffect, useState } from 'react';

// 287-8: Feed·Library 캐비닛의 "한 행에 몇 칸(책/카드)을 넣을지"는 CSS만으로 결정할 수 없다 —
// SHELF_ROW_SIZE/SHELF_COLUMNS가 몇 칸인지에 따라 몇 번째 다음에 선반 보드(ShelfBoard)를 끼워 넣을지
// JS가 직접 배열을 잘라야(chunk) 하기 때문이다(그리드가 알아서 줄바꿈하는 게 아니라 "행 단위" 컴포넌트를
// 반복 렌더링하는 구조). 크기(카드/책 폭 등)는 CSS clamp()로 순수하게 처리하지만, 이 "지금 몇 칸인지"
// 판단만은 이 훅으로 뷰포트 폭을 관찰해 breakpoint를 알아낸다. Tailwind 기본 breakpoint 중 md(768px)·
// lg(1024px) 두 지점만 구분한다(그 이상은 칸 수를 더 늘리지 않는다 — PC 웹 화면 대부분을 차지하는
// 구간이라 lg 이상은 카드 크기 확대만으로 충분하다는 판단).
export type ShelfBreakpoint = 'base' | 'md' | 'lg';

const MD_QUERY = '(min-width: 768px)';
const LG_QUERY = '(min-width: 1024px)';

function resolveBreakpoint(mdMatches: boolean, lgMatches: boolean): ShelfBreakpoint {
  if (lgMatches) {
    return 'lg';
  }
  if (mdMatches) {
    return 'md';
  }
  return 'base';
}

function getInitialBreakpoint(): ShelfBreakpoint {
  if (typeof window === 'undefined') {
    return 'lg';
  }
  return resolveBreakpoint(
    window.matchMedia(MD_QUERY).matches,
    window.matchMedia(LG_QUERY).matches,
  );
}

export function useShelfBreakpoint(): ShelfBreakpoint {
  const [breakpoint, setBreakpoint] = useState<ShelfBreakpoint>(getInitialBreakpoint);

  useEffect(() => {
    const mdQuery = window.matchMedia(MD_QUERY);
    const lgQuery = window.matchMedia(LG_QUERY);
    const update = () => setBreakpoint(resolveBreakpoint(mdQuery.matches, lgQuery.matches));

    update();
    mdQuery.addEventListener('change', update);
    lgQuery.addEventListener('change', update);
    return () => {
      mdQuery.removeEventListener('change', update);
      lgQuery.removeEventListener('change', update);
    };
  }, []);

  return breakpoint;
}
