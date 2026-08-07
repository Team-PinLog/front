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
  /**
   * 종이에 붙어 있는 정도. 373 사용자 피드백("포스트잇이 너무 떠 보인다")으로 추가한 변형이다.
   * - 'lifted'(기본): 332 컬렉션 펼친 화면의 기존 모양. 큰 그림자 + 호버 시 들어올림.
   * - 'flat': 얇은 접촉 그림자 + 절반으로 줄인 회전각 + 호버는 미세한 흔들림만.
   * 기본값이 'lifted'라 기존 사용처(Collection 상세)의 모양은 그대로다.
   */
  attachment?: 'lifted' | 'flat';
}

// 목업(Team-PinLog/mockup index.html) book-context-postit / openBook.contextNotes 팔레트(contextNoteColors,
// 라인 2984)를 그대로 가져온다. 인덱스는 위치가 아니라 contextId 기반 해시로 고른다 — 리스트 순서가
// 바뀌거나 항목이 추가/삭제돼도 같은 Context는 항상 같은 색·회전각을 유지한다(리렌더 시 값 유지).
const NOTE_COLORS = ['#fff2a6', '#dcecff', '#efedeb'] as const;
// 332 시안: 포스트잇이 "붙어 있다"는 인상을 만들기 위해 기울임을 기존(±0.4~0.8deg)보다 키웠다.
// 각도는 여전히 contextId 해시로 고르는 순수 함수라 같은 Context는 항상 같은 각도를 유지한다.
const NOTE_ROTATIONS = ['-1.6deg', '1.4deg', '-0.8deg'] as const;
// 373 피드백: attachment='flat'에서는 같은 각도의 절반 이하만 준다 — 각도가 클수록 종이에서
// 들린 것처럼 보인다. 선택 방식(contextId 해시)은 같아서 같은 Context는 여전히 같은 각도다.
const NOTE_FLAT_ROTATIONS = ['-0.7deg', '0.6deg', '-0.35deg'] as const;
// 호버 시 더해지는 미세 흔들림(±0.5~1도). 노트마다 방향이 갈려야 "흔들"로 읽힌다.
const NOTE_HOVER_NUDGES = ['0.8deg', '-0.9deg', '0.7deg'] as const;
// 332 시안: 위쪽 가장자리를 덮던 "접힌 종이 띠"를 폭이 좁고 비스듬한 마스킹 테이프로 바꿨다.
// 테이프는 종이 색과 무관한 반투명 크라프트 톤 하나로 통일한다 — 시안에서 노트 색이 달라도
// 테이프 색은 같고, 색까지 3종으로 나누면 "같은 테이프로 붙였다"는 인상이 깨진다.
const NOTE_TAPE_COLOR = 'rgba(214,196,150,0.62)';
// 테이프 기울기도 노트 각도처럼 contextId로 고정한다(리렌더돼도 같은 Context는 같은 모양).
const NOTE_TAPE_ROTATIONS = ['-8deg', '6deg', '-4deg'] as const;

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

type StickyNoteStyle = CSSProperties & {
  '--note-rotate'?: string;
  '--note-hover-nudge'?: string;
};

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
 * Context 하나를 파스텔 포스트잇 카드로 표시한다. 배경색·회전각·테이프 기울기는 contextId로 결정되는
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
  attachment = 'lifted',
}: ContextStickyNoteProps) {
  const noteIndex = pickNoteIndex(contextId);
  const isFlat = attachment === 'flat';
  const bg = NOTE_COLORS[noteIndex];
  const rotate = (isFlat ? NOTE_FLAT_ROTATIONS : NOTE_ROTATIONS)[noteIndex];
  const tapeRotate = NOTE_TAPE_ROTATIONS[noteIndex];

  const { ref, overlapPx } = useStackOverlapPx(stackIndex > 0);

  const style: StickyNoteStyle = {
    '--note-rotate': rotate,
    '--note-hover-nudge': NOTE_HOVER_NUDGES[noteIndex],
    backgroundColor: bg,
    marginTop: stackIndex > 0 ? -overlapPx : 0,
  };

  return (
    <div
      ref={ref}
      className={`context-sticky-note relative rounded-sm px-5 pb-6 pt-9${
        isFlat ? ' context-sticky-note--flat' : ''
      }`}
      style={style}
    >
      {/* 위쪽 가장자리에 걸친 마스킹 테이프. 노트 바깥으로 살짝 튀어나오게 두는 게 "붙였다"는
          인상의 핵심이라 -top-3으로 넘긴다(부모에 overflow-hidden이 없어 잘리지 않는다). */}
      <div
        className="absolute -top-3 left-5 h-6 w-20 rounded-[2px]"
        style={{
          backgroundColor: NOTE_TAPE_COLOR,
          transform: `rotate(${tapeRotate})`,
          // flat에서는 테이프 아래에 얇은 접촉 그림자를 깔아 "테이프가 종이를 누르고 있다"는
          // 인상을 만든다(373 피드백). lifted는 기존 그대로 그림자 없음.
          boxShadow: isFlat ? '0 1px 2px rgba(90,80,30,0.22)' : undefined,
        }}
        aria-hidden="true"
      />

      {/* 오른쪽 아래 접힌 모서리. 배경 위에 겹치는 삼각형 그림자로만 표현해 노트 색과 무관하게 동작한다. */}
      <div
        className="absolute bottom-0 right-0 h-6 w-6 rounded-br-sm"
        style={{
          background: 'linear-gradient(135deg, transparent 50%, rgba(4,33,66,0.10) 50%)',
        }}
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

      {/* font-hand(Nanum Pen Script)는 같은 px에서 Pretendard보다 훨씬 작게 보여 text-xl로 올린다.
          폰트가 도착하기 전에는 Pretendard로 그려지므로 그때만 평소보다 크게 보인다(FOUT 허용). */}
      <p className="whitespace-pre-wrap font-hand text-xl leading-6 text-pin-navy">{body}</p>
    </div>
  );
}
