import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * 348: 확인 다이얼로그 공용 셸.
 *
 * 이 레포에는 확인 다이얼로그가 이미 셋 있고(Collection 삭제·Record 삭제·회원 탈퇴) 셸 마크업이
 * 글자 그대로 같다. 그 모양을 공용으로 뽑되, **셋 다 빠져 있던 접근성**을 여기서 채운다:
 * alertdialog 역할, 열릴 때 포커스 이동, 포커스 트랩, ESC 취소, 닫힐 때 원래 자리로 복귀.
 *
 * ⚠️ 기존 세 다이얼로그의 이관은 이 티켓이 아니다(S15P11A705-349). 세 파일이 각각 다른 작업
 * 레인에서 수정 중이라 지금 손대면 충돌한다 — 여기서는 신설 + 팔로우 해제 적용까지만 한다.
 *
 * --- 정책 ---
 * - **배경 클릭으로 닫지 않는다.** 324(기록 작성 시트)에서 정한 선례와 같고, 기존 세 다이얼로그도
 *   이미 그렇다. 파괴적 확인을 배경 오클릭으로 취소시키면 "취소된 줄 모르고 넘어가는" 쪽이 는다.
 * - **ESC는 취소다.** 324는 시트의 ESC 닫기를 막았지만 그 근거는 "작성 중인 Context 본문이
 *   사라진다"였다. 확인 다이얼로그는 **잃을 입력이 없으므로** 그 결정과 모순되지 않는다.
 * - 기본 포커스는 **취소 버튼**이다. 파괴적 액션에서 Enter 연타로 확인이 눌리면 안 된다.
 * - 진행 중(isPending)에는 확인·취소·ESC가 모두 막힌다 — 요청이 한 번만 나가게 하고, 응답을
 *   기다리는 도중 화면이 사라져 결과를 놓치는 것도 막는다.
 */

// 포커스 트랩이 순회할 대상. 다이얼로그 안에는 버튼 둘뿐이지만, 나중에 링크·입력이 들어와도
// 트랩이 저절로 따라오도록 일반적인 선택자를 쓴다.
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export interface ConfirmDialogProps {
  isOpen: boolean;
  /** 다이얼로그의 제목. aria-labelledby가 이걸 가리킨다. */
  title: string;
  /** 제목 아래 부연. 없으면 제목만으로 성립한다(aria-describedby도 붙지 않는다). */
  description?: ReactNode;
  confirmLabel: string;
  /** 진행 중일 때 확인 버튼 문구. 없으면 confirmLabel 그대로 둔다. */
  pendingLabel?: string;
  cancelLabel?: string;
  /**
   * 되돌리기 어려운 동작은 'danger'. 확인 버튼 색만 바뀐다 — 문구·배치는 같아야 사용자가 매번
   * 다시 읽지 않는다.
   */
  tone?: 'default' | 'danger';
  isPending?: boolean;
  /** 실패 메시지. 다이얼로그를 연 채로 보여준다(닫아버리면 왜 실패했는지 사라진다). */
  errorMessage?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  pendingLabel,
  cancelLabel = '취소',
  tone = 'default',
  isPending = false,
  errorMessage = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // 열릴 때: 직전에 포커스돼 있던 요소를 기억하고 취소 버튼으로 이동. 닫힐 때: 그 자리로 복귀.
  // 복귀가 중요한 이유는 키보드 사용자다 — 복귀하지 않으면 포커스가 body로 떨어져, 다이얼로그를
  // 취소한 뒤 Tab이 페이지 맨 처음부터 다시 시작한다.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    cancelButtonRef.current?.focus();

    return () => {
      // 열어준 요소가 그사이 DOM에서 사라졌으면(메뉴가 닫혔다든지) 복귀할 자리가 없다 — 그때는
      // 아무것도 하지 않는다. 사라진 노드에 focus()를 불러도 조용히 무시되지만, 의도를 남긴다.
      if (previouslyFocused !== null && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

  // ESC 취소 + 포커스 트랩. isPending이 바뀌면 핸들러가 최신 값을 봐야 하므로 의존성에 넣는다
  // (위 포커스 이동 effect와 분리한 이유 — 합치면 진행 상태가 바뀔 때마다 포커스가 취소 버튼으로
  // 되돌아간다).
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // 진행 중에는 취소 버튼도 disabled다. 키보드 경로만 열려 있으면 두 경로의 동작이 어긋난다.
        if (isPending) {
          return;
        }
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== 'Tab' || dialogRef.current === null) {
        return;
      }

      // 포커스 트랩: 모달이 떠 있는 동안 Tab이 뒤 페이지로 새어 나가면 안 된다(aria-modal은
      // 보조기술에만 알릴 뿐, 실제 Tab 순서를 막아주지는 않는다).
      const focusables = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusables.length === 0) {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
        return;
      }
      if (!event.shiftKey && (active === last || !dialogRef.current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPending, onCancel]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    // body로 내보낸다 — 호출부가 overflow-hidden이나 transform을 가진 컨테이너(책장 캐비닛·책등)
    // 안에 있어도 다이얼로그가 잘리거나 좌표계가 어긋나지 않는다.
    // 배경(오버레이)에는 onClick을 달지 않는다(위 정책).
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pin-navy/40 p-4">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description === undefined ? undefined : descriptionId}
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-[0_18px_40px_rgba(4,33,66,.22)]"
      >
        <h2 id={titleId} className="text-sm font-bold leading-relaxed text-pin-navy">
          {title}
        </h2>

        {description !== undefined && (
          <div id={descriptionId} className="mt-2 text-xs leading-relaxed text-ink-gray">
            {description}
          </div>
        )}

        {errorMessage !== null && <p className="mt-3 text-xs text-red-600">{errorMessage}</p>}

        {/* 취소가 왼쪽, 확인이 오른쪽 — 기존 세 다이얼로그와 같은 배치다. 포커스 순서도 이 순서를
            따르므로, 열자마자 Tab 한 번이면 확인에 닿는다.
            ⚠️ 버튼에 focus 링을 직접 주지 않는다. 359가 :focus-visible 전역 규칙(민트 아웃라인)을
            깔아뒀고, 여기서 ring/outline을 또 얹으면 이중으로 그려진다. */}
        <div className="mt-6 flex gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="h-11 flex-1 rounded-lg border border-pin-navy/15 text-sm font-bold text-pin-navy disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`h-11 flex-1 rounded-lg text-sm font-bold disabled:opacity-40 ${
              tone === 'danger' ? 'bg-red-600 text-white' : 'bg-log-mint text-pin-navy'
            }`}
          >
            {isPending ? (pendingLabel ?? confirmLabel) : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
