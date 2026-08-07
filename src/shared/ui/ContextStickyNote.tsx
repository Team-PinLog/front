import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { formatDate } from '@/shared/lib/formatDate';

interface ContextStickyNoteProps {
  contextId: number;
  body: string;
  editable?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  /** true면 연필·× 버튼을 비활성화한다(수정/삭제 요청 진행 중). */
  busy?: boolean;
  /**
   * ContextDetail.createdAt(ISO 8601). 넘기면 카드 하단에 `created: YYYY-MM-DD` 메타 줄이 붙는다.
   * ⚠️ 레퍼런스의 `edited:` 병기는 **넣지 않는다** — 서버 DTO에 updatedAt·수정 플래그가 없고
   * (08_API_명세 11.2 ContextDetail: contextId·body·createdAt), Context 수정은 교체라 새 contextId와
   * 새 createdAt만 온다. 없는 값을 지어내지 않는다는 규칙에 따라 created만 표시한다.
   */
  createdAt?: string;
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

// 378 사용자 레퍼런스(인덱스 카드 4장): 형광 포스트잇 톤을 버리고 **채도 낮은 종이색**으로 간다.
// 탠·옐로·크림·라벤더 네 가지이고, 카드마다 종이보다 한 단계 진한 동일 계열 잉크색을 짝지어
// 1px 테두리·점선 구분선·메타 글자에 쓴다(레퍼런스의 "얇은 잉크 테두리" 문법).
// ⚠️ 고르는 방식은 그대로 contextId 해시다 — 리스트 순서가 바뀌거나 항목이 추가/삭제돼도 같은
// Context는 항상 같은 색을 유지한다. 색이 Context의 식별 장치라는 성질(332)은 보존된다.
const NOTE_PAPERS = [
  { paper: '#EFE4D2', ink: '#B9A17A' }, // 탠
  { paper: '#F6EDB8', ink: '#C9B65F' }, // 옐로
  { paper: '#F7F3E8', ink: '#CFC5AC' }, // 크림
  { paper: '#E9E5F3', ink: '#B3A9CE' }, // 라벤더
] as const;
// 332 시안: 포스트잇이 "붙어 있다"는 인상을 만들기 위해 기울임을 기존(±0.4~0.8deg)보다 키웠다.
// 각도는 여전히 contextId 해시로 고르는 순수 함수라 같은 Context는 항상 같은 각도를 유지한다.
// ⚠️ 아래 배열들은 모두 NOTE_PAPERS와 길이가 같아야 한다(같은 인덱스로 찾는다).
const NOTE_ROTATIONS = ['-1.6deg', '1.4deg', '-0.8deg', '1.1deg'] as const;
// 373 피드백: attachment='flat'에서는 같은 각도의 절반 이하만 준다 — 각도가 클수록 종이에서
// 들린 것처럼 보인다. 선택 방식(contextId 해시)은 같아서 같은 Context는 여전히 같은 각도다.
const NOTE_FLAT_ROTATIONS = ['-0.7deg', '0.6deg', '-0.35deg', '0.5deg'] as const;
// 호버 시 더해지는 미세 흔들림(±0.5~1도). 노트마다 방향이 갈려야 "흔들"로 읽힌다.
const NOTE_HOVER_NUDGES = ['0.8deg', '-0.9deg', '0.7deg', '-0.6deg'] as const;
// 332 시안: 위쪽 가장자리를 덮던 "접힌 종이 띠"를 폭이 좁고 비스듬한 마스킹 테이프로 바꿨다.
// 테이프는 종이 색과 무관한 반투명 크라프트 톤 하나로 통일한다 — 시안에서 노트 색이 달라도
// 테이프 색은 같고, 색까지 3종으로 나누면 "같은 테이프로 붙였다"는 인상이 깨진다.
const NOTE_TAPE_COLOR = 'rgba(214,196,150,0.62)';
// 테이프 기울기도 노트 각도처럼 contextId로 고정한다(리렌더돼도 같은 Context는 같은 모양).
const NOTE_TAPE_ROTATIONS = ['-8deg', '6deg', '-4deg', '7deg'] as const;

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
  return Math.abs(contextId) % NOTE_PAPERS.length;
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
  createdAt,
  stackIndex = 0,
  attachment = 'lifted',
}: ContextStickyNoteProps) {
  const noteIndex = pickNoteIndex(contextId);
  const isFlat = attachment === 'flat';
  const { paper, ink } = NOTE_PAPERS[noteIndex];
  const rotate = (isFlat ? NOTE_FLAT_ROTATIONS : NOTE_ROTATIONS)[noteIndex];
  const tapeRotate = NOTE_TAPE_ROTATIONS[noteIndex];

  const { ref, overlapPx } = useStackOverlapPx(stackIndex > 0);

  const style: StickyNoteStyle = {
    '--note-rotate': rotate,
    '--note-hover-nudge': NOTE_HOVER_NUDGES[noteIndex],
    backgroundColor: paper,
    // 378 레퍼런스: 종이보다 한 단계 진한 동일 계열 1px 잉크 테두리(인덱스 카드 문법).
    border: `1px solid ${ink}`,
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

      {/* 378 레퍼런스: 대시(- - -) 점선으로 구획을 나눈다. 위 선은 버튼이 놓인 머리말과 본문을,
          아래 선은 본문과 메타 줄을 가른다(레퍼런스의 제목/본문/메타 3단 구성에서 제목 칸에 넣을
          실데이터가 없어 머리말은 비워 둔다 — 알약형 카테고리 칩도 같은 이유로 생략했다). */}
      <div
        aria-hidden="true"
        className="mb-3 h-0 border-t border-dashed"
        style={{ borderColor: ink }}
      />

      {/* font-hand(Nanum Pen Script)는 같은 px에서 Pretendard보다 훨씬 작게 보여 text-xl로 올린다.
          폰트가 도착하기 전에는 Pretendard로 그려지므로 그때만 평소보다 크게 보인다(FOUT 허용). */}
      <p className="whitespace-pre-wrap font-hand text-xl leading-6 text-pin-navy">{body}</p>

      {createdAt && (
        <>
          <div
            aria-hidden="true"
            className="mt-3 h-0 border-t border-dashed"
            style={{ borderColor: ink }}
          />
          {/* 메타는 본문(손글씨)과 대비되도록 작은 고딕이다. 색도 잉크색을 그대로 써서 저채도로 물린다. */}
          <p className="mt-2 font-sans text-[11px] tracking-wide" style={{ color: ink }}>
            created: {formatDate(createdAt)}
          </p>
        </>
      )}
    </div>
  );
}
