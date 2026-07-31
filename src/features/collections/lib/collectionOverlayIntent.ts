// Feed·내 책장·팔로우한 책장 등에서 컬렉션 상세로 "방금 클릭해서" 들어왔는지를 새로고침과 구분하기
// 위한 모듈 스코프 플래그(207 후속). location.state.collectionOverlay만으로는 새로고침해도 브라우저가
// history state를 그대로 보존해 "인앱 클릭 직후"와 "새로고침"을 구분할 수 없다. 이 플래그는 인메모리라
// 새로고침하면 모듈이 다시 로드되며 자연히 false로 초기화된다.
let intentFlag = false;

export function markCollectionOverlayIntent(): void {
  intentFlag = true;
}

// 한 번 읽으면 즉시 소비(리셋)된다 — CollectionDetailPage가 mount 시점에 한 번만 호출해야 하며,
// 리렌더마다 다시 호출하면 항상 false만 돌려받는다.
export function consumeCollectionOverlayIntent(): boolean {
  const value = intentFlag;
  intentFlag = false;
  return value;
}
