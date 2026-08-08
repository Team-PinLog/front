import type { CSSProperties } from 'react';
import type { StickyNoteMetrics } from '@/shared/ui/ContextStickyNote';

/**
 * Context 포스트잇을 "손으로 붙인" 것처럼 흩어 놓는 오프셋 표.
 *
 * 373(핀 상세 노트 페이지) 사용자 피드백에서 나온 규칙이고, 378에서 컬렉션 펼침 화면도 같은
 * 문법을 쓰게 되면서 두 화면이 공유한다 — 한쪽만 고치면 "같은 포스트잇"이라는 인상이 깨진다.
 * (Context는 Record 소유라 ContextStickyNoteCard와 같은 자리에 둔다. collections가 records의
 * 컴포넌트를 참조하는 기존 방향과 같다.)
 *
 * 목록 순서(index)로 순환해 고르므로 리렌더돼도 배치가 흔들리지 않는다. 세로 오프셋이 열마다
 * 어긋나며 masonry 같은 리듬이 생기고, 회전은 포스트잇 자체 회전(contextId 해시) 위에 한 겹 더
 * 얹혀 각도 편차를 넓힌다.
 *
 * ⚠️ 값을 키우면 호버 들림·마스킹 테이프와 함께 스크롤 컨테이너 밖으로 나가 잘린다. 호출부는
 * 최소 pt-6/px-3/pb-4 수준의 여백을 확보해야 한다.
 */
const CONTEXT_NOTE_SCATTER = [
  { top: 0, left: 0, rotate: '0deg' },
  { top: 22, left: 6, rotate: '-0.9deg' },
  { top: 8, left: -4, rotate: '0.7deg' },
  { top: 30, left: 9, rotate: '-0.5deg' },
  { top: 14, left: 2, rotate: '1deg' },
] as const;

/** 포스트잇끼리 세로로 겹치지 않게 하는 최소 간격(px). 겹치면 아래 장의 테이프·글자가 묻힌다. */
export const CONTEXT_NOTE_SCATTER_BOTTOM_GAP = 20;

/** index번째 포스트잇에 적용할 손붙임 오프셋. 래퍼 div에 그대로 넘긴다. */
export function contextNoteScatterStyle(index: number): CSSProperties {
  const scatter = CONTEXT_NOTE_SCATTER[index % CONTEXT_NOTE_SCATTER.length];
  return {
    marginTop: scatter.top,
    marginLeft: scatter.left,
    marginBottom: CONTEXT_NOTE_SCATTER_BOTTOM_GAP,
    transform: `rotate(${scatter.rotate})`,
  };
}

