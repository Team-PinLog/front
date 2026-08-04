import { useEffect, useState } from 'react';

// 295 반응형 재설계: 이전엔 폭 하나로 --shelf-scale을 연속적으로 줄이며 md(768px)·lg(1024px) 두
// 지점만 "한 행에 몇 칸"(정수) 판단에 썼다. 이번 재설계는 Feed 그리드(열×행)·Library 동시 노출
// 책장 수를 breakpoint마다 통째로 다른 "배치"로 이산적으로 바꾸는 방식이라, 그 경계값도
// 768px(md)·1280px(xl, Tailwind 기준)로 바뀐다 — sm(<768)·mdlg(768~1279)·xl(≥1280) 3단계.
// Feed는 mdlg 구간에서만 추가로 orientation도 봐야 해서(가로 4×2 / 세로 3×3) 별도 훅으로 분리한다.
export type ShelfWidthTier = 'sm' | 'mdlg' | 'xl';

const MDLG_MIN_QUERY = '(min-width: 768px)';
const XL_MIN_QUERY = '(min-width: 1280px)';

function resolveWidthTier(mdlgMatches: boolean, xlMatches: boolean): ShelfWidthTier {
  if (xlMatches) {
    return 'xl';
  }
  if (mdlgMatches) {
    return 'mdlg';
  }
  return 'sm';
}

function getInitialWidthTier(): ShelfWidthTier {
  if (typeof window === 'undefined') {
    return 'xl';
  }
  return resolveWidthTier(
    window.matchMedia(MDLG_MIN_QUERY).matches,
    window.matchMedia(XL_MIN_QUERY).matches,
  );
}

export function useShelfWidthTier(): ShelfWidthTier {
  const [tier, setTier] = useState<ShelfWidthTier>(getInitialWidthTier);

  useEffect(() => {
    const mdlgQuery = window.matchMedia(MDLG_MIN_QUERY);
    const xlQuery = window.matchMedia(XL_MIN_QUERY);
    const update = () => setTier(resolveWidthTier(mdlgQuery.matches, xlQuery.matches));

    update();
    mdlgQuery.addEventListener('change', update);
    xlQuery.addEventListener('change', update);
    return () => {
      mdlgQuery.removeEventListener('change', update);
      xlQuery.removeEventListener('change', update);
    };
  }, []);

  return tier;
}

const LANDSCAPE_QUERY = '(orientation: landscape)';

function getInitialIsLandscape(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  return window.matchMedia(LANDSCAPE_QUERY).matches;
}

// Feed의 mdlg(768~1279px) 구간에서만 4×2(가로)/3×3(세로) 분기에 쓴다 — sm/xl은 orientation과
// 무관하게 그리드가 고정이라 이 훅을 참조하지 않는다.
export function useIsLandscapeOrientation(): boolean {
  const [isLandscape, setIsLandscape] = useState<boolean>(getInitialIsLandscape);

  useEffect(() => {
    const query = window.matchMedia(LANDSCAPE_QUERY);
    const update = () => setIsLandscape(query.matches);

    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return isLandscape;
}

export interface ViewportSize {
  width: number;
  height: number;
}

const DEFAULT_VIEWPORT_SIZE: ViewportSize = { width: 1280, height: 900 };

function getViewportSize(): ViewportSize {
  if (typeof window === 'undefined') {
    return DEFAULT_VIEWPORT_SIZE;
  }
  return { width: window.innerWidth, height: window.innerHeight };
}

// 295 추가 수정(요구사항 1/2): sm·mdlg 구간 Feed 카드는 더 이상 breakpoint별 고정 표(스케일=1)가
// 아니라, 실제 뷰포트 폭·높이에 맞춰 연속적으로 커지거나 작아진다(3:4 비율은 항상 고정, 크기만
// 가변) — 폭은 그리드가 가로로 넘치지 않는 상한을, 높이는 캐비닛 세로 예산(동적)을 넘지 않는 상한을
// 정하는 데 쓴다(shelfCabinetLayout.ts의 solveFeedScale/getFeedDynamicBudgetPx). 두 값을 한 번의
// resize 리스너로 함께 관찰해 불필요한 훅 중복을 없앤다.
export function useViewportSize(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>(getViewportSize);

  useEffect(() => {
    const update = () => setSize(getViewportSize());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return size;
}
