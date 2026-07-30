import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 10.2 추천 이벤트.
 * IMPRESSION은 서버가 10.1 응답 생성 시 자동 기록하므로 여기서 다루지 않는다 — CLICK·SAVE만 보낸다.
 * 204(본문 없음)라 Zod 파싱을 하지 않는다. 개별 호출이 아니라 features/feed/lib/feedEventQueue의 배치 flush가
 * 이 함수를 호출한다 — 컴포넌트가 직접 부르지 않는다.
 */
export type FeedEventType = 'CLICK' | 'SAVE';

export interface FeedEventPayload {
  event: FeedEventType;
  collectionId: number;
  placeId: number | null;
  position: number;
}

export async function sendFeedEvents(requestId: string, events: FeedEventPayload[]): Promise<void> {
  await httpClient.post('/feed/events', { requestId, events });
}
