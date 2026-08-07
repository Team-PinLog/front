import { createContext, useContext } from 'react';

/**
 * 295 추가 수정(이슈 1.1): Feed 캐비닛 세로 예산 계산에 쓰던 nav바 높이(56px)·타이틀 높이(32px)가
 * AppLayout.tsx/PageTitle.tsx의 실제 Tailwind 클래스를 사람이 손으로 옮겨 적은 추정치였다 — 오차가
 * 누적돼 예산이 실제보다 작게 잡히는 원인 중 하나였다. AppLayout(헤더에 ref)과 PageTitle(자기
 * 자신에 ref)이 각자 ResizeObserver로 실측한 높이를 이 Context로 흘려보내면, FeedList는 더 이상
 * 하드코딩된 상수를 더하지 않고 이 실측값을 그대로 쓴다. nav 디자인이 나중에 바뀌어도(padding
 * 조정, 로고 크기 변경 등) 이 Context와 FeedList의 계산 로직은 그대로 두고 AppLayout/PageTitle
 * 내부 마크업만 바뀌면 된다 — 값이 아니라 "누가 무엇을 실측해서 보고하는지"라는 책임만 고정한다.
 * measure 이전(최초 렌더)에는 null이다 — 소비 측(FeedList)이 기존 하드코딩 상수를 폴백으로 쓴다.
 *
 * 네비게이션 바 삭제: 함께 보고하던 navChromeHeightPx(하단 탭바가 세로에서 먹는 높이)가 사라졌다.
 * 재야 할 크롬이 없어져 그 값은 언제나 0이고, 0으로 고정된 항은 계산에 남길 이유가 없다.
 * 이제 이 Context가 나르는 것은 PageTitle 블록 높이 하나뿐이다.
 */
export interface LayoutMetrics {
  titleHeightPx: number | null;
  reportTitleHeightPx: (heightPx: number) => void;
}

const noop = () => {};

export const LayoutMetricsContext = createContext<LayoutMetrics>({
  titleHeightPx: null,
  reportTitleHeightPx: noop,
});

export function useLayoutMetrics(): LayoutMetrics {
  return useContext(LayoutMetricsContext);
}
