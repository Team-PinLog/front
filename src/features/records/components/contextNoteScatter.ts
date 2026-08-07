import type { CSSProperties } from 'react';

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
 * 415 — Record 상세(다이어리 콘셉트)용 콜라주 배치
 *
 * 위 scatter는 "격자로 흘려 붙이되 서로 겹치지는 않는" 배치다(컬렉션 펼침 화면이 계속 쓴다).
 * 415 시안의 좌측 열은 그것과 다르다 — 포스트잇이 **아래로 흘러내리며 앞 장의 우하단을 덮는**
 * 한 무리다. 그래서 값을 고치지 않고 별도 표를 둔다. 두 화면의 문법은 "같은 종이·같은 테이프"
 * 수준에서 공유하고, 붙이는 방식만 화면마다 다르다.
 * ------------------------------------------------------------------------- */

/**
 * 손으로 붙인 무리처럼 보이게 하는 배치표.
 *
 * 15번 피드백("배치가 기계적으로 읽힌다")으로 다시 잡았다. 이전 표는 들여쓰기가 0→22→8→28→12로
 * 규칙적인 계단이었고 회전도 ±1.7deg 안쪽이라, 눈이 금세 규칙을 읽어 버렸다. 셋을 바꿨다:
 *
 * 1. **길이를 5→7로 늘렸다.** 5는 흔한 맥락 개수(3·5)와 자주 맞아떨어져 두 열이 같은 리듬을
 *    반복했다. 7은 2~6 어느 것과도 나누어떨어지지 않아 열마다 다른 구간이 걸린다.
 * 2. **들여쓰기를 계단이 아니라 들쭉날쭉하게** 잡았다(0·31·9·38·17·4·26). 한 방향으로 밀리지도,
 *    규칙적으로 오가지도 않는다.
 * 3. **회전 변주 폭을 키우고(±0.6~2.8deg) 부호를 섞었다.** 각도가 작으면 "비뚤게 붙였다"가 아니라
 *    "정렬에 실패했다"로 보인다.
 *
 * overlap(앞 장을 덮는 깊이)도 8~17px로 흩었다. **포스트잇 아래 여백(pb-6 = 24px)보다 확실히
 * 작아야 한다** — 24px에 붙여 놨더니 실렌더에서 앞 장의 `created: …` 줄이 덮였다. 그 날짜는 시안이
 * 명시한 표시 항목이라 가려지면 안 되고, 여백만 겹쳐도 "덮여 있다"는 인상은 충분히 난다.
 */
const CONTEXT_NOTE_COLLAGE = [
  { left: 0, overlap: 0, rotate: '-2.1deg' },
  { left: 22, overlap: 14, rotate: '1.4deg' },
  { left: 6, overlap: 9, rotate: '2.6deg' },
  { left: 27, overlap: 17, rotate: '-1.1deg' },
  { left: 12, overlap: 11, rotate: '-2.8deg' },
  { left: 3, overlap: 16, rotate: '0.7deg' },
  { left: 18, overlap: 8, rotate: '-0.6deg' },
] as const;

/**
 * 시안 규칙: "텍스트 길이에 따라 크기 가변". 길이는 세 단으로만 나눈다 — 글자 수에 정비례시키면
 * 폭이 한 장마다 달라져 무리가 아니라 잡동사니로 읽힌다.
 *
 * 14·18번 피드백: 긴 본문이 236px 안에서 네 줄로 접혔다. **폭을 넓히되 열을 넘기지는 않는다.**
 *
 * 한 번은 long을 384px로 잡아 옆 열까지 진출시켰다(14번의 "옆 열로 가도 좋다"). 실렌더에서
 * 그게 글자를 먹는 것을 확인했다 — 넘어간 부분이 위로는 '맥락 추가' 슬롯의 흰 가림막에,
 * 아래로는 우측 열 포스트잇에 덮여 본문 끝이 잘렸다. 콜라주에서 종이가 겹치는 건 맞지만
 * **읽어야 하는 글자가 가려지는 건 아니다.**
 *
 * 그래서 넘치는 대신 **열 자체를 넓혔다**: 우측 사진 열을 340→300px로 줄이고 맥락 두 열을
 * 1.25 : 1로 갈라(좌 ≈302px, 우 ≈242px) 좌측 열이 long 300px을 통째로 담는다. 결과적으로 이전
 * 상한(236px)보다 64px 넓어졌고 잘림은 없다. 좌우 열 폭이 다른 것 자체도 콜라주에 도움이 된다 —
 * 두 열이 똑같은 폭이면 그리드로 읽힌다.
 */
const CONTEXT_NOTE_WIDTHS = { short: 200, medium: 252, long: 300 } as const;
const CONTEXT_NOTE_SHORT_MAX_LENGTH = 36;
const CONTEXT_NOTE_MEDIUM_MAX_LENGTH = 90;

/** 본문 길이로 고른 포스트잇 폭(px). */
export function contextNoteCollageWidthPx(bodyLength: number) {
  if (bodyLength <= CONTEXT_NOTE_SHORT_MAX_LENGTH) {
    return CONTEXT_NOTE_WIDTHS.short;
  }
  if (bodyLength <= CONTEXT_NOTE_MEDIUM_MAX_LENGTH) {
    return CONTEXT_NOTE_WIDTHS.medium;
  }
  return CONTEXT_NOTE_WIDTHS.long;
}

