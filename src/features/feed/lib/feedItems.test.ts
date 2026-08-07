import { describe, expect, it } from 'vitest';
import { isPinnedFeedItem, mergePinnedFeedItems } from './feedItems';
import type { FeedCollectionItem } from '../api/getFeedCollections';
import type { PinnedFeedCollectionItem } from './feedItems';

function serverItem(collectionId: number, position: number): FeedCollectionItem {
  return {
    position,
    collectionId,
    title: `server-${collectionId}`,
    recordCount: 3,
    keywords: [],
    coverImageUrl: null,
    createdAt: '2026-08-01T00:00:00Z',
  };
}

function pinnedItem(collectionId: number): PinnedFeedCollectionItem {
  return {
    pinned: true,
    collectionId,
    title: `pinned-${collectionId}`,
    recordCount: 1,
    keywords: [],
    coverImageUrl: null,
    createdAt: '2026-08-01T00:00:00Z',
  };
}

// 412: PR #177 리뷰 Blocker(집계 왜곡)의 회귀 방지 — 이 두 가지가 무너지면 IMPRESSION/CLICK 통계가
// 다시 어긋난다.
describe('mergePinnedFeedItems', () => {
  it('고정 카드를 앞에 두고 서버 항목은 하나도 버리지 않는다', () => {
    const merged = mergePinnedFeedItems(
      [pinnedItem(11), pinnedItem(12)],
      [serverItem(1, 0), serverItem(2, 1)],
    );

    expect(merged.map((item) => item.collectionId)).toEqual([11, 12, 1, 2]);
    // 서버가 준 position은 그대로 살아 있다(재계산 금지).
    expect(merged.filter((item) => !isPinnedFeedItem(item)).map((item) => item.position)).toEqual([
      0, 1,
    ]);
  });

  it('중복 시 서버 항목을 살리고 고정 사본을 떨어뜨린다 — 실 슬롯의 position·CLICK 보존', () => {
    const merged = mergePinnedFeedItems(
      [pinnedItem(11), pinnedItem(12)],
      [serverItem(11, 0), serverItem(2, 1)],
    );

    expect(merged.map((item) => item.collectionId)).toEqual([12, 11, 2]);
    const survivor = merged.find((item) => item.collectionId === 11);
    expect(survivor && isPinnedFeedItem(survivor)).toBe(false);
  });

  it('고정 카드가 없으면 서버 목록 그대로다(실패 폴백)', () => {
    const serverItems = [serverItem(1, 0), serverItem(2, 1)];

    expect(mergePinnedFeedItems([], serverItems)).toEqual(serverItems);
  });
});
