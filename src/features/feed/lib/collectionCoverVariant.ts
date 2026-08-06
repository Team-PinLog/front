import { hashPaletteIndex } from '@/shared/lib/hashPaletteIndex';

// 316: Collection 표지 레이아웃(조판) 배정. 컴포넌트 파일과 분리해 lib/에 두는 것은 이 레포 관례다
// (shelfSpine.ts 상단 주석 — react-refresh/only-export-components).
//
// ⚠️ "화풍 6종"과 헷갈리지 말 것. 둘은 서로 독립이고 곱집합이다.
//   - 화풍(style_id: watercolour/ink_line/…)은 사용자가 Collection 생성 시 고르는 **그림체**이고,
//     그 결과물은 표지 이미지 1장이다(317의 범위).
//   - 아래 조판 변형은 그 이미지를 **어떻게 앉힐지**의 판형이고, 프론트가 collectionId로 결정론
//     배정한다. 사용자 선택이 아니다.

// 시안(북디자인 표지 시안)의 판형을 그대로 옮긴 것이다. 시안에는 암지(어두운 지면 + 흰 프레임
// 이미지 + 대형 고스트 숫자) 한 종이 더 있었지만 뺐다 — 밝은 오픈 책장(314) 위에서 5권 중 1권꼴로
// 검은 책이 섞이면 선반 전체의 톤이 깨진다(사용자 결정, 2026-08-05).
export const COLLECTION_COVER_VARIANTS = [
  'band', // 전면 도판 + 하단 불투명 텍스트 띠
  'insetSquare', // 밝은 지면 + 상단 정사각 도판 인셋
  'ruled', // 전면 도판 + 상단 중앙 제목(위아래 괘선)
  'verticalTitle', // 좌측 세로짜기 제목 + 우측 도판 컬럼
  'arch', // 밝은 지면 + 상단 아치 크롭 도판 + 자간 넓은 중앙 제목
] as const;

export type CollectionCoverVariant = (typeof COLLECTION_COVER_VARIANTS)[number];

/**
 * 해시 접두어. **이걸 빼면 안 된다.**
 *
 * 카드 배경색(getCollectionAccentColor)이 이미 같은 해시로 `hashPaletteIndex(collectionId, 10)`을
 * 쓰고 있다. 여기서 접두어 없이 `hashPaletteIndex(collectionId, 5)`를 쓰면 두 인덱스가 같은 h에서
 * 나오는데, `gcd(10, 5) = 5`라 `h % 5`가 `h % 10`에 완전히 종속된다 — (색 10 × 변형 5) 50조합 중
 * **10조합만** 나타나고, 같은 색 책은 늘 같은 판형이 된다. 접두어를 태우면 두 해시가 서로 다른
 * 입력에서 출발해 독립적으로 흩어진다.
 */
const COVER_VARIANT_HASH_PREFIX = 'cover:';

/**
 * collectionId로 표지 판형을 고른다. 같은 id는 언제나 같은 판형이다 — 페이지를 앞뒤로 넘기거나
 * 새로고침해도 책의 얼굴이 바뀌지 않아야 한다(Math.random() 금지).
 */
export function getCollectionCoverVariant(collectionId: number): CollectionCoverVariant {
  const index = hashPaletteIndex(
    `${COVER_VARIANT_HASH_PREFIX}${collectionId}`,
    COLLECTION_COVER_VARIANTS.length,
  );
  return COLLECTION_COVER_VARIANTS[index];
}

/**
 * 표지에 실제로 찍히는 텍스트 슬롯. **표지가 그릴 수 있는 문자열은 여기가 전부다.**
 *
 * ⚠️ 북디자인의 "저자 / 출판사" 자리에 소유자 정보를 넣지 않는다. Feed 응답에는 소유자 식별자가
 * 아예 없고(08_API_명세 §10.1), 공개 화면 노출도 금지다(docs/privacy-rules.md 금지 1). 그 자리는
 * 저장된 장소 수와 생성일이 대신한다.
 * keywords는 표시 문자열이다 — Keyword `code`가 아니라 응답의 순수 문자열을 그대로 쓴다.
 * keywords: []는 AI 미완료 상태의 정상 응답이므로 슬롯을 비우고 넘어간다(오류 아님).
 */
