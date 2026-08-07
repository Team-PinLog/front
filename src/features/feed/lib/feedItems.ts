import type { FeedCollectionItem } from '../api/getFeedCollections';

/**
 * 412: Feed 책장 한 칸에 들어갈 수 있는 항목의 타입 정의.
 *
 * 카드(CollectionBookCard·BookstoreFeed)가 실제로 읽는 필드에는 `position`이 없다 — position은
 * "Feed 응답의 몇 번째 슬롯인가"라는 이벤트 전용 값이라, 표시 계층이 아니라 이벤트 큐잉(FeedList)만
 * 안다. 이 구분을 타입으로 못 박아 두면 Feed 응답에 속하지 않는 항목(고정 카드)이 position을
 * 지어내서 들고 다닐 필요가 없다.
 */
export type FeedCardItem = Omit<FeedCollectionItem, 'position'>;

/**
 * 412: 고정 노출 카드. PR #177은 `position: -1 - index` sentinel로 "Feed 응답이 아님"을 표시했는데,
 * 그 값은 계약 필드(position: 실제 응답 값 그대로)의 타입을 오염시키고 언젠가 이벤트에 실려 나갈
 * 회귀 위험이 있었다. 이제 position 자체를 갖지 않고 `pinned: true`로 판별한다 — 실수로 이벤트
 * 경로에 넣으면 타입 에러가 난다.
 */
export type PinnedFeedCollectionItem = FeedCardItem & { pinned: true };

/** 서버 추천 항목(position 있음) 또는 고정 카드(position 없음). */
export type FeedSlotItem = (FeedCollectionItem & { pinned?: false }) | PinnedFeedCollectionItem;

export function isPinnedFeedItem(item: FeedSlotItem): item is PinnedFeedCollectionItem {
  return item.pinned === true;
}

/**
 * 412(PR #177 리뷰 Blocker): 고정 카드와 서버 추천 목록을 합친다.
 *
 * ⚠️ **서버 항목은 하나도 버리지 않는다.** PR #177은 고정 2권을 앞에 끼우고 `slice(0, pageSize)`로
 * 뒤를 잘랐는데, 잘린 항목은 서버가 응답을 만들 때 이미 IMPRESSION을 기록한 뒤였고 cursor 체인상
 * 다음 페이지에도 다시 나오지 않아 "노출 없는 impression"이 매 세션 쌓였다. 슬롯 예산은 여기서
 * 자르는 대신 **요청 크기**로 맞춘다(FeedList의 feedRequestSize).
 *
 * ⚠️ **중복은 서버 항목을 살린다.** 알고리즘이 같은 collectionId를 실제로 추천했다면 그쪽이 실
 * position을 가진 진짜 슬롯이다 — 고정 사본을 남기면 그 슬롯의 CLICK이 영원히 0으로 남아 CTR이
 * 왜곡된다. 그래서 겹치는 고정 사본을 떨어뜨린다(그 페이지는 고정 카드가 한 장 줄고 빈 슬롯이
 * 하나 생긴다 — 책장 크기는 그대로다).
 */
export function mergePinnedFeedItems(
  pinnedItems: readonly PinnedFeedCollectionItem[],
  serverItems: readonly FeedCollectionItem[],
): FeedSlotItem[] {
  const serverCollectionIds = new Set(serverItems.map((item) => item.collectionId));
  return [
    ...pinnedItems.filter((item) => !serverCollectionIds.has(item.collectionId)),
    ...serverItems,
  ];
}
