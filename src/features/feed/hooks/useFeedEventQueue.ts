import { useEffect } from 'react';
import {
  enqueueFeedEvent,
  flushFeedEventQueue,
  type FeedEventQueueEntry,
} from '../lib/feedEventQueue';

/**
 * ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. 큐(feedEventQueue)·API 함수를 직접 부르지 않는다.
 * 언마운트 시 디바운스 대기 없이 큐를 즉시 한 번 더 flush한다(페이지 이탈로 인한 유실 방지).
 */
export function useFeedEventQueue() {
  useEffect(() => {
    return () => {
      flushFeedEventQueue();
    };
  }, []);

  return { enqueue: (entry: FeedEventQueueEntry) => enqueueFeedEvent(entry) };
}
