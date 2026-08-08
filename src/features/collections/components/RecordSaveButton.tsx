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
  /**
   * 418: 같은 저장 흐름을 두 가지 모양으로 쓴다.
   * - 'button'(기본): 332부터 있던 라이트 아웃라인 필.
   * - 'slot': 컬렉션 펼침면 타인 배치 우측 하단의 **점선 카드**. 시안의 그 자리는 "맥락을 더한다"가
   *   아니라 "이 장소를 내 기록에 담는다"로 확정됐다(418 코멘트 3의 5번).
   */
  variant?: 'button' | 'slot';
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
  variant = 'button',
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

  const isSlot = variant === 'slot';

  if (createMutation.isSuccess) {
    const message =
      createMutation.data.result === 'CONTEXT_ADDED'
        ? '이미 저장한 장소예요, 기록이 추가됐어요.'
        : '내 기록에 담았어요.';
    if (!isSlot) {
      return <p className="text-sm font-bold text-log-mint">{message}</p>;
    }
    // 저장하면 이 Record는 내 것이 되므로 이후 맥락을 더할 수 있다 — 그 사실만 조용히 알린다.
    // 여기서 곧바로 내 기록으로 이동시키지는 않는다. 보던 컬렉션에서 사용자를 끌어내지 않는 편이
    // 이 화면의 성격(남의 책을 펼쳐 읽는 중)에 맞다.
    return (
      <div className="rounded-sm border-2 border-dashed border-[#bcd8c7] bg-[#f4faf6] px-4 py-5 text-center">
        <p className="font-hand text-xl leading-6 text-[#3f7d5f]">{message}</p>
        <p className="mt-1 text-[12px] text-[#8a857e]">이제 내 기록에서 맥락을 더할 수 있어요.</p>
      </div>
    );
  }

  if (!isOpen) {
    if (isSlot) {
      // 389의 '다음 포스트잇 자리'와 같은 점선 실루엣 문법이되, 하는 일이 다르므로 색이 다르다 —
      // 저장은 이 페이지에서 유일하게 내 서재를 건드리는 동작이라 민트로 표시한다.
      // 418-37: 폭을 면 전체(w-full)에서 **문구 폭**으로 줄였다. 점선 카드가 우측 면을 가로지르면
      // 폴라로이드(w-[68%] max-w-[260px])보다 넓어져 이 면의 주인공이 사진이 아니라 버튼이 된다.
      // 세로로 쌓았던 ＋와 문구를 한 줄로 눕히고(문구는 nowrap이라 두 줄로 끊기지 않는다) 좌우
      // 여백만 남기면 폭이 약 260px로 폴라로이드와 나란해진다. 세로 위치는 그대로다.
      return (
        <button
          type="button"
          onClick={handleOpen}
          className="flex max-w-full items-center justify-center gap-2 self-center whitespace-nowrap rounded-sm border-2 border-dashed border-[#cfe2d6] bg-white/45 px-5 py-3.5 text-center transition-colors hover:border-[#4f9b78] hover:bg-white/75 focus:outline-none focus-visible:border-[#4f9b78] focus-visible:bg-white/75"
        >
          <span className="text-xl leading-none text-[#9dc4ac]" aria-hidden="true">
            ＋
          </span>
          <span className="font-hand text-xl leading-6 text-[#3f7d5f]">
            이 장소를 내 기록에 담기
          </span>
        </button>
      );
    }
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

  if (isSlot) {
    // 열린 뒤에도 점선 자리와 같은 판형을 유지한다 — 한 장만 흰 입력 상자로 바뀌면 종이 위에서
    // 그 자리만 앱 UI로 튄다(415가 ContextStickyNoteCard 편집 모드에서 내린 것과 같은 판단).
    return (
      <div className="flex flex-col gap-2 rounded-sm border border-[#CFC5AC] bg-[#F7F3E8] px-4 pb-3 pt-4">
        <textarea
          autoFocus
          value={contextBody}
          onChange={(event) => setContextBody(event.target.value)}
          maxLength={CONTEXT_BODY_MAX_LENGTH}
          placeholder="이 장소에서 기억하고 싶은 맥락을 적어보세요"
          disabled={createMutation.isPending}
          aria-label="내 기록에 담을 맥락"
          className="min-h-[76px] w-full resize-none bg-transparent font-hand text-xl leading-6 text-pin-navy outline-none placeholder:text-[#b3ab99] disabled:opacity-60"
        />
        <div aria-hidden="true" className="h-0 border-t border-dashed border-[#CFC5AC]" />
        {createMutation.isError && (
          <p className="text-xs text-red-600">{createMutation.error.message}</p>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="font-sans text-[11px] tracking-wide text-[#a89f8a]">
            {contextBody.length}/{CONTEXT_BODY_MAX_LENGTH}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCancel}
              disabled={createMutation.isPending}
              className="rounded-full px-3 py-1.5 text-[13px] font-bold text-[#8a857e] transition-colors hover:bg-black/5 disabled:opacity-40"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!contextBody.trim() || createMutation.isPending}
              className={`rounded-full px-4 py-1.5 text-[13px] font-bold text-white transition-colors ${
                contextBody.trim() && !createMutation.isPending
                  ? 'bg-[#4f9b78] hover:bg-[#448a6a]'
                  : 'bg-[#bcd8c7]'
              }`}
            >
              {createMutation.isPending ? '담는 중…' : '담기'}
            </button>
          </div>
        </div>
      </div>
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
