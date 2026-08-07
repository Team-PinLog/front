import { useState } from 'react';
import { useCreateRecordMutation } from '@/features/records/hooks/useCreateRecordMutation';
import { useFeedEventQueue } from '@/features/feed/hooks/useFeedEventQueue';
import type { PlaceSummary } from '../api/getCollectionDetail';
import { COLLECTION_ACCENT_ACTION_CLASS, COLLECTION_ACTION_CLASS } from './collectionActionStyles';

const CONTEXT_BODY_MAX_LENGTH = 500;

interface RecordSaveButtonProps {
  place: PlaceSummary;
  collectionId: number;
  feedRequestId?: string;
  feedPosition?: number;
}

/**
 * 공개 Collection의 타인 Record를 내 Record로 저장하는 버튼.
 * 근거: Jira S15P11A705-142, docs/reference/08_API_명세.md 5.1(POST /records)·10.2(추천 이벤트).
 * ownedByMe: false일 때만 노출해야 하며, 그 판단은 호출부(CollectionDetailView)가 한다.
 * Feed 경유 진입(collectionDetailRoute의 feedRequestId/feedPosition search param)일 때만 SAVE 이벤트를 큐잉한다
 * — Feed를 거치지 않은 진입(내 책장·팔로우 책장 등)은 큐잉을 생략한다.
 * 332: 시안에 이 버튼 자리는 없지만 Feed 유입의 핵심 동선이라 기능을 유지하고, 톤만 시안의 라이트
 * 아웃라인 필(collectionActionStyles)로 맞췄다 — 표현만 바뀌었고 mutation·큐잉 조건은 그대로다.
 */
export function RecordSaveButton({
  place,
  collectionId,
  feedRequestId,
  feedPosition,
}: RecordSaveButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [contextBody, setContextBody] = useState('');
  const createMutation = useCreateRecordMutation();
  const feedEventQueue = useFeedEventQueue();

  // kakaoPlaceId는 [확인 필요] 필드라 응답에 없을 수 있다(getCollectionDetail.ts) — 없으면 조용히 숨긴다.
  // place.kakaoPlaceId 형태로 좁혀도 아래 클로저(handleSubmit)까지는 좁혀진 타입이 전달되지 않아 로컬 const로 뽑아둔다.
  const kakaoPlaceId = place.kakaoPlaceId;
  if (kakaoPlaceId === undefined) {
    return null;
  }

  const handleOpen = () => setIsOpen(true);

  const handleCancel = () => {
    setIsOpen(false);
    setContextBody('');
    createMutation.reset();
  };

  const handleSubmit = () => {
    const trimmed = contextBody.trim();
    if (!trimmed) {
      return;
    }
    createMutation.mutate(
      {
        place: {
          kakaoPlaceId,
          name: place.name,
          address: place.address,
          lat: place.lat,
          lng: place.lng,
        },
        contextBody: trimmed,
      },
      {
        onSuccess: () => {
          if (feedRequestId === undefined || feedPosition === undefined) {
            return;
          }
          feedEventQueue.enqueue({
            requestId: feedRequestId,
            event: 'SAVE',
            collectionId,
            placeId: place.placeId,
            position: feedPosition,
          });
        },
      },
    );
  };

  if (createMutation.isSuccess) {
    const message =
      createMutation.data.result === 'CONTEXT_ADDED'
        ? '이미 저장한 장소예요, 기록이 추가됐어요.'
        : '저장했어요.';
    return <p className="text-sm font-bold text-log-mint">{message}</p>;
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className={`flex-none ${COLLECTION_ACCENT_ACTION_CLASS}`}
      >
        저장하기
      </button>
    );
  }

  return (
    <div className="flex w-full basis-full flex-col gap-1">
      <textarea
        value={contextBody}
        onChange={(event) => setContextBody(event.target.value)}
        maxLength={CONTEXT_BODY_MAX_LENGTH}
        placeholder="이 장소에서 기억하고 싶은 맥락을 적어보세요"
        disabled={createMutation.isPending}
        className="min-h-[80px] w-full resize-none rounded-xl border border-line-card bg-snow-white p-3 text-sm leading-relaxed text-pin-navy outline-none placeholder:text-ink-gray-light focus:border-log-mint focus:ring-2 focus:ring-log-mint/20 disabled:opacity-40"
      />
      <p className="text-right text-[11px] text-ink-gray-light">
        {contextBody.length}/{CONTEXT_BODY_MAX_LENGTH}
      </p>

      {createMutation.isError && (
        <p className="text-xs text-red-600">{createMutation.error.message}</p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={createMutation.isPending}
          className={COLLECTION_ACTION_CLASS}
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!contextBody.trim() || createMutation.isPending}
          className="h-10 rounded-xl bg-log-mint px-4 text-sm font-bold text-pin-navy shadow-sm transition-colors hover:brightness-95 disabled:opacity-40"
        >
          {createMutation.isPending ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  );
}