/**
 * 한 열 안에서 index번째인 포스트잇의 콜라주 배치(폭·들여쓰기·겹침·회전).
 *
 * 폭은 **들여쓰기까지 더해 열 안에 들어가도록** 묶는다(위 CONTEXT_NOTE_WIDTHS 주석 — 넘치면
 * 글자가 옆 카드에 덮인다). 좌측 열이 우측보다 넓어서 같은 long이라도 좌측에서 더 시원하게 앉는다.
 *
 * ⚠️ z-index는 일부러 넣지 않는다. 래퍼가 transform으로 이미 쌓임 맥락을 만들기 때문에
 * 인라인 z-index를 주면 포스트잇 자신의 호버 z-index(index.css `.context-sticky-note:hover`)가
 * 래퍼 안에 갇혀 "호버한 장이 위로 올라오는" 동작이 죽는다. 대신 DOM 순서(뒤가 위)로 겹침을
 * 만들고, 호버·포커스 때만 래퍼에 z 클래스를 얹는다(호출부의 hover:z-20 focus-within:z-20).
 */
export function contextNoteCollageStyle(indexInColumn: number, bodyLength: number): CSSProperties {
  const placement = CONTEXT_NOTE_COLLAGE[indexInColumn % CONTEXT_NOTE_COLLAGE.length];
  return {
    width: contextNoteCollageWidthPx(bodyLength),
    maxWidth: `calc(100% - ${placement.left}px)`,
    marginLeft: placement.left,
    marginTop: indexInColumn === 0 ? 0 : -placement.overlap,
    transform: `rotate(${placement.rotate})`,
  };
}

/* ------------------------------------------------------------------------- *
 * 415 2열 콜라주 — 어느 포스트잇이 어느 열로 가는가
 * ------------------------------------------------------------------------- */

// 우측 열 맨 위 칸은 '새로운 맥락 추가' 슬롯의 고정석이다. 그 슬롯이 이미 먹고 있는 높이를
// 우측 열의 **출발 높이**로 잡아 두면, 첫 장들은 자연히 좌측 열에 쌓이고 좌측이 슬롯 높이를
// 넘어선 뒤부터 우측 열의 슬롯 아래로 이어진다 — 사용자가 그린 계단 모양 그대로다.
const COMPOSER_SLOT_HEIGHT_PX = 124;
// 포스트잇 한 장의 고정 높이(마스킹 테이프 여백 pt-9 + 점선 2줄 + created 줄 + pb-6).
const NOTE_CHROME_HEIGHT_PX = 108;
const NOTE_LINE_HEIGHT_PX = 24;
// font-hand(20px) 한글 한 글자의 대략적인 자폭. 실측이 아니라 배분용 어림이다.
const NOTE_CHAR_WIDTH_PX = 15;

/**
 * 본문 길이로 포스트잇 한 장의 높이를 어림한다.
 *
 * 실측(ResizeObserver)을 쓰지 않는 이유: 열 배분은 **렌더 전에** 정해져야 하는데 실측값은 렌더
 * 후에야 나온다. 측정해서 다시 나누면 첫 프레임의 배치가 눈에 띄게 튄다. 어림값은 순수 함수라
 * 같은 목록이면 항상 같은 배치가 나오고, 조금 어긋나도 콜라주라 문제가 되지 않는다.
 */
function estimateNoteHeightPx(bodyLength: number) {
  const width = contextNoteCollageWidthPx(bodyLength);
  const charsPerLine = Math.max(1, Math.floor(width / NOTE_CHAR_WIDTH_PX));
  const lines = Math.max(1, Math.ceil(bodyLength / charsPerLine));
  return NOTE_CHROME_HEIGHT_PX + lines * NOTE_LINE_HEIGHT_PX;
}

/**
 * 포스트잇 본문 목록을 2열로 나눈다. 매번 **더 짧은 열**에 다음 장을 얹는 그리디 배분이고,
 * 우측 열은 슬롯 높이만큼 이미 차 있는 상태로 시작한다.
 *
 * 목록 순서를 보존한다(각 열 안에서 원래 순서가 유지된다). 순수 함수라 같은 목록이면 항상 같은
 * 배치가 나온다 — 리렌더로 포스트잇이 열을 넘나들며 튀지 않는다.
 *
 * 반환값은 열마다 **원본 인덱스** 배열이다. 호출부는 그 인덱스로 context를 찾고, 배열 안 위치를
 * contextNoteCollageStyle의 indexInColumn으로 넘긴다.
 */
export function splitContextNotesIntoColumns(bodyLengths: number[]): [number[], number[]] {
  const columns: [number[], number[]] = [[], []];
  const heights = [0, COMPOSER_SLOT_HEIGHT_PX];

  bodyLengths.forEach((bodyLength, index) => {
    const target = heights[0] <= heights[1] ? 0 : 1;
    columns[target].push(index);
    heights[target] += estimateNoteHeightPx(bodyLength);
  });

  return columns;
}