/* ------------------------------------------------------------------------- *
 * 415 — Record 상세(다이어리 콘셉트)의 맥락 콜라주 배치
 *
 * 위 scatter는 컬렉션 펼침 화면이 계속 쓰는 표다. 415는 규칙이 달라 별도로 짠다 — 두 화면의
 * 문법은 "같은 종이·같은 테이프" 수준에서 공유하고, 붙이는 방식만 화면마다 다르다.
 *
 * ## 확정된 모습 (28번 — 사용자 스크린샷)
 *
 * **2열 그리드 콜라주**다. 카드가 각자의 칸에 앉고 서로 **거의 겹치지 않는다** — 살짝 어긋난
 * 정렬과 미세한 기울임만으로 손으로 붙인 느낌을 낸다. 칸 사이에는 넉넉한 여백을 둔다.
 * 폭은 열 안에서 본문 길이에 따라 달라지고(짧은 카드는 좁다), 높이도 내용을 따른다.
 *
 * 그 전 라운드에서 시도했던 "긴 노트는 두 열을 가로지르는 full-width" 혼합 배치와 "앞 장을 덮는
 * 겹침"은 **되돌렸다**. 확정 스크린샷이 기준이다.
 *
 * ## 슬롯 칸 고정 (28번 추가 지시)
 *
 * '새로운 맥락 추가' 점선 자리는 맥락 개수와 무관하게 **늘 같은 칸**이다 — 2열 그리드의
 * **2행 2열(= 읽는 순서로 네 번째 칸)**. 노트는 그 칸을 비켜 나머지 칸을 순서대로 채운다.
 * 맥락이 0·1·2개여도 그리드는 두 줄을 유지하므로 슬롯의 화면 위치가 바뀌지 않는다.
 *
 * ## 스크롤 금지 (27번 제약)
 *
 * "맥락 섹션에 스크롤이 생기면 안 된다 / 글자를 자르거나 가려서도 안 된다"가 동시에 걸리면 남는
 * 수단은 **밀도**뿐이다. 장수가 늘수록 글자·여백·칸 간격을 단계적으로 조인다(COLLAGE_DENSITIES).
 * 배치기는 들어가는 **가장 느슨한 단계**를 고르므로, 맥락이 두세 장뿐인 흔한 경우는 1단계
 * (가장 큰 글자) 그대로다.
 *
 * 한계도 정직하게 적어 둔다. 1000x760 모달에서 맥락 영역의 실높이는 약 455px이다. 2열이므로
 * 칸 수는 `맥락 수 + 1`(슬롯), 줄 수는 그 절반이고, 가장 조인 5단계에서 한 줄이 약 80~100px이라
 * **짧은 맥락이면 9장(5줄), 두 줄짜리가 섞이면 7장 안팎**까지 스크롤 없이 담긴다. 그보다 많으면
 * 5단계로도 넘치는데, 그때는 **글자를 줄이는 대신 세로 스크롤을 허용한다**(호출부의 overflow-y).
 * 글자를 지우거나 가리는 선택지는 없다.
 * ------------------------------------------------------------------------- */

/**
 * 맥락 영역의 실사용 폭(px). 모달 1000 - 안쪽 여백 112 - 사진 열 300 - 열 간격 40 = 548에서
 * 마지막 안전 여유를 뺀 값이다.
 */
const COLLAGE_AREA_PX = 540;
/** 두 열 사이 간격. */
const COLLAGE_COLUMN_GAP_PX = 24;
/** 한 열의 폭(px). 카드는 이 폭을 넘지 않는다. */
const COLLAGE_COLUMN_PX = (COLLAGE_AREA_PX - COLLAGE_COLUMN_GAP_PX) / 2;
/** 콜라주 상자의 위아래 여백(테이프가 위로 튀어나오는 자리 + 마지막 줄 기울임 여유). */
const COLLAGE_PADDING_Y_PX = 40;
/**
 * 어림과 실제 렌더의 오차를 흡수하는 여유(px). 글꼴 힌팅·줄바꿈 지점 때문에 어림은 늘 몇 px씩
 * 낙관적이다. 실렌더에서 맥락 6~9장이 6~17px씩 넘쳤고, 이 여유를 두자 한 단계 더 조여 들어갔다.
 */
const COLLAGE_FIT_SAFETY_PX = 22;
/**
 * 높이를 아직 재지 못했을 때 쓰는 기본값(px). 1000x760 모달에서 실측한 맥락 영역 높이다.
 * 첫 페인트부터 맞는 단계가 나오게 하려는 값이고, 실측이 들어오면 그 값으로 대체된다.
 */
const DEFAULT_AVAILABLE_HEIGHT_PX = 455;
/**
 * 손글씨체(NanumGeumEunBoHwa)의 한글 평균 자폭 / 글자 크기. 20px에서 14.41px을 실측해 얻었다
 * (헤드리스 크롬 canvas measureText). 폭·줄 수 계산이 전부 이 비율에서 나온다.
 */
const NOTE_CHAR_WIDTH_RATIO = 0.72;
/** 슬롯이 앉는 칸(0-based, 읽는 순서). 2열이므로 3 = 2행 2열이다. */
export const COMPOSER_SLOT_CELL_INDEX = 3;

interface CollageDensity extends StickyNoteMetrics {
  /** 줄 간격(px). */
  rowGapPx: number;
  /** 이 단계에서 카드 폭의 하한(px). `created:` 줄과 테이프가 들어갈 최소 폭이다. */
  minWidthPx: number;
  /** '새로운 맥락 추가' 슬롯의 최소 높이(px). */
  slotMinHeightPx: number;
}

