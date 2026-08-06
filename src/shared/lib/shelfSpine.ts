// 책등 팔레트·치수 계산. Shelf.tsx 컴포넌트들이 사용한다.
// react-refresh/only-export-components 때문에 컴포넌트 파일과 분리했다.
import { hashPaletteIndex } from './hashPaletteIndex';

// 287-12/295(요구사항 C): 이전 팔레트는 브랜드 4색의 hue만 써서 만든 6색(#2E6EB8/#82A3C9/#257E70/
// #6BC7B8/#846C62/#C6AB9F)을 pastelizeHex(명도↑·채도↑)로 한 번 거친 값이었다. 짙은 남색 캐비닛
// 위에서는 그 옅은 톤이 맞았다.
// 319: 캐비닛이 아이보리로 바뀌면서 옅은 3색(#82A3C9/#6BC7B8/#C6AB9F를 파스텔화한 값)이 밝은 칸
// 배경(shelf-cell #F5F7F5)에 묻혀 개별 책이 식별되지 않았다. 시안의 어스톤 팔레트로 교체한다 —
// 세이지·올리브·슬레이트블루·연청회색·테라코타·앰버 6색이다.
// ⚠️ 두 가지가 함께 바뀐다.
//  (1) pastelizeHex를 더 이상 거치지 않는다. 아래 값은 시안에서 그대로 뽑은 "최종 렌더링 색"이라,
//      명도를 흰색 쪽으로 35% 더 끌어올리면(PASTEL_LIGHTNESS_TOWARD_WHITE) 시안보다 옅어져 방금
//      고친 "밝은 배경에 묻히는" 문제로 되돌아간다. PASTEL_MAX_LIGHTNESS(85)는 건드리지 않았다 —
//      pastelizeHex의 나머지 소비자(Feed 표지 그라디언트 coverParts.tsx)는 316/317에서 막 확정된
//      톤이라 여기 사정으로 같이 흔들 이유가 없다.
//  (2) 브랜드 4색의 hue만 쓴다는 295의 제약에서 벗어난다. 올리브(H80~95°)·테라코타(H20°)·
//      앰버(H40°)는 brand-resource에 없는 색이다. shelf-wood*/cover-gold(tailwind.config.js)와
//      같은 성격의 예외로 본다 — 출처가 브랜드 가이드가 아니라 확정 시안이고, 소비처가 책장 가구
//      한 곳으로 한정된다.
//  (3) 각 색은 아래 getSpineTextColor가 고르는 글자색과 4.5:1 이상이 나오도록 명도를 맞춰 뽑았다.
//      361 이후로는 그 기준이 "네이비 잉크 하나로 4.5:1"이라 더 단순하다 — 모든 책등이 상대 휘도
//      0.2428 이상이면 된다. 아래 옛 사각지대 설명은 두 잉크를 오가던 시절의 기록이다.
//      두 잉크 어느 쪽으로도 4.5:1이 안 나오는 "사각지대"가 실제로 존재하고, 시안에서 눈으로 뽑은
//      테라코타 원본값(#C0673A, 휘도 0.212)이 정확히 그 구간에 있었다 — 사각지대 밖으로 나오도록
//      한 단계 어둡게 조정한 값이 아래 #B25932다(슬레이트 블루도 같은 이유로 #5E7C9E → #55749B).
//      361에서 밝은 잉크가 순백에서 paper-white로 내려가면서 사각지대가 상대 휘도 0.169~0.243으로
//      조금 넓어졌다. 두 색은 여전히 그 밖(0.168)이지만 여유가 크지 않다(각각 4.51:1·4.52:1) —
//      **팔레트를 이 두 색에서 조금이라도 밝게 옮기면 곧바로 사각지대에 들어간다.** 그 조건은
//      shelfSpine.test.ts가 지킨다.
// 361(사용자 결정): 글자색을 pin-navy 하나로 통일하기 위해 **어두운 3색을 밝은 쪽으로 옮겼다.**
// 네이비 잉크로 4.5:1을 만족하려면 책등의 상대 휘도가 0.2428 이상이어야 하는데(계산 근거는 아래
// getSpineTextColor 주석) 슬레이트 블루·다크 올리브·테라코타가 미달이었다. 색상(hue)과 채도는
// 그대로 두고 명도만 기준선 바로 위로 올려, 시안의 어스톤 성격을 유지한 최소 조정이다.
// 나머지 3색(연한 청회색·세이지·앰버)은 이미 통과라 손대지 않았다.
export const SPINE_COLORS = [
  '#7290B4', // 슬레이트 블루 (361: #55749B에서 명도만 상향, hue 213° 유지)
  '#A9BCC7', // 연한 청회색
  '#8A9A78', // 세이지
  '#799070', // 다크 올리브 (361: #4E5D46에서 상향. 세이지보다 여전히 어둡고 hue도 다르다)
  '#C9764C', // 테라코타 (361: #B25932에서 상향, hue 18→20°)
  '#E0AA4E', // 앰버
];

