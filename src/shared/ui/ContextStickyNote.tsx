import { useEffect, useRef, useState, type CSSProperties } from 'react';

interface ContextStickyNoteProps {
  contextId: number;
  body: string;
  editable?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  /** true면 연필·× 버튼을 비활성화한다(수정/삭제 요청 진행 중). */
  busy?: boolean;
  /** 세로로 쌓인 스택에서 이 카드의 0-based 순서. 0이면 겹침 없음. */
  stackIndex?: number;
}

// 목업(Team-PinLog/mockup index.html) book-context-postit / openBook.contextNotes 팔레트를 그대로 가져온다.
// contextNoteColors·contextNoteRotations(라인 2984-2985)와 동일한 값이며, 인덱스는 위치가 아니라
// contextId 기반 해시로 고른다 — 리스트 순서가 바뀌거나 항목이 추가/삭제돼도 같은 Context는 항상 같은
// 색·회전각을 유지한다(리렌더 시 값 유지).
const NOTE_COLORS = ['#fff2a6', '#dcecff', '#efedeb'] as const;
const NOTE_ROTATIONS = ['-0.8deg', '0.8deg', '-0.4deg'] as const;
// 접힌 종이 띠 색: 옐로는 목업 .draft-postit:before(rgba(230,194,59,.35), 라인 113)를 그대로 쓴다.
// 블루·그레이는 목업에 다색 버전이 없어 같은 방식(배경보다 톤 다운된 같은 계열)으로 새로 만들었다.
const NOTE_FOLD_COLORS = [
  'rgba(230,194,59,.35)',
  'rgba(91,157,225,.35)',
  'rgba(163,152,145,.35)',
] as const;

// 겹침을 "카드 높이의 N%"로 계산한다(고정 -22px는 짧은 카드에서 과도해 보이는 문제가 있었다).
// 목업 .book-context-postit:nth-child(n+4){margin-top:-22px}는 고정 height:166px 기준 약 13.25%였다
// (22/166) — 비슷한 비율(15%)로 시작해 카드가 커져도 과하게 가리지 않도록 상/하한을 둔다.
const STACK_OVERLAP_RATIO = 0.15;
const STACK_OVERLAP_MIN_PX = 8;
const STACK_OVERLAP_MAX_PX = 40;
// ResizeObserver로 실측하기 전 첫 렌더에 쓰는 초기값. 0으로 시작하면 측정 직후 카드가 갑자기 위로
// 튀어 보여서, 기존 고정값(-22px)에 가까운 값으로 시작해 첫 레이아웃 점프를 최소화한다.
// ContextStickyNoteCard의 편집 모드 박스(포스트잇이 아닌 일반 텍스트박스)도 스택 리듬이 어긋나지
// 않도록 같은 값을 그대로 가져다 쓴다 — 그 박스는 내용 길이가 아니라 편집용 고정 UI라 실측 대상이 아니다.
export const CONTEXT_STICKY_NOTE_STACK_OFFSET_PX = 22;

function pickNoteIndex(contextId: number) {
  return Math.abs(contextId) % NOTE_COLORS.length;
}

type StickyNoteStyle = CSSProperties & { '--note-rotate'?: string };

/**
 * 카드 자신의 렌더링 높이를 ResizeObserver로 실측해 "카드 높이의 N%"인 겹침(px)을 계산한다.
 * CSS만으로는 이걸 표현할 수 없다 — margin의 %는 스펙상 컨테이닝 블록의 너비를 기준으로 계산되고,
 * "자기 자신의 auto 높이 대비 %"를 가리키는 CSS 단위는 없다(내용 길이로 정해지는 높이라 더더욱).
 * active(stackIndex > 0)가 아니면 관찰 자체를 하지 않는다 — 첫 카드는 항상 겹치지 않는다.
 */
function useStackOverlapPx(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [overlapPx, setOverlapPx] = useState(CONTEXT_STICKY_NOTE_STACK_OFFSET_PX);

  useEffect(() => {
    if (!active || typeof ResizeObserver === 'undefined') {
      return;
    }
    const element = ref.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? element.offsetHeight;
      const clamped = Math.min(
        STACK_OVERLAP_MAX_PX,
        Math.max(STACK_OVERLAP_MIN_PX, height * STACK_OVERLAP_RATIO),
      );
      setOverlapPx(clamped);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [active]);

  return { ref, overlapPx };
}

/**
 * Context 하나를 파스텔 포스트잇 카드로 표시한다. 회전각·배경·접힌 종이 띠 색은 contextId로 결정되는
 * 순수 함수라 리렌더돼도 같은 Context는 항상 같은 모양을 유지한다. 편집 UI는 갖지 않는다 — 편집 가능
 * 여부(editable)에 따라 연필·× 버튼만 노출하고, 실제 편집 진입/삭제는 onEdit·onDelete로 위임한다.
 */
export function ContextStickyNote({
  contextId,
  body,
  editable = false,
  onEdit,
  onDelete,
  busy = false,
  stackIndex = 0,
}: ContextStickyNoteProps) {
  const noteIndex = pickNoteIndex(contextId);
  const bg = NOTE_COLORS[noteIndex];
  const rotate = NOTE_ROTATIONS[noteIndex];
  const fold = NOTE_FOLD_COLORS[noteIndex];

  const { ref, overlapPx } = useStackOverlapPx(stackIndex > 0);

  const style: StickyNoteStyle = {
    '--note-rotate': rotate,
    backgroundColor: bg,
    marginTop: stackIndex > 0 ? -overlapPx : 0,
  };

  return (
    <div
      ref={ref}
      className="context-sticky-note relative rounded-sm pb-4 pl-4 pr-4 pt-8"
      style={style}
    >
      <div
        className="absolute inset-x-0 top-0 h-3.5 rounded-t-sm"
        style={{ backgroundColor: fold }}
        aria-hidden="true"
      />

      {editable && (
        <div className="absolute right-2 top-2 flex gap-1">
          <button
            type="button"
            onClick={onEdit}
            disabled={busy}
            aria-label="맥락 수정"
            className="grid h-6 w-6 place-items-center rounded-full bg-white/80 text-xs font-bold text-ink-gray shadow-sm hover:bg-white hover:text-pin-navy disabled:opacity-40"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            aria-label="맥락 삭제"
            className="grid h-6 w-6 place-items-center rounded-full bg-white/80 text-sm font-bold text-ink-gray shadow-sm hover:bg-white hover:text-red-600 disabled:opacity-40"
          >
            ×
          </button>
        </div>
      )}

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-gray">{body}</p>
    </div>
  );
}
