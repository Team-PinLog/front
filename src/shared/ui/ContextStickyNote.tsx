import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { formatDate } from '@/shared/lib/formatDate';

/**
 * 415-27: 종이 한 장의 **치수**. Record 상세는 맥락이 몇 장이든 스크롤 없이 한 화면에 담아야 해서
 * (사용자 제약), 장수가 늘면 글자와 여백을 단계적으로 조인다. 그 단계값을 바깥(배치기)이 정하고
 * 여기로 넘긴다 — 종이는 "얼마나 조일지"를 모르고 "받은 치수대로 그릴" 뿐이다.
 *
 * attachment='flat'에만 적용된다. 넘기지 않으면 Tailwind 클래스에 박힌 기본 치수(px-5/pt-8/pb-6,
 * text-xl/leading-6, 메타 11px)가 그대로 쓰이고, Collection 상세(lifted)는 늘 그 기본값이다.
 */
export interface StickyNoteMetrics {
  bodyFontPx: number;
  bodyLineHeightPx: number;
  metaFontPx: number;
  padXPx: number;
  padTopPx: number;
  padBottomPx: number;
  /** 본문과 점선, 점선과 `created:` 줄 사이 간격의 기준값. */
  dividerGapPx: number;
}

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
  /** flat 전용 치수(415 — 맥락이 많을수록 조인다). 없으면 기본 치수. */
  metrics?: StickyNoteMetrics;
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
// 373 피드백으로 절반 이하(±0.35~0.7deg)까지 줄였던 값을 415-18("너무 네모네모하다")로 되돌린다.
// 다만 373의 근거("각도가 크면 종이에서 들려 보인다")는 살아 있어 lifted만큼 주지는 않는다 —
// 여기에 콜라주 래퍼의 회전(±0.6~2.8deg)이 더해져 화면에서는 최대 ±3.7deg가 된다.
// 선택 방식(contextId 해시)은 그대로라 같은 Context는 여전히 같은 각도다.
const NOTE_FLAT_ROTATIONS = ['-1.1deg', '0.9deg', '-0.5deg', '0.8deg'] as const;

/* -------------------------------------------------------------------------- *
 * 415-18: "포스트잇이 너무 네모네모하다"
 *
 * 직사각형이라는 인상은 각도가 아니라 **실루엣**에서 온다. 아래 셋으로 실루엣을 깬다.
 * 모두 attachment='flat'(Record 상세) 전용이다 — Collection 상세(lifted)의 모양은 건드리지 않는다.
 * -------------------------------------------------------------------------- */

/**
 * 손으로 자른 종이처럼 네 모서리의 반경이 제각각이다. 값이 크면 스티커가 되어 버리므로 2~9px에
 * 묶는다 — 눈이 "둥글다"로 읽지 못하고 "반듯하지 않다"로만 읽는 폭이다.
 */
const NOTE_FLAT_RADII = [
  '9px 3px 7px 4px / 4px 8px 3px 9px',
  '3px 8px 4px 9px / 8px 3px 9px 4px',
  '7px 4px 9px 3px / 3px 9px 4px 8px',
  '4px 9px 3px 8px / 9px 4px 8px 3px',
] as const;

// 415-24: 오른쪽 아래 접힌 귀퉁이(dog-ear)를 **뺐다**. 실물에서는 "이 표시가 뭐냐"는 물음부터
// 나왔다 — 종이의 물성으로 읽히지 않고 정체 모를 배지로 읽혔다는 뜻이다. 실루엣을 깨는 일은
// 손으로 뜯은 테이프와 제각각인 모서리 반경(NOTE_FLAT_RADII)이 이미 맡고 있다.
// 호버 시 더해지는 미세 흔들림(±0.5~1도). 노트마다 방향이 갈려야 "흔들"로 읽힌다.
const NOTE_HOVER_NUDGES = ['0.8deg', '-0.9deg', '0.7deg', '-0.6deg'] as const;
// 332 시안: 위쪽 가장자리를 덮던 "접힌 종이 띠"를 폭이 좁고 비스듬한 마스킹 테이프로 바꿨다.
// 테이프는 종이 색과 무관한 반투명 크라프트 톤 하나로 통일한다 — 시안에서 노트 색이 달라도
// 테이프 색은 같고, 색까지 3종으로 나누면 "같은 테이프로 붙였다"는 인상이 깨진다.
const NOTE_TAPE_COLOR = 'rgba(214,196,150,0.62)';
// 테이프 기울기도 노트 각도처럼 contextId로 고정한다(리렌더돼도 같은 Context는 같은 모양).
const NOTE_TAPE_ROTATIONS = ['-8deg', '6deg', '-4deg', '7deg'] as const;

