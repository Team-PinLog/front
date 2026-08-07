import { useRef, useState, type KeyboardEvent } from 'react';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { useAddRecordContextMutation } from '../hooks/useAddRecordContextMutation';

// docs/api-contract.md Context 계약. 입력 단계에서 maxLength로 사전 차단한다.
const CONTEXT_BODY_MAX_LENGTH = 500;

interface ContextComposerSlotProps {
  recordId: number;
  /** 아직 맥락이 하나도 없으면 문구가 "첫 기억"으로 바뀐다. */
  isFirst: boolean;
}

/**
 * S15P11A705-389 — "다음 포스트잇 자리" 점선 실루엣이 곧 작성 입구다.
 *
 * 373에서 이 자리는 안내판일 뿐이었고 실제 작성은 우측 열의 별도 '맥락 추가' 섹션이 맡았다.
 * 안내판과 입력이 떨어져 있어 "여기에 적으면 되겠다"는 인상이 끊겼고, 우측 섹션은 맥락이
 * 늘어나도 자리를 계속 차지했다. 389에서 둘을 합친다 — 실루엣을 누르면 그 자리가 포스트잇 모양의
 * 입력으로 바뀌고, 저장하면 진짜 포스트잇이 되며 다음 실루엣이 뒤이어 나타난다.
 *
 * 데이터 경로는 그대로다: useAddRecordContextMutation(추가 후 캐시 무효화까지 훅이 담당).
 */
export function ContextComposerSlot({ recordId, isFirst }: ContextComposerSlotProps) {
  const [isComposing, setIsComposing] = useState(false);
  const [draftBody, setDraftBody] = useState('');
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  // 저장·취소 후 포커스를 돌려놓을 자리(실루엣 버튼). 키보드 사용자가 흐름을 잃지 않게 한다.
  const slotButtonRef = useRef<HTMLButtonElement>(null);

  const addContextMutation = useAddRecordContextMutation(recordId);
  const trimmed = draftBody.trim();
  const canSave = Boolean(trimmed) && !addContextMutation.isPending;

  const closeComposer = () => {
    setIsComposing(false);
    setDraftBody('');
    addContextMutation.reset();
    // 실루엣이 다시 렌더된 뒤에 포커스를 준다.
    requestAnimationFrame(() => slotButtonRef.current?.focus());
  };

  const handleSave = () => {
    if (!canSave) {
      return;
    }
    // 실패해도 입력을 지우지 않는다 — 사유를 보여주고 그대로 다시 저장할 수 있어야 한다.
    addContextMutation.mutate(trimmed, { onSuccess: closeComposer });
  };

  const handleCancel = () => {
    // 324 정책: 잃을 입력이 있으면 함부로 닫지 않는다. 빈 입력이면 곧바로 닫는다.
    if (trimmed) {
      setIsDiscardConfirmOpen(true);
      return;
    }
    closeComposer();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      // 여기서 멈추지 않으면 홈 오버레이 같은 바깥 레이어가 같은 Esc로 함께 닫힌다.
      event.stopPropagation();
      handleCancel();
    }
  };

  if (!isComposing) {
    return (
      // 415 실물 피드백: 이 자리는 포스트잇 무리의 꼬리가 아니라 **맥락 섹션 우상단에 고정된**
      // 자리다(RecordDetailView가 위치를 정한다). 폭은 호출부가 주므로 여기서는 w-full로 받고,
      // 카드 자체는 "다음에 붙을 한 장"의 빈 실루엣 모양을 유지한다.
      <button
        ref={slotButtonRef}
        type="button"
        onClick={() => setIsComposing(true)}
        className="flex min-h-[104px] w-full flex-col items-center justify-center gap-1.5 rounded-sm border-2 border-dashed border-[#ded8cd] bg-white/45 px-4 py-5 text-center transition-colors hover:border-[#c7bda9] hover:bg-white/70 focus:outline-none focus-visible:border-[#4f9b78] focus-visible:bg-white/70"
      >
        <span className="text-xl leading-none text-[#c9c2b6]" aria-hidden="true">
          ＋
        </span>
        <span className="whitespace-pre-line font-hand text-xl leading-6 text-[#a29d95]">
          {isFirst
            ? '이 장소의 첫 기억을\n여기에 적어 붙여보세요'
            : '이 장소의 기억이\n더 쌓이길 기다려요'}
        </span>
      </button>
    );
  }

  return (
    <>
      {/* 인덱스 카드 문법(378)을 그대로 쓴다 — 크림 종이 + 잉크 테두리 + 대시 점선. 작성 중인
          메모가 이미 붙어 있는 메모들과 같은 종류로 보여야 "이 자리에 적는다"가 성립한다. */}
      <div className="flex min-h-[124px] flex-col rounded-sm border border-[#CFC5AC] bg-[#F7F3E8] px-5 pb-4 pt-5 shadow-[0_1px_1px_rgba(4,33,66,0.1),0_2px_4px_-2px_rgba(4,33,66,0.14)]">
        <textarea
          autoFocus
          value={draftBody}
          onChange={(event) => setDraftBody(event.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={CONTEXT_BODY_MAX_LENGTH}
          disabled={addContextMutation.isPending}
          aria-label="새 맥락 본문"
          placeholder="이 장소에서 기억하고 싶은 맥락을 적어보세요"
          className="min-h-[76px] flex-1 resize-none bg-transparent font-hand text-xl leading-6 text-pin-navy outline-none placeholder:text-[#b3ab99] disabled:opacity-60"
        />

        <div aria-hidden="true" className="mt-2 h-0 border-t border-dashed border-[#CFC5AC]" />

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="font-sans text-[11px] tracking-wide text-[#a89f8a]">
            {draftBody.length}/{CONTEXT_BODY_MAX_LENGTH}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCancel}
              disabled={addContextMutation.isPending}
              className="rounded-full px-3 py-1.5 text-[13px] font-bold text-[#8a857e] transition-colors hover:bg-black/5 disabled:opacity-40"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className={`rounded-full px-4 py-1.5 text-[13px] font-bold text-white transition-colors ${
                canSave ? 'bg-[#4f9b78] hover:bg-[#448a6a]' : 'bg-[#bcd8c7]'
              }`}
            >
              {addContextMutation.isPending ? '붙이는 중…' : '붙이기'}
            </button>
          </div>
        </div>

        {addContextMutation.isError && (
          <p className="mt-2 text-xs text-red-600">{addContextMutation.error.message}</p>
        )}
      </div>

      <ConfirmDialog
        isOpen={isDiscardConfirmOpen}
        title="작성 중인 메모를 버릴까요?"
        description="지금 적은 내용은 저장되지 않고 사라져요."
        confirmLabel="버리기"
        cancelLabel="계속 쓰기"
        tone="danger"
        onConfirm={() => {
          setIsDiscardConfirmOpen(false);
          closeComposer();
        }}
        onCancel={() => setIsDiscardConfirmOpen(false)}
      />
    </>
  );
}
