import { useRef, useState, type KeyboardEvent } from 'react';
import type { RecordDetail } from '../api/getRecordDetail';
import { useDeleteContextMutation } from '../hooks/useDeleteContextMutation';
import { useUpdateContextMutation } from '../hooks/useUpdateContextMutation';

const CONTEXT_BODY_MAX_LENGTH = 500;

type ContextDetail = NonNullable<RecordDetail['contexts']>[number];

interface ContextCardProps {
  recordId: number;
  context: ContextDetail;
}

/**
 * Record 상세의 Context 항목 하나: 표시 + 인라인 수정 + 삭제.
 * 근거: Jira S15P11A705-164, docs/reference/08_API_명세.md 5.5.
 * 삭제는 138의 useDeleteContextMutation을 그대로 재사용한다 — 409(DELETE_CONFIRMATION_REQUIRED)
 * 응답 시 Hook 내부에서 DeleteConfirmContext.open을 호출해 상위(RecordDetailPage)의
 * DeleteConfirmDialog가 열리므로, 이 컴포넌트는 여기서 별도 확인 모달을 만들지 않는다.
 * 일반 삭제(204)와 연쇄 삭제 안내(409)는 서버 응답만으로 갈리므로 마지막 Context 여부를
 * 클라이언트가 미리 알 필요가 없다(props에서 제외).
 */
export function ContextCard({ recordId, context }: ContextCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftBody, setDraftBody] = useState(context.body);
  // Enter/Escape가 이미 편집을 마무리한 다음에 뒤따르는 blur 이벤트가 저장을 한 번 더
  // 트리거하지 않도록 막는 가드. commitEdit 자체도 isPending으로 재진입을 막지만,
  // "변경 없음" 스킵 경로(비동기 대기 없이 setIsEditing(false)로 바로 끝남)에는 isPending
  // 가드가 없어 뒤이은 blur가 다시 commitEdit을 부를 수 있어 별도로 필요하다.
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
    // 변경 없음 또는 빈 값이면 API를 호출하지 않고 표시 모드로만 복귀한다.
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
      // Shift+Enter는 줄바꿈으로 남겨두고, 그 외 Enter만 저장 트리거로 취급한다.
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
      <div className="flex flex-col gap-2 rounded-lg border border-log-mint bg-white p-4">
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
    <div className="relative flex flex-col gap-2 rounded-lg border border-line-card bg-white p-4">
      <div className="absolute right-2 top-2 flex gap-1">
        <button
          type="button"
          onClick={handleStartEdit}
          aria-label="맥락 수정"
          className="h-6 w-6 rounded text-xs font-bold text-ink-gray-light hover:text-log-mint"
        >
          ✎
        </button>
        <button
          type="button"
          onClick={() => deleteContextMutation.mutate(context.contextId)}
          disabled={deleteContextMutation.isPending}
          aria-label="맥락 삭제"
          className="h-6 w-6 rounded text-sm font-bold text-ink-gray-light hover:text-red-600 disabled:opacity-40"
        >
          ×
        </button>
      </div>

      <p className="whitespace-pre-wrap pr-14 text-sm leading-relaxed text-ink-gray">
        {context.body}
      </p>

      {showDeleteError && (
        <p className="text-xs text-red-600">{deleteContextMutation.error.message}</p>
      )}
    </div>
  );
}