// 319: 시안 팔레트는 명도 폭이 넓다 — 다크 올리브(#4E5D46) 위 밝은 글자는 6.6:1로 잘 읽히지만, 같은
// 밝은 글자를 앰버(#E0AA4E)에 얹으면 2:1로 사실상 안 읽힌다. 책등 위 글자는 장식이 아니라 컬렉션
// 제목이므로 색을 하나로 고정하지 않고, 책등 색과의 대비가 더 큰 쪽을 두 잉크 중에서 고른다.
// 임계 휘도를 상수로 박지 않고 두 후보의 대비를 실제로 계산해 비교하는 이유는, 그 임계값이
// 네이비의 휘도에서 유도되는 값(≈0.214)이라 브랜드 색이 바뀌면 조용히 틀려지기 때문이다.
// 361(디자인 피드백 "책등 글씨가 책마다 색이 달라 통일감이 없다" → 사용자 결정): **잉크를 pin-navy
// 하나로 통일한다.** 색이 갈리는 것 자체가 통일감을 깨는 원인이었고, 두 잉크를 브랜드 색으로
// 바꾸는 정도로는(순백 → paper-white) 어두운 책등에서 여전히 "흰 글씨"로 읽혔다 — paper-white는
// 상대 휘도 0.935라 순백과 육안 구별이 안 된다.
//
// 잉크를 하나로 고정하는 대신 **팔레트를 그에 맞췄다**(위 SPINE_COLORS). 네이비로 4.5:1을
// 만족하려면 책등 휘도가 0.2428 이상이어야 해서, 미달이던 3색의 명도를 기준선 바로 위로 올렸다.
//
// ⚠️ 그래도 두 후보를 비교하는 전환 규칙(getSpineTextColor)은 지운다:
//     아래 함수를 보면 알 수 있듯 **현 팔레트에서는 항상 네이비가 이긴다.** 규칙을 남겨두는 것은
//     "나중에 어두운 책등 색이 하나 추가돼도 글자가 읽히지 않는 사고는 나지 않는다"는 안전장치이고,
//     그 상태(팔레트 전체가 네이비로 수렴)는 shelfSpine.test.ts가 고정한다. 색을 하나 더할 때
//     테스트가 먼저 깨지므로, 규칙이 조용히 다른 잉크를 고르기 시작하는 일은 없다.
//
// ⚠️ 두 값은 tailwind.config.js의 paper-white·pin-navy와 **같이 움직여야 한다.** 이 파일은 Tailwind
// 설정을 읽을 수 없어 hex를 옮겨 적는다(shelfCabinetLayout.ts 상단 주석과 같은 이유).
// SPINE_TEXT_LIGHT는 현재 어떤 책등에서도 선택되지 않는다 — 위 안전장치의 다른 쪽 후보로만 남는다.
export const SPINE_TEXT_LIGHT = '#FAF7F6'; // paper-white
export const SPINE_TEXT_DARK = '#042142'; // pin-navy