/**
 * 415-18: **손으로 뜯은 테이프**. flat 전용이고, 이 화면의 시그니처다.
 *
 * 이전 테이프는 모서리가 칼같은 반투명 사각형이라 "붙였다"가 아니라 "얹었다"로 읽혔다. 좌우 끝을
 * 톱니로 뜯고(clip-path) 위쪽에 얇은 광택 줄을 얹으면 같은 색·같은 자리에서 물성만 바뀐다.
 *
 * 톱니는 노트마다 달라야 한다 — 네 장이 똑같이 뜯겨 있으면 뜯은 게 아니라 찍어낸 것이다.
 * 좌표는 %이고, 위/아래 변은 직선으로 두었다(테이프는 폭 방향으로 뜯기지 길이 방향으로 뜯기지 않는다).
 */
const NOTE_TAPE_TEARS = [
  'polygon(3% 0, 97% 0, 100% 22%, 96% 48%, 100% 74%, 97% 100%, 3% 100%, 0 76%, 4% 50%, 0 24%)',
  'polygon(4% 0, 96% 0, 100% 27%, 95% 52%, 100% 78%, 96% 100%, 4% 100%, 0 73%, 5% 47%, 0 21%)',
  'polygon(2% 0, 98% 0, 100% 18%, 96% 44%, 100% 71%, 98% 100%, 2% 100%, 0 80%, 4% 55%, 0 28%)',
  'polygon(5% 0, 95% 0, 100% 25%, 96% 56%, 100% 80%, 95% 100%, 5% 100%, 0 70%, 5% 44%, 0 19%)',
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
  metrics,
}: ContextStickyNoteProps) {
  const noteIndex = pickNoteIndex(contextId);
  const isFlat = attachment === 'flat';
  // 치수는 flat에만 먹인다. 인라인이라 Tailwind 클래스보다 우선하므로 클래스는 그대로 두고 덮어쓴다.
  const size = isFlat ? metrics : undefined;
  // ✎/× 칩도 같은 단계를 따른다(아래 주석 참고).
  const chipPx = size && size.bodyFontPx <= 16 ? 18 : 24;
  const chipSizeStyle =
    chipPx < 24 ? { width: chipPx, height: chipPx, fontSize: 11, lineHeight: 1 } : undefined;
  const { paper, ink } = NOTE_PAPERS[noteIndex];
  const rotate = (isFlat ? NOTE_FLAT_ROTATIONS : NOTE_ROTATIONS)[noteIndex];
  const tapeRotate = NOTE_TAPE_ROTATIONS[noteIndex];

  const { ref, overlapPx } = useStackOverlapPx(stackIndex > 0);

  // 접힌 귀퉁이를 빼면서 clip-path가 사라졌고(415-24), 그와 함께 안쪽 종이 레이어도 필요 없어졌다.
  // 두 변형 모두 바깥이 곧 종이다.
  const style: StickyNoteStyle = {
    '--note-rotate': rotate,
    '--note-hover-nudge': NOTE_HOVER_NUDGES[noteIndex],
    backgroundColor: paper,
    // 378 레퍼런스: 종이보다 한 단계 진한 동일 계열 1px 잉크 테두리(인덱스 카드 문법).
    border: `1px solid ${ink}`,
    borderRadius: isFlat ? NOTE_FLAT_RADII[noteIndex] : undefined,
    marginTop: stackIndex > 0 ? -overlapPx : 0,
    paddingTop: size?.padTopPx,
    paddingBottom: size?.padBottomPx,
    paddingLeft: size?.padXPx,
    paddingRight: size?.padXPx,
  };

  const noteBody = (
    <>
      {/* font-hand(Nanum Pen Script)는 같은 px에서 Pretendard보다 훨씬 작게 보여 text-xl로 올린다.
          폰트가 도착하기 전에는 Pretendard로 그려지므로 그때만 평소보다 크게 보인다(FOUT 허용). */}
      {/* 415-24: flat만 `break-keep`이다. 한글은 기본 줄바꿈이 글자 단위라 "부드/러워졌다"처럼
          단어 한복판에서 끊긴다 — 어절 단위로 끊으면 같은 폭에서도 훨씬 자연스럽게 읽힌다.
          긴 URL 같은 끊을 곳 없는 토큰이 상자를 넘지 않도록 break-words를 함께 둔다.
          Collection 상세(lifted)는 폭 규칙이 달라 이번 변경 범위 밖이다. */}
      <p
        className={`whitespace-pre-wrap font-hand text-xl leading-6 text-pin-navy${
          isFlat ? ' break-keep break-words' : ''
        }`}
        style={{ fontSize: size?.bodyFontPx, lineHeight: size && `${size.bodyLineHeightPx}px` }}
      >
        {body}
      </p>

      {createdAt && (
        <>
          <div
            aria-hidden="true"
            className="mt-3 h-0 border-t border-dashed"
            style={{ borderColor: ink, marginTop: size?.dividerGapPx }}
          />
          {/* 메타는 본문(손글씨)과 대비되도록 작은 고딕이다. 색도 잉크색을 그대로 써서 저채도로 물린다. */}
          <p
            className="mt-2 font-sans text-[11px] tracking-wide"
            style={{
              color: ink,
              fontSize: size?.metaFontPx,
              marginTop: size && Math.round(size.dividerGapPx * 0.7),
            }}
          >
            created: {formatDate(createdAt)}
          </p>
        </>
      )}
    </>
  );

  return (
    <div
      ref={ref}
      className={`context-sticky-note relative${
        isFlat ? ' context-sticky-note--flat px-5 pb-6 pt-8' : ' rounded-sm px-5 pb-6 pt-9'
      }`}
      style={style}
    >
      {/* 378 레퍼런스: 대시(- - -) 점선으로 머리말 칸과 본문을 가른다. 본문 위아래에 한 줄씩 있는
          것이 이 카드의 판형이다(415-28 확정 스크린샷 — flat에서 뺐던 윗줄을 되돌렸다). */}
      <div
        aria-hidden="true"
        className="mb-3 h-0 border-t border-dashed"
        style={{ borderColor: ink, marginBottom: size?.dividerGapPx }}
      />
      {noteBody}

      {/* 위쪽 가장자리에 걸친 마스킹 테이프. 노트 바깥으로 살짝 튀어나오게 두는 게 "붙였다"는
          인상의 핵심이라 -top-3으로 넘긴다(부모에 overflow-hidden이 없어 잘리지 않는다). */}
      <div
        className={`absolute -top-3 left-5 h-6 w-20${isFlat ? ' z-10' : ' rounded-[2px]'}`}
        style={{
          backgroundColor: NOTE_TAPE_COLOR,
          transform: `rotate(${tapeRotate})`,
          // 415-18: flat 테이프는 좌우 끝을 톱니로 뜯는다. 그림자는 root의 drop-shadow가
          // 이 실루엣을 따라 자동으로 내주므로 여기서 따로 걸지 않는다.
          clipPath: isFlat ? NOTE_TAPE_TEARS[noteIndex] : undefined,
          boxShadow: isFlat ? undefined : '0 1px 2px rgba(90,80,30,0.22)',
        }}
        aria-hidden="true"
      >
        {/* 광택 줄: 테이프 위쪽에 얇게 서는 반사. 폭이 아니라 이 한 줄이 테이프를 필름으로 만든다. */}
        {isFlat && (
          <span aria-hidden="true" className="absolute inset-x-0 top-[3px] h-[3px] bg-white/35" />
        )}
      </div>

      {editable && (
        // 415-28: 한때 flat에서만 호버·포커스일 때 꺼내 보이게 했다가 되돌렸다(확정 스크린샷).
        // 카드 우상단에 늘 떠 있는 흰 원형 칩 두 개가 이 카드의 판형이고, 늘 보이는 편이
        // "여기서 고치고 지운다"를 훨씬 분명하게 알린다.
        // ⚠️ 이 칩들은 종이 위에 떠 있으므로 **머리말 칸 안에 들어와야** 한다. 밀도가 조여진
        //    카드에서 칩이 그대로 24px이면 첫 줄 글자를 덮는다(실렌더에서 확인) — 그래서 조인
        //    단계에서는 칩도 함께 작아지고 모서리에 더 붙는다. 위쪽 여백(padTopPx)은 이 칩 높이를
        //    담도록 잡혀 있다(contextNoteScatter의 COLLAGE_DENSITIES).
        <div
          className="absolute right-2 top-2 z-10 flex gap-0.5"
          style={chipPx < 24 ? { top: 4, right: 4 } : undefined}
        >
          <button
            type="button"
            onClick={onEdit}
            disabled={busy}
            aria-label="맥락 수정"
            className="grid h-6 w-6 place-items-center rounded-full bg-white/80 text-xs font-bold text-ink-gray shadow-sm hover:bg-white hover:text-pin-navy disabled:opacity-40"
            style={chipSizeStyle}
          >
            ✎
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            aria-label="맥락 삭제"
            className="grid h-6 w-6 place-items-center rounded-full bg-white/80 text-sm font-bold text-ink-gray shadow-sm hover:bg-white hover:text-red-600 disabled:opacity-40"
            style={chipSizeStyle}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