/**
 * 느슨한 것부터 조인 것까지. 아래로 갈수록 글자·여백·줄 간격이 줄어든다.
 *
 * 본문 글자는 15px 아래로 내리지 않는다 — 손글씨체는 획이 얇아 그보다 작으면 읽기 어려워진다.
 * `created:` 줄도 9px가 하한이다. "안 잘리면 됐다"가 아니라 **읽을 수 있어야** 하기 때문이다.
 */
const COLLAGE_DENSITIES: CollageDensity[] = [
  {
    bodyFontPx: 20,
    bodyLineHeightPx: 24,
    metaFontPx: 11,
    padXPx: 20,
    padTopPx: 32,
    padBottomPx: 24,
    dividerGapPx: 12,
    rowGapPx: 22,
    minWidthPx: 180,
    slotMinHeightPx: 104,
  },
  {
    bodyFontPx: 19,
    bodyLineHeightPx: 23,
    metaFontPx: 10.5,
    padXPx: 18,
    padTopPx: 28,
    padBottomPx: 20,
    dividerGapPx: 10,
    rowGapPx: 18,
    minWidthPx: 172,
    slotMinHeightPx: 96,
  },
  {
    bodyFontPx: 18,
    bodyLineHeightPx: 22,
    metaFontPx: 10,
    padXPx: 16,
    padTopPx: 25,
    padBottomPx: 16,
    dividerGapPx: 9,
    rowGapPx: 14,
    minWidthPx: 164,
    slotMinHeightPx: 88,
  },
  {
    bodyFontPx: 16,
    bodyLineHeightPx: 20,
    metaFontPx: 9.5,
    padXPx: 14,
    padTopPx: 20,
    padBottomPx: 13,
    dividerGapPx: 8,
    rowGapPx: 11,
    minWidthPx: 156,
    slotMinHeightPx: 80,
  },
  {
    bodyFontPx: 15,
    bodyLineHeightPx: 19,
    metaFontPx: 9,
    padXPx: 12,
    padTopPx: 19,
    padBottomPx: 11,
    dividerGapPx: 7,
    rowGapPx: 9,
    minWidthPx: 148,
    slotMinHeightPx: 72,
  },
  {
    // 마지막 단계. 여기서도 넘치면 스크롤을 허용한다(글자를 더 줄이지 않는다).
    bodyFontPx: 15,
    bodyLineHeightPx: 17,
    metaFontPx: 9,
    padXPx: 11,
    padTopPx: 19,
    padBottomPx: 7,
    dividerGapPx: 5,
    rowGapPx: 5,
    minWidthPx: 144,
    slotMinHeightPx: 66,
  },
];

/**
 * 칸 어긋남의 배율. 조일수록 어긋남도 함께 줄인다 — 카드가 작아진 만큼 같은 오프셋이 상대적으로
 * 커 보이고, 무엇보다 그 오프셋이 줄마다 높이로 쌓여 스크롤을 부른다.
 */
function offsetScale(density: CollageDensity) {
  return Math.min(1, Math.max(0.15, (density.bodyFontPx - 14) / 6));
}

/**
 * 칸마다 다른 어긋남과 기울임. "각자의 칸에 앉되 자로 잰 듯 정렬되지는 않은" 정도만 준다 —
 * 값이 커지면 다시 겹침이 생기고, 그건 이번에 되돌린 바로 그 문제다.
 *
 * 길이를 6으로 둔 것은 2열 그리드와 나누어떨어지지 않아 열마다 다른 값이 걸리게 하기 위해서다.
 */
const COLLAGE_CELL_OFFSETS = [
  { left: 0, top: 0, rotate: -1.1 },
  { left: 10, top: 8, rotate: 0.9 },
  { left: 4, top: 14, rotate: 1.4 },
  { left: 14, top: 4, rotate: -0.7 },
  { left: 2, top: 10, rotate: 1.1 },
  { left: 8, top: 0, rotate: -1.5 },
] as const;