// WCAG 2.x relative luminance. sRGB 각 채널을 선형화한 뒤 시감 가중치로 합산한다.
function getRelativeLuminance(hex: string): number {
  const channels = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((pair) => {
    const value = parseInt(pair, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

// WCAG 2.x contrast ratio. 두 색의 순서와 무관하게 같은 값을 낸다.
export function getContrastRatio(foregroundHex: string, backgroundHex: string): number {
  const a = getRelativeLuminance(foregroundHex);
  const b = getRelativeLuminance(backgroundHex);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function getSpineTextColor(collectionId: number): string {
  const spineColor = getSpineColor(collectionId);
  return getContrastRatio(SPINE_TEXT_LIGHT, spineColor) >=
    getContrastRatio(SPINE_TEXT_DARK, spineColor)
    ? SPINE_TEXT_LIGHT
    : SPINE_TEXT_DARK;
}

// 251: 250에서 "2행이 스크롤 없이 들어가도록" 112~168 → 72~104로 줄였더니 캐비닛이 목업 대비
// 밋밋하고 작아 보인다는 진단이 나와, 169 원본 값(112~168)으로 되돌렸다.
// 319 디자인 피드백: 112~168 → 145~190. 하한을 올린 이유는 책등 제목이 세로쓰기라 "책 길이 = 제목이
// 들어갈 자리"이기 때문이다 — 하한 112에서 글자가 쓸 수 있는 세로는 112-24(pt-3+pb-2)=88px이라
// 10px 글자가 여덟 자쯤에서 잘렸다. 145면 121px로 열한 자까지 들어간다.
// 상한을 190에서 멈춘 이유는 행 수와 맞물리기 때문이다. 행 높이는 이 상한으로 잡히는데(아래
// SPINE_MAX_HEIGHT 주석), 210으로 두면 1280×900(흔한 노트북 뷰포트, scale 1)에서 행이 2행까지
// 떨어진다 — 190이면 같은 화면에서 3행이 유지되면서도 책은 여전히 이전(112~168)보다 확실히 크다.
const SPINE_MIN_HEIGHT = 145;
// 287-4: 행(ShelfRow)의 최소 높이로 이 값을 준다(Shelf.tsx ShelfRow) — getSpineHeight가 이 값을
// 상한으로 clamp하므로, 행을 이보다 낮게 잡으면 가장 큰 책이 행 경계를 넘어 위로 삐져나온다.
// export해서 Shelf.tsx와 shelfCabinetLayout.ts(행 수 역산)가 재사용한다.
// 319: 고정 height → 최소 높이로 바뀌었다. 행 수는 정수라 예산을 딱 나눠 떨어지게 채우는 일이 거의
// 없는데(양자화), 행 높이가 고정이면 그 나머지가 전부 칸 맨 아래 빈 여백으로 남는다. 이제 행이
// 남는 높이를 나눠 갖고 책은 items-end로 선반 판에 붙어 있으므로, 나머지는 "빈 바닥"이 아니라
// "선반 칸의 머리 공간"이 된다.
export const SPINE_MAX_HEIGHT = 190;
const SPINE_BASE_WIDTH = 40;

// 287-13: 한 행당 책 권수를 캐비닛 컬럼의 실제 폭에서 역산했다. 데스크톱 레퍼런스 뷰포트
// (scale=1, ≥1280px, PAGE_CONTAINER_CLASS lg:px-8)에서:
//   페이지 컨텐츠 폭 1152(max-w-6xl) - 좌우 padding 64(px-8×2) = 1088
//   캐비닛 테두리(border-[10px]×2) 20 → 1068
//   캐비닛 본문 padding(p-2.5×2) 20 → 1048(ShelfColumnGrid 폭)
//   그리드 gap-x-5(20px)×2개 40 → 1008, 3칸 등분 1008/3 = 336(칸 트랙 폭)
//   칸 자체 padding(ShelfColumn p-2.5×2) 20 → 316
//   스크롤 박스 padding(SHELF_SCROLL_SIDE_PADDING_PX×2) 24 → 292px(실제 책이 놓일 수 있는 폭)
// 319: 위 숫자가 바뀐 이유는 캐비닛이 아이보리 톤으로 재설계되면서 상자 모델이 함께 바뀌었기
// 때문이다 — 테두리 8→10px, 본문 px-5→p-2.5, 그리고 열 구분이 "첫 열만 padding 0, 2·3열만 21px"
// 에서 "모든 열이 동일한 p-2.5"로 바뀌었다(Shelf.tsx ShelfColumn 주석). 예산은 가장 좁은 열 기준
// 285.7 → 292px으로 오히려 늘었고 열 간 차이도 사라졌으므로, 아래 SHELF_ROW_SIZE(4)는 그대로
// 유효하다. 319 2차에서 기울기 최대치가 절반(4→2deg)으로 줄면서 최댓값인 5권 경우도 처음으로
// 예산 안에 들어왔다 — 아래 여유 검증 참고.
// 287-15: 기울어진 책의 겹침 방지 여백(getSpineNeighborClearancePx)은 회전이 항상 좌우 대칭으로
// 커지는 성질상 양쪽 이웃 모두에 반영해야 한다(한쪽만 주면 반대쪽 이웃과 겹친다 — 처음엔 이 점을
// 놓쳤다). 여백이 두 배로 드니 기준값도 낮춰야 한다: 289.7px OK(287-14 최초 검증)이던 5권 기준값을
// 4권으로 낮췄다(계산은 아래 getRowCapacity 주석 참고). getSpineWidth가 index%3 주기로 40/46/52px
// (평균 46px)를 반복하므로, 4권 기준으로도 목업 대비 촘촘한 밀도를 유지한다.
export const SHELF_ROW_SIZE = 4;

// 287-14: "행마다 최대 수용 권수 자체가 다르게" — 모든 행이 SHELF_ROW_SIZE로 고정되면 오히려 너무
// 규칙적으로 보인다. seedId(책장 하나를 식별하는 안정적인 값 — 내 책장은 첫 컬렉션 id 기반, 팔로우한
// 책장은 followId와 열 위치 기반 — MyShelfList.tsx/FollowedShelfCard.tsx 참고)와 rowIndex를 함께
// 해시해 ±1 편차를 고른다. 같은 책장은 새로고침해도 항상 같은 행 구성을 유지하고(seedId가
// 안정적이므로), 책장마다·열마다(seedId가 다르므로) 편차 패턴이 달라 여러 사용자의 책장이, 그리고
// 한 사용자 안에서도 1·2·3열이 획일적으로 보이지 않는다.
// 여유 검증(3~5권, 데스크톱 레퍼런스 기준 폭 예산 292px(319 이전 285.7px), 40/46/52 3주기 반복):
//   287-15: 겹침 방지 여백을 양쪽 이웃 모두에 반영하므로(marginLeft+marginRight 동시 적용), 기울어진
//   책 1권당 최악 소비량은 2×3.30 ≈ 6.6px이다(height=190·width=40·tilt=2deg일 때 최댓값).
//   5권(기준+1) 최악치: widthSum(최악 시작 offset) 236 + gap-px 4 + 5권 전부 기울었을 때 5×6.6=33.0
//   = 273.0px — 292px 예산 안에 들어온다.
//   319 2차: 기울기 최대치가 4deg→2deg로 줄면서(TILT_OPTIONS_DEG) 이 계산이 처음으로 여유를 갖게
//   됐다. 이전에는 5권 최악치가 298.1px로 예산을 6.1px 넘겨 "확률이 극히 낮으니 괜찮다"고 넘어갔고,
//   실제로 그 희귀한 경우엔 그 행만 가로 스크롤이 살짝 생겼다(overflow-y-auto인 스크롤 박스는
//   overflow-x도 자동으로 'auto' 취급된다 — CSS Overflow 스펙, SHELF_SCROLL_SIDE_PADDING_PX 주석
//   참고). 이제는 최악의 경우에도 넘치지 않으므로 그 예외 자체가 사라졌다.
const ROW_CAPACITY_DELTAS = [-1, 0, 1];

// 287-17: 해시가 "충분히 흩어져 보인다"고 해서 연속된 두 행이 절대 같은 값을 안 뽑는다는 보장은
// 아니다 — 후보는 3개뿐이라 순수 해시만으로는 인접한 두 행이 우연히 같은 권수를 뽑을 확률이
// 이론상 1/3이나 된다(실측: seedId 900003 기준 rowIndex 0~3이 전부 3권으로 나온 사례를 실제로
// 확인했다 — 화면에 보이는 행이 3개면 그 3행 전부가 우연히 같아 보일 확률이
// 약 11%(=(1/3)^2)로 낮지 않다). previousCapacity와 같은 후보가 나오면 다음 후보로 결정론적으로
// 한 칸 넘겨(순환) "바로 이전 행과는 반드시 다르다"를 보장한다 — 여전히 seedId·rowIndex만으로
// 정해지는 순수 함수라 새로고침해도 같은 결과를 낸다.
function getRowCapacity(seedId: number, rowIndex: number, previousCapacity: number | null): number {
  const candidateIndex = hashPaletteIndex(seedId + rowIndex * 97, ROW_CAPACITY_DELTAS.length);
  const candidate = SHELF_ROW_SIZE + ROW_CAPACITY_DELTAS[candidateIndex];
  if (candidate !== previousCapacity) {
    return candidate;
  }
  const nextIndex = (candidateIndex + 1) % ROW_CAPACITY_DELTAS.length;
  return SHELF_ROW_SIZE + ROW_CAPACITY_DELTAS[nextIndex];
}

// 287-5: 항상 노출할 행(선반) 수 — 컬렉션이 몇 개든 이 수만큼 ShelfTier(빈 행 포함)를 렌더링한다.
// 319 디자인 피드백: 더 이상 고정 상수가 아니다. 책이 커지면서(SPINE_MAX_HEIGHT 168→190) 3행을
// 고집하면 짧은 뷰포트에서 넘치고, 반대로 큰 화면에서는 캐비닛 아래가 비었다 — 사용자가 "화면
// 비율에 따라 행 수가 달라져도 된다"고 확인해 줬으므로 뷰포트 높이에서 역산한다
// (shelfCabinetLayout.ts getLibraryVisibleRowCount). 이 값은 그 계산을 할 수 없는 곳(캐비닛 높이를
// 직접 정하지 않는 /shelf 단독 화면)에서 쓰는 기본값으로만 남는다.
export const SHELF_DEFAULT_VISIBLE_ROW_COUNT = 3;

// 295 추가 수정(이슈 3): MyShelfColumn(내 책장)과 FollowedShelfCollections(팔로우한 책장)가 각자
// 따로 `Math.max(0, 표시 행 수 - N)`을 계산하고 있었다 — 계산 자체는 같은 공식이었지만
// "N에 무엇을 넣는지"(실제 콘텐츠 행 수)가 서로 다른 기준이었던 게 진짜 원인이었다: 내 책장은 "새
// 컬렉션 추가" 슬롯이 마지막 행에 안 들어가면 무조건 행을 하나 더 만들어(표시 행 수를
// 넘겨서라도) 추가 버튼을 항상 노출시켰고, 팔로우한 책장은 그런 예외가 없어 항상 정확히 3행으로
// 패딩됐다 — 그 결과 "내 책장 컬렉션이 정확히 3행을 꽉 채운 상태"에서만 내 책장이 4개 tier를
// 그리고 팔로우한 책장은 3개만 그려, 같은 높이로 stretch된 두 ShelfColumn 안에서 콘텐츠가 차지하는
// 비율이 달라져 최하단 선반~캐비닛 바닥 여백이 달라 보였다. 이 함수를 두 컴포넌트가 동일하게
// 호출하게 만들어 "행 수 계산 자체는 하나의 함수"라는 사실을 코드로 고정한다 — 호출부가 넘기는
// realRowCount(추가 슬롯이 필요로 하는 행까지 포함한 실제 콘텐츠 행 수)만 서로 다르다.
// 319: visibleRowCount를 인자로 받는다 — 화면 높이에 따라 달라지는 값이라 더 이상 모듈 상수를
// 직접 읽을 수 없다. "행 수 계산은 하나의 함수"라는 295의 원칙은 그대로다.
export function getEmptyTierPadding(realRowCount: number, visibleRowCount: number): number {
  return Math.max(0, visibleRowCount - realRowCount);
}

// 287-2: 스크롤 박스(overflow-y-auto) 내부에 주는 상단 여유 — margin이 아니라 반드시 padding이어야
// 한다. overflow는 자기 자신의 padding-box 경계로 clip하므로, 박스 "바깥"의 gap을 늘려도 안쪽으로
// transform해 올라오는 요소는 그대로 잘린다. 호버 리프트 10px(Shelf.tsx ShelfBookSpine)보다 커야 한다.
export const SHELF_SCROLL_TOP_PADDING_PX = 12;

// 319 디자인 피드백 2차("책장 하단 여백 조금만 늘려줘"): 맨 아래 선반 판이 칸 바닥에 거의 붙어
// 있었다 — 판 아래로 남는 건 ShelfColumn의 p-2.5(10px)뿐이라, 판이 칸 테두리에 얹힌 것처럼 보였다.
// 여유를 20px 더 둬 판이 칸 안에 놓인 것으로 보이게 한다. 겸사겸사 선반 판의 낙하 그림자
// (0 10px 16px → 판 아래로 약 18px)가 overflow 경계에 잘리던 것도 같이 해결된다(Feed가 같은 이유로
// FEED_ROWS_PADDING_BOTTOM_PX를 두고 있다).
// ⚠️ 이 값은 행 수 역산(shelfCabinetLayout.ts getLibraryVisibleRowCount)에서 반드시 차감해야 한다 —
// 스크롤 박스는 border-box라, 빼먹으면 여백만큼 행이 넘쳐 마지막 선반이 잘린다.
export const SHELF_SCROLL_BOTTOM_PADDING_PX = 20;

// 287-3: overflow-y와 overflow-x 중 하나만 'visible'이 아니면 브라우저가 나머지 축도 'auto'로
// 취급한다(CSS Overflow 스펙) — overflow-y-auto만 준 스크롤 박스가 가로 방향도 clip 대상이 된다는
// 뜻이다. 회전한 책등이 이 박스의 좌우 padding-box 경계를 넘으면 그대로 잘린다.
// 287-14: 최대 기울기가 5deg→4deg로 줄고(TILT_OPTIONS_DEG), 책마다 개별 폭(getSpineWidth)이 달라
// "최대 protrusion"도 책마다 다르다 — 가장 보수적인 경우(높이 최대 168, 폭 최소 40)로 계산하면
// (168/2)*sin(4°) - (40/2)*(1-cos(4°)) ≈ 5.86 - 0.05 ≈ 5.8px. 기존 12px 여유가 이미 넉넉히 크다.
export const SHELF_SCROLL_SIDE_PADDING_PX = 12;

// 287-10: 이전엔 index(선반 위 위치)로 색을 골라 두 가지 문제가 있었다 — (1) 같은 컬렉션이라도
// 목록 순서가 바뀌면(새 컬렉션 추가 등) 위치가 밀려 색이 바뀔 수 있었다(리렌더링해도 색이 유지돼야
// 한다는 원칙에 어긋난다). (2) index % 10은 10권마다 정확히 같은 색 순서가 되풀이돼 육안으로 규칙이
// 보였다. collectionId(컬렉션 고유 식별자)를 hashPaletteIndex로 넓게 흩뿌려 고르도록 바꿔 두 문제를
// 모두 해결한다 — 위치와 무관하게 항상 같은 컬렉션이 같은 색을 유지하고, id가 연속이어도 순서상
// 인접한 책들의 색이 규칙적으로 반복되지 않는다.
export function getSpineColor(collectionId: number): string {
  return SPINE_COLORS[hashPaletteIndex(collectionId, SPINE_COLORS.length)];
}

// 319 디자인 피드백("현재 책의 높이가 달라야 한다"): 높이를 정하는 주된 축을 recordCount에서
// collectionId 해시로 뒤집었다.
//
// 이전 공식은 `clamp(96 + recordCount*6 ± 3지터, 112, 168)`이었다. 계산해 보면 recordCount가 0·1·2인
// 컬렉션은 base가 96·102·108이고 지터를 최대(+3)로 받아도 111이라, **전부 하한 112로 clamp된다** —
// 즉 기록이 두 건 이하인 컬렉션은 예외 없이 정확히 같은 높이로 그려졌다. 실제 화면의 컬렉션 대부분이
// 이 구간이라, 지터를 넣어 뒀는데도 책장의 모든 책이 한 치 오차 없이 같은 키로 서 있었다(실제
// 스크린샷에서 3권 모두 동일 높이로 확인). 상한 168에 닿으려면 recordCount가 12는 돼야 했다.
//
// 이제 collectionId 해시가 기본 높이 단계를 고르고(SPINE_HEIGHT_STEP_COUNT단계, 밴드 전체에 고르게
// 분포), recordCount는 그 위에 얹는 보정으로 남는다. 트레이드오프를 분명히 해 두면 — "기록이 많은
// 컬렉션이 더 두껍다"는 신호는 밴드 60px 중 12px로 약해졌다. 그 신호가 실제로는 위 clamp 때문에
// 화면에 거의 드러나지 않았고, 시안이 요구하는 것도 데이터 시각화가 아니라 "책장에 제각각인 책이
// 꽂혀 있는 그림"이라서 이쪽을 택했다. 같은 컬렉션이 항상 같은 높이를 갖는 성질은 그대로다
// (해시·recordCount 모두 순수 함수).
const SPINE_HEIGHT_STEP_COUNT = 6;
const SPINE_RECORD_STEP_PX = 3;
const SPINE_RECORD_MAX_STEPS = 4; // recordCount가 더할 수 있는 최대치 = 12px

// 319: 색·높이·기울기가 전부 hashPaletteIndex(collectionId, N)를 쓰는데, 색 팔레트 길이(6)와 높이
// 단계 수(6)가 같아 두 축의 모듈러 결과가 **완전히 동일**했다 — 세이지색 책은 반드시 158px, 앰버색
// 책은 반드시 178px처럼 색과 키가 1:1로 묶여, 같은 색 책이 예외 없이 같은 키로 서 있는 규칙이
// 눈에 보인다(287-10이 index % 팔레트길이를 버린 것과 같은 종류의 문제다). 축마다 다른 salt를
// 더해 해시 입력 자체를 갈라놓는다 — hashPaletteIndex의 avalanche 해시를 서로 다른 입력으로 타므로
// 세 축이 독립적으로 흩어진다. 같은 collectionId가 항상 같은 결과를 낸다는 성질은 그대로다.
const SPINE_HEIGHT_HASH_SALT = 24_379;
const SPINE_TILT_HASH_SALT = 11_437;

export function getSpineHeight(recordCount: number, collectionId: number): number {
  const recordBonus = Math.min(recordCount, SPINE_RECORD_MAX_STEPS) * SPINE_RECORD_STEP_PX;
  // 해시가 고르는 기본 높이는 recordCount 보정분을 남겨둔 밴드 안에서만 움직인다 — 그래야 둘을
  // 더한 결과가 [MIN, MAX]를 정확히 채우고, clamp가 다시 값들을 한쪽 끝으로 뭉치지 않는다.
  const hashBandPx =
    SPINE_MAX_HEIGHT - SPINE_MIN_HEIGHT - SPINE_RECORD_MAX_STEPS * SPINE_RECORD_STEP_PX;
  const step = hashPaletteIndex(collectionId + SPINE_HEIGHT_HASH_SALT, SPINE_HEIGHT_STEP_COUNT);
  const base = SPINE_MIN_HEIGHT + (hashBandPx * step) / (SPINE_HEIGHT_STEP_COUNT - 1);
  return Math.round(Math.min(SPINE_MAX_HEIGHT, Math.max(SPINE_MIN_HEIGHT, base + recordBonus)));
}

export function getSpineWidth(index: number): number {
  return SPINE_BASE_WIDTH + (index % 3) * 6;
}

// 287-14: "각 행 마지막 자리만 -5deg, 나머지 전부 0deg"는 규칙 자체가 고정이라 오히려 규칙적으로
// 보였다(게다가 행마다 권수가 달라지는 287-13 이후로는 "마지막 자리"라는 개념 자체가 index만으로
// 판단 불가능해졌다 — 행 경계가 더 이상 고정 주기가 아니기 때문). collectionId 해시로 각 책마다
// 독립적으로 기울기를 고른다.
// 319 디자인 피드백 1차("자연스럽게 기울어진 책들도 있어야 한다"): 기움 비율을 40%에서 60%로
// 올리고 각도를 ±2·±3·±4deg로 넓혔다.
// 319 디자인 피드백 2차("기울기가 너무 심해서 어색하다 / 살짝만 / 바르게 서 있는 책도 있어야
// 한다"): 각도를 절반으로(최대 ±4 → ±2deg) 줄이고 0deg 비율을 50%로 되돌린다.
// 1차에서 각도를 키운 게 아니라 **책이 커진 것**이 실제 원인이었다 — 기울기는 회전이라 상단이
// 옆으로 밀려나는 양이 책 높이에 비례한다. 같은 4deg라도 이전 책(최대 168px)에서는 상단 이탈이
// 11.7px이었는데 190px 책에서는 13.3px이고, 책 폭이 40~52px이라 그 이탈량이 폭의 4분의 1을
// 넘어가면 "쓰러지기 직전"으로 보인다. 최대 2deg면 이탈이 6.6px(폭의 13~16%)이라 실제 책장에서
// 보는 정도의 기울기가 된다.
// 0deg를 절반(6/12)으로 둔 이유는 "바르게 서 있는 책"이 반드시 섞이게 하기 위해서다 — 한 칸에
// 책이 세 권일 때 최소 한 권이 반듯할 확률이 87.5%다(1차의 40%로는 65%였다).
const TILT_OPTIONS_DEG = [0, 0, 0, 0, 0, 0, -1, 1, -1.5, 1.5, -2, 2];

export function getSpineTilt(collectionId: number): number {
  return TILT_OPTIONS_DEG[
    hashPaletteIndex(collectionId + SPINE_TILT_HASH_SALT, TILT_OPTIONS_DEG.length)
  ];
}

// 287-7/287-14: 회전축이 기본값(중앙, 50% 50%)이라 rotate(tiltDeg)를 적용하면 스파인의 회전된
// 바운딩 박스가 원래 경계보다 커진다 — 한 축(예: 세로)의 증가분은 (그 축 길이/2)*sin(|tilt|) -
// (다른 축 길이/2)*(1-cos(|tilt|))다(회전 방향과 무관하게 항상 양수). 두 용도(바닥 침범 보정,
// 옆 책과의 겹침 방지)가 축만 바꾼 같은 공식이라 하나의 함수로 공유한다.
function rotatedExtraExtent(alongAxisPx: number, acrossAxisPx: number, tiltDeg: number): number {
  if (tiltDeg === 0) {
    return 0;
  }
  const rad = (Math.abs(tiltDeg) * Math.PI) / 180;
  return (alongAxisPx / 2) * Math.sin(rad) - (acrossAxisPx / 2) * (1 - Math.cos(rad));
}

// 287-7: 회전 후 스파인 하단이 원래 바닥선(선반 보드 상단)보다 아래로 내려가는 만큼 — 폭이 그
// 침범 방향(세로축)을 결정한다. ShelfBookSpine이 이 값만큼 translateY(-lift)로 미리 들어올려 회전
// 후에도 하단이 정확히 선반 보드 상단에 맞닿게 보정한다.
export function getSpineTiltLiftPx(width: number, height: number, tiltDeg: number): number {
  return rotatedExtraExtent(width, height, tiltDeg);
}

// 287-14: 기울기가 collectionId마다 달라지면서(TILT_OPTIONS_DEG) 이제 어느 책이든 기울 수 있고,
// 기운 방향(양수=시계방향→오른쪽 이웃 침범, 음수=반시계방향→왼쪽 이웃 침범)과 각도도 책마다 다르다
// — 고정 TILT_NEIGHBOR_CLEARANCE_PX 하나 대신, 각 책의 실제 높이·기울기로 필요한 여백만 정확히
// 계산한다(높이가 침범 방향인 가로축을 결정하므로 위 lift 공식과 축만 바꿔 재사용).
export function getSpineNeighborClearancePx(
  width: number,
  height: number,
  tiltDeg: number,
): number {
  return rotatedExtraExtent(height, width, tiltDeg);
}

export interface ShelfRowChunk<T> {
  items: T[];
  startIndex: number;
  capacity: number;
}

// 250(→287-13/287-14에서 일반화): 스파인 배열을 행 단위로 끊어 "행 + 선반" 타이어(ShelfTier)로
// 렌더링할 수 있게 한다. 이전엔 SHELF_ROW_SIZE 고정 폭으로만 잘랐지만, 이제 행마다 권수가 달라
// (getRowCapacity) 각 행이 실제로 몇 번째 아이템부터 시작하는지(startIndex)를 함께 반환해야 한다
// — 호출부(MyShelfList/FollowedShelfCard)가 "rowIndex * 고정값 + indexInRow"로 전역 index를
// 재계산할 수 없기 때문이다. seedId는 이 책장 하나를 식별하는 안정적인 값(getRowCapacity 참고).
export function chunkIntoShelfRows<T>(items: T[], seedId: number): ShelfRowChunk<T>[] {
  const rows: ShelfRowChunk<T>[] = [];
  let index = 0;
  let rowIndex = 0;
  let previousCapacity: number | null = null;
  while (index < items.length) {
    const capacity = getRowCapacity(seedId, rowIndex, previousCapacity);
    rows.push({ items: items.slice(index, index + capacity), startIndex: index, capacity });
    index += capacity;
    rowIndex += 1;
    previousCapacity = capacity;
  }
  return rows;
}
