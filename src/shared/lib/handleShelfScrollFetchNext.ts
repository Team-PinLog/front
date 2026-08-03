import type { UIEvent } from 'react';

// 287-18: MyShelfColumn·FollowedShelfCollections가 공유하는 무한 스크롤 트리거 — 스크롤 박스
// (overflow-y-auto)가 바닥 근처에 닿으면 다음 페이지를 자동으로 fetch한다. "더보기" 버튼은 스크롤로
// 이미 불러온 항목을 보여주는 것과 서버에서 더 불러오는 것, 두 가지 다른 동작을 각각 버튼과
// 스크롤바로 나눠 보여줘 헷갈렸다 — 스크롤 자체가 "더 불러오기" 트리거를 겸하게 통합한다.
const NEAR_BOTTOM_THRESHOLD_PX = 48;

interface HandleShelfScrollFetchNextOptions {
  hasNext: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

export function handleShelfScrollFetchNext(
  event: UIEvent<HTMLDivElement>,
  { hasNext, isFetchingNextPage, fetchNextPage }: HandleShelfScrollFetchNextOptions,
): void {
  if (!hasNext || isFetchingNextPage) {
    return;
  }
  const element = event.currentTarget;
  const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
  if (distanceFromBottom <= NEAR_BOTTOM_THRESHOLD_PX) {
    fetchNextPage();
  }
}