export interface CollectionCoverSlots {
  title: string;
  category: string | null; // keywords[0]
  subtitle: string | null; // keywords[1]
}

/**
 * 이 폭 미만이면 축약 모드 — 카테고리·부제·날짜를 생략하고 제목 + 저장된 장소 수만 남긴다. 폭
 * 150px이면 카테고리 글자가 약 5.5px(0.46em × 12px)이라 읽히지 않는데, 안 읽히는 글자를 넣느니
 * 제목에 자리를 더 주는 편이 낫다. 행 수 결정의 하한(FEED_ROWS_MIN_CARD_WIDTH_PX = 112)과는 다른
 * 값이다 — 그쪽은 "배치를 포기하는 선", 이쪽은 "정보를 덜어내는 선"이다.
 *
 * 331: 상수를 CollectionBookCard에서 여기로 옮겼다. "Keyword가 표지에 안 보인다"의 원인 후보로
 * 이 임계값이 지목됐는데, 판정에 필요한 것은 컴포넌트가 아니라 **폭 → 슬롯**이라는 이 파일의 규칙
 * 전체이고, 그래야 회귀 테스트가 카드 폭 계산(shelfCabinetLayout)과 이 임계값을 한자리에서 물릴 수
 * 있다. 실제 판정 결과는 collectionCoverVariant.test.ts에 고정돼 있다 — PC 구간(mdlg·xl)의 카드
 * 폭은 162~219px이라 **축약이 걸리지 않으며**, 축약은 뷰포트 폭 약 424px 미만(sm)에서만 일어난다.
 */
export const COVER_COMPACT_WIDTH_PX = 150;

/** 카드 폭이 축약 구간인지. 328 이후 카드 폭 계산이 바뀌어도 판정은 이 한 곳만 본다. */
export function isCompactCoverWidth(widthPx: number): boolean {
  return widthPx < COVER_COMPACT_WIDTH_PX;
}

/**
 * 축약 모드(카드가 좁아 글자가 읽히지 않는 구간)에서는 카테고리·부제를 버리고 제목만 남긴다 —
 * 어느 판형이든 이 규칙은 같아야 해서 컴포넌트가 아니라 여기서 한 번에 결정한다.
 */
export function getCollectionCoverSlots(
  title: string,
  keywords: string[],
  isCompact: boolean,
): CollectionCoverSlots {
  if (isCompact) {
    return { title, category: null, subtitle: null };
  }
  return {
    title,
    category: keywords[0] ?? null,
    subtitle: keywords[1] ?? null,
  };
}

/** 디스패처(CollectionCover)가 받는 값 — 카드가 아는 형태 그대로다. */
export interface CollectionCoverInput {
  /** 판형 배정의 유일한 입력. 표지에 표시되지는 않는다(내부 식별자는 Collection id뿐이라 노출 무방). */
  collectionId: number;
  title: string;
  keywords: string[];
  recordCount: number;
  createdAt: string;
  /** 카드 배경색(getCollectionAccentColor). 도판이 없을 때의 폴백 그라디언트가 이 색에서 나온다. */
  accentColor: string;
  /** 318에서 채워진다 — 316 시점의 호출부는 항상 null을 넘긴다. */
  imageUrl: string | null;
  /** 카드가 좁아 카테고리·부제·날짜를 접는 구간(CollectionBookCard가 카드 폭으로 판정). */
  isCompact: boolean;
}

/**
 * 판형 5종이 공유하는 props — 디스패처가 keywords를 슬롯으로 정리해 넘긴다.
 * collectionId도 빠진다: 판형은 이미 정해져 들어오므로 id를 알 필요가 없고, 알 수 없어야 표지가
 * 식별자를 실수로 그릴 여지도 없다.
 */
export type CollectionCoverProps = Omit<
  CollectionCoverInput,
  'collectionId' | 'title' | 'keywords'
> & {
  slots: CollectionCoverSlots;
};