export interface ContextNoteCell {
  /** 노트 칸이면 원본 contexts 배열의 인덱스, 슬롯 칸이면 null. */
  index: number | null;
  /** 칸 안쪽 래퍼에 그대로 넘기는 인라인 스타일(폭·어긋남·기울임). */
  style: CSSProperties;
}

export interface ContextNoteCollage {
  /** 읽는 순서(좌→우, 위→아래)의 칸 목록. COMPOSER_SLOT_CELL_INDEX 자리가 슬롯이다. */
  cells: ContextNoteCell[];
  /** 이 배치에 쓰인 종이 치수(ContextStickyNote로 그대로 넘긴다). */
  metrics: StickyNoteMetrics;
  slotMinHeightPx: number;
  columnGapPx: number;
  rowGapPx: number;
  /** false면 가장 조인 단계로도 넘쳤다 — 호출부가 스크롤을 허용해야 한다. */
  fits: boolean;
}

/** 손글씨 한 글자의 폭(px). */
function charWidthPx(density: CollageDensity) {
  return density.bodyFontPx * NOTE_CHAR_WIDTH_RATIO;
}

/**
 * 본문 길이로 카드 폭을 정한다. 기준은 **두 줄 안에 앉는 폭**이고, 열 폭이 상한이다.
 *
 * 단(tier)을 미리 정해 두는 대신 길이에서 폭을 역산하면 어느 길이든 두 줄을 목표로 폭이 정해지고,
 * 자연히 "짧은 카드는 좁고 긴 카드는 열을 꽉 채우는" 확정 스크린샷의 리듬이 나온다. 10px 단위로
 * 끊어 폭이 한 장마다 미묘하게 다른 잡동사니가 되지 않게 한다.
 */
function noteWidthPx(bodyLength: number, density: CollageDensity, maxWidthPx: number) {
  const raw = 2 * density.padXPx + Math.ceil(bodyLength / 2) * charWidthPx(density);
  const rounded = Math.round(raw / 10) * 10;
  return Math.max(density.minWidthPx, Math.min(maxWidthPx, rounded));
}

/**
 * 그 폭에서 본문이 차지하는 줄 수.
 *
 * `WORD_WRAP_SLACK`은 어절 단위 줄바꿈(break-keep) 때문에 줄 끝에 늘 남는 자투리다. 글자 폭만으로
 * 계산하면 "딱 맞게" 나오지만 실제로는 단어가 안 들어가 다음 줄로 넘어가므로, 그 몫을 빼지 않으면
 * 어림이 실제보다 낮게 나온다 — 맥락 8장을 실렌더했을 때 194px 넘쳤던 원인이 이것이었다.
 */
const WORD_WRAP_SLACK = 0.86;

function noteLines(bodyLength: number, widthPx: number, density: CollageDensity) {
  const charsPerLine = Math.max(
    1,
    ((widthPx - 2 * density.padXPx) / charWidthPx(density)) * WORD_WRAP_SLACK,
  );
  return Math.max(1, Math.ceil(bodyLength / charsPerLine));
}

/** 카드 한 장의 높이(px). ContextStickyNote가 실제로 그리는 구성 그대로 더한다. */
function noteHeightPx(bodyLength: number, widthPx: number, density: CollageDensity) {
  return (
    density.padTopPx +
    // 본문 위 점선 + 그 아래 간격
    density.dividerGapPx +
    noteLines(bodyLength, widthPx, density) * density.bodyLineHeightPx +
    // 본문 아래 점선 + created 줄
    density.dividerGapPx +
    Math.round(density.dividerGapPx * 0.7) +
    Math.round(density.metaFontPx * 1.4) +
    density.padBottomPx
  );
}

