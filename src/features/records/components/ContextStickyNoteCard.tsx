import { useRef, useState, type KeyboardEvent } from 'react';
import {
  ContextStickyNote,
  CONTEXT_STICKY_NOTE_STACK_OFFSET_PX,
  type StickyNoteMetrics,
} from '@/shared/ui/ContextStickyNote';
import type { RecordDetail } from '../api/getRecordDetail';
import { useDeleteContextMutation } from '../hooks/useDeleteContextMutation';
import { useUpdateContextMutation } from '../hooks/useUpdateContextMutation';

const CONTEXT_BODY_MAX_LENGTH = 500;

type ContextDetail = NonNullable<RecordDetail['contexts']>[number];

interface ContextStickyNoteCardProps {
  recordId: number;
  context: ContextDetail;
  ownedByMe: boolean;
  /** 세로 스택에서 이 카드의 0-based 순서(포스트잇 겹침용). */
  stackIndex: number;
  /** ContextStickyNote의 부착감 변형을 그대로 넘긴다(373 — Record 상세는 'flat'). */
  attachment?: 'lifted' | 'flat';
  /** flat 전용 종이 치수(415 — 맥락이 많을수록 조인다). 그대로 흘려보낸다. */
  metrics?: StickyNoteMetrics;
}

/**
 * Context 항목 하나(표시 + 인라인 수정 + 삭제). Record 상세(독립 페이지·홈 오버레이)와 Collection
 * 상세(우측 페이지) 양쪽에서 쓴다 — Context는 Record 소유라 features/records에 두고, collections는
 * 이 컴포넌트를 참조한다(기존에도 DeleteConfirmDialog 등을 같은 방식으로 참조해 왔다).
 * 수정/삭제는 useUpdateContextMutation/useDeleteContextMutation을 그대로 쓴다 — Context 수정은
 * 교체라 응답의 새 contextId로 캐시가 갱신되며(conventions.md), 무효화 패턴도 두 훅에 위임한다.
 */
export function ContextStickyNoteCard({
  recordId,
  context,
  ownedByMe,
  stackIndex,
  attachment,
  metrics,
}: ContextStickyNoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftBody, setDraftBody] = useState(context.body);
  // Enter/Escape가 편집을 이미 끝낸 다음에 뒤따르는 blur가 저장을 한 번 더 트리거하지 않도록 막는 가드
  // ("변경 없음" 스킵 경로는 isPending 가드가 없어 별도로 필요하다).
  const skipNextBlurRef = useRef(false);

  const updateContextMutation = useUpdateContextMutation();
  const deleteContextMutation = useDeleteContextMutation(recordId);

  const showDeleteError =
    deleteContextMutation.isError &&
    deleteContextMutation.error.code !== 'DELETE_CONFIRMATION_REQUIRED';

  const handleStartEdit = () => {
    setDraftBody(context.body);
    setIsEditing(true);
  };

  const commitEdit = () => {
    if (updateContextMutation.isPending) {
      return;
    }
    const trimmed = draftBody.trim();
    if (!trimmed || trimmed === context.body.trim()) {
      setDraftBody(context.body);
      setIsEditing(false);
      return;
    }
    updateContextMutation.mutate(
      { recordId, contextId: context.contextId, body: trimmed },
      { onSuccess: () => setIsEditing(false) },
    );
  };

  const handleBlur = () => {
    if (skipNextBlurRef.current) {
      skipNextBlurRef.current = false;
      return;
    }
    commitEdit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      skipNextBlurRef.current = true;
      commitEdit();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      skipNextBlurRef.current = true;
      setDraftBody(context.body);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      // 415: 수정 중인 카드가 흰 입력 상자로 변하면 무리에서 한 장만 종이가 아닌 것처럼 튄다.
      // 작성 자리(ContextComposerSlot)와 같은 인덱스 카드 문법(크림 종이·잉크 테두리·대시 점선·
      // 손글씨 본문)으로 맞춰, 고치는 동안에도 같은 포스트잇으로 읽히게 한다. 동작은 그대로다.
      <div
        // 415-24: 그림자 없음 — 무리의 다른 포스트잇과 같은 규칙이다.
        className="relative flex flex-col rounded-sm border border-[#CFC5AC] bg-[#F7F3E8] px-5 pb-4 pt-5"
        // 치수는 무리와 같은 단계를 따른다 — 한 장만 커지면 그 줄이 밀려 무리가 흐트러진다.
        style={{
          marginTop: stackIndex > 0 ? -CONTEXT_STICKY_NOTE_STACK_OFFSET_PX : 0,
          paddingLeft: metrics?.padXPx,
          paddingRight: metrics?.padXPx,
          paddingTop: metrics && Math.round(metrics.padTopPx * 0.6),
          paddingBottom: metrics && Math.round(metrics.padBottomPx * 0.7),
        }}
      >
        <textarea
          autoFocus
          value={draftBody}
          onChange={(event) => setDraftBody(event.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          maxLength={CONTEXT_BODY_MAX_LENGTH}
          disabled={updateContextMutation.isPending}
          aria-label="맥락 본문 수정"
          className="min-h-[76px] flex-1 resize-none bg-transparent font-hand text-xl leading-6 text-pin-navy outline-none disabled:opacity-60"
          style={{
            fontSize: metrics?.bodyFontPx,
            lineHeight: metrics && `${metrics.bodyLineHeightPx}px`,
          }}
        />
        <div aria-hidden="true" className="mt-2 h-0 border-t border-dashed border-[#CFC5AC]" />
        <p className="mt-2 text-right font-sans text-[11px] tracking-wide text-[#a89f8a]">
          {draftBody.length}/{CONTEXT_BODY_MAX_LENGTH}
        </p>
        {updateContextMutation.isError && (
          <p className="text-xs text-red-600">{updateContextMutation.error.message}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <ContextStickyNote
        contextId={context.contextId}
        body={context.body}
        editable={ownedByMe}
        onEdit={handleStartEdit}
        onDelete={() => deleteContextMutation.mutate(context.contextId)}
        busy={deleteContextMutation.isPending}
        createdAt={context.createdAt}
        stackIndex={stackIndex}
        attachment={attachment}
        metrics={metrics}
      />
      {showDeleteError && (
        <p className="relative z-30 mt-1 text-xs text-red-600">
          {deleteContextMutation.error.message}
        </p>
      )}
    </div>
  );
}
