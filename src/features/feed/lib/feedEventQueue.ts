import { sendFeedEvents, type FeedEventPayload } from '../api/sendFeedEvents';

/**
 * Feed CLICK·SAVE 이벤트를 모아 배치로 전송하는 모듈 레벨 인메모리 큐.
 * 근거: Jira S15P11A705-142, docs/reference/08_API_명세.md 05-1_파트간_요구사항.md 1.3 배치 전송 계약.
 * 이벤트마다 개별 POST를 보내지 않는다 — enqueue로 쌓고, 마지막 enqueue 기준 디바운스 후 flush한다.
 * 같은 큐 안에 다른 requestId 이벤트가 섞여 있으면 requestId별로 그룹핑해서 별도 요청으로 나눠 보낸다.
 * 컴포넌트는 이 모듈을 직접 import하지 않고 hooks/useFeedEventQueue.ts를 경유한다.
 */
export interface FeedEventQueueEntry extends FeedEventPayload {
  requestId: string;
}

const FLUSH_DEBOUNCE_MS = 500;

let queue: FeedEventQueueEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function groupByRequestId(entries: FeedEventQueueEntry[]): Map<string, FeedEventPayload[]> {
  const groups = new Map<string, FeedEventPayload[]>();
  for (const { requestId, ...event } of entries) {
    const group = groups.get(requestId);
    if (group) {
      group.push(event);
    } else {
      groups.set(requestId, [event]);
    }
  }
  return groups;
}

/** 전송 실패는 콘솔 경고만 남기고 사용자 플로우를 막지 않는다(fire-and-forget). */
export function flushFeedEventQueue(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0) {
    return;
  }
  const entries = queue;
  queue = [];

  for (const [requestId, events] of groupByRequestId(entries)) {
    sendFeedEvents(requestId, events).catch((error: unknown) => {
      console.warn('[feed] 이벤트 전송 실패', error);
    });
  }
}

export function enqueueFeedEvent(entry: FeedEventQueueEntry): void {
  queue.push(entry);
  if (flushTimer) {
    clearTimeout(flushTimer);
  }
  flushTimer = setTimeout(flushFeedEventQueue, FLUSH_DEBOUNCE_MS);
}