/** 한 밀도 단계에서 칸을 채우고, 전체 높이를 함께 낸다. */
function planCells(bodyLengths: number[], density: CollageDensity) {
  // 슬롯이 네 번째 칸을 잡고 있으므로 칸은 최소 4개다(맥락이 0~2개여도 두 줄을 유지한다).
  const cellCount = Math.max(COMPOSER_SLOT_CELL_INDEX + 1, bodyLengths.length + 1);
  const cells: ContextNoteCell[] = [];
  const heights: number[] = [];
  let nextNote = 0;

  const scale = offsetScale(density);

  for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
    const base = COLLAGE_CELL_OFFSETS[cellIndex % COLLAGE_CELL_OFFSETS.length];
    const offset = {
      left: Math.round(base.left * scale),
      top: Math.round(base.top * scale),
      rotate: base.rotate,
    };
    const isSlot = cellIndex === COMPOSER_SLOT_CELL_INDEX;
    const noteIndex = isSlot ? null : bodyLengths[nextNote] === undefined ? null : nextNote;

    if (noteIndex === null) {
      // 빈 칸도 슬롯만 한 높이를 지킨다. 0으로 두면 맥락이 0~2개일 때 윗줄이 납작해지면서
      // **슬롯이 위로 올라와** "개수와 무관하게 같은 자리"라는 규칙이 눈에 띄게 깨진다.
      cells.push({
        index: null,
        style: isSlot
          ? {
              width: COLLAGE_COLUMN_PX - offset.left,
              marginLeft: offset.left,
              marginTop: offset.top,
              transform: `rotate(${offset.rotate}deg)`,
            }
          : { minHeight: density.slotMinHeightPx },
      });
      heights.push(density.slotMinHeightPx + (isSlot ? offset.top : 0));
      continue;
    }

    const length = bodyLengths[noteIndex];
    const width = noteWidthPx(length, density, COLLAGE_COLUMN_PX - offset.left);
    cells.push({
      index: noteIndex,
      style: {
        width,
        marginLeft: offset.left,
        marginTop: offset.top,
        transform: `rotate(${offset.rotate}deg)`,
      },
    });
    heights.push(noteHeightPx(length, width, density) + offset.top);
    nextNote += 1;
  }

  // 줄 높이는 그 줄에서 가장 높은 칸이 정한다(2열).
  let totalHeight = 0;
  for (let rowStart = 0; rowStart < heights.length; rowStart += 2) {
    totalHeight +=
      Math.max(heights[rowStart], heights[rowStart + 1] ?? 0) +
      (rowStart > 0 ? density.rowGapPx : 0);
  }

  return { cells, totalHeight };
}

/**
 * 맥락 무리 전체 배치. **스크롤 없이 들어가는 가장 느슨한 밀도 단계**를 고른다(27번 제약).
 *
 * `availableHeightPx`는 호출부가 실측해 넘기는 맥락 영역의 높이다. 아직 재기 전이면(첫 페인트·
 * jsdom) 1000x760 모달의 실측값을 기본으로 쓴다 — 흔한 경우에 첫 페인트부터 맞는 단계가 나온다.
 *
 * 순수 함수라 같은 목록·같은 높이면 항상 같은 배치가 나온다 — 리렌더로 카드가 자리를 옮기며
 * 튀지 않는다.
 */
export function planContextNoteCollage(
  bodyLengths: number[],
  availableHeightPx?: number | null,
): ContextNoteCollage {
  const usableHeight =
    (availableHeightPx && availableHeightPx > 0 ? availableHeightPx : DEFAULT_AVAILABLE_HEIGHT_PX) -
    COLLAGE_PADDING_Y_PX -
    COLLAGE_FIT_SAFETY_PX;

  for (const density of COLLAGE_DENSITIES) {
    const { cells, totalHeight } = planCells(bodyLengths, density);
    if (totalHeight <= usableHeight) {
      return {
        cells,
        metrics: density,
        slotMinHeightPx: density.slotMinHeightPx,
        columnGapPx: COLLAGE_COLUMN_GAP_PX,
        rowGapPx: density.rowGapPx,
        fits: true,
      };
    }
  }

  // 가장 조인 단계로도 넘치면 그 단계로 그리고 스크롤을 허용한다. 글자를 줄이거나 가리지 않는다.
  const densest = COLLAGE_DENSITIES[COLLAGE_DENSITIES.length - 1];
  return {
    cells: planCells(bodyLengths, densest).cells,
    metrics: densest,
    slotMinHeightPx: densest.slotMinHeightPx,
    columnGapPx: COLLAGE_COLUMN_GAP_PX,
    rowGapPx: densest.rowGapPx,
    fits: false,
  };
}
