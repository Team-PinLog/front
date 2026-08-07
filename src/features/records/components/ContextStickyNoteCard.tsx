import { useRef, useState, type KeyboardEvent } from 'react';
import {
  ContextStickyNote,
  CONTEXT_STICKY_NOTE_STACK_OFFSET_PX,
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
      <div
        className="relative flex flex-col gap-2 rounded-lg border border-log-mint bg-white p-4"
        style={{ marginTop: stackIndex > 0 ? -CONTEXT_STICKY_NOTE_STACK_OFFSET_PX : 0 }}
      >
        <textarea
          autoFocus
          value={draftBody}
          onChange={(event) => setDraftBody(event.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          maxLength={CONTEXT_BODY_MAX_LENGTH}
          disabled={updateContextMutation.isPending}
          className="min-h-[80px] resize-none rounded-lg border border-pin-navy/15 bg-white p-2 text-sm leading-relaxed text-pin-navy outline-none focus:border-log-mint focus:ring-2 focus:ring-log-mint/20 disabled:opacity-40"
        />
        <p className="text-right text-[11px] text-ink-gray-light">
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
        stackIndex={stackIndex}
        attachment={attachment}
      />
      {showDeleteError && (
        <p className="relative z-30 mt-1 text-xs text-red-600">
          {deleteContextMutation.error.message}
        </p>
      )}
    </div>
  );
}
