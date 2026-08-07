import { describe, expect, it } from 'vitest';
import {
  getContrastRatio,
  getSpineFontSizePx,
  getSpineColor,
  getSpineHeight,
  getSpineTextColor,
  getSpineTilt,
  isLatinDominantTitle,
  SPINE_COLORS,
  SPINE_FONT_SIZE_LATIN_PX,
  SPINE_FONT_SIZE_PX,
  SPINE_MAX_HEIGHT,
  SPINE_TEXT_DARK,
  SPINE_TEXT_LIGHT,
} from './shelfSpine';

// 실제 collectionId처럼 연속 정수와 띄엄띄엄한 값을 섞은 표본.
const SAMPLE_IDS = Array.from({ length: 40 }, (_, index) => index + 1).concat([
  104, 233, 512, 777, 1024, 4242,
]);

// WCAG 2.x AA 본문 텍스트 기준. 책등 제목은 10px bold라 "큰 텍스트"(18.66px bold 이상) 완화 기준을
// 쓸 수 없어 4.5:1을 그대로 적용한다.
const WCAG_AA_NORMAL_TEXT = 4.5;

// tailwind.config.js의 shelf-cell(칸 안쪽 면). 이 파일은 Tailwind 설정을 읽을 수 없어 옮겨 적는다.
const SHELF_CELL_BACKGROUND = '#F5F7F5';

/** 색으로 직접 묻는 헬퍼 — getSpineTextColor는 collectionId로 진입하므로 팔레트 순회에는 이쪽을 쓴다. */
function getSpineTextColorFor(spineColor: string): string {
  return getContrastRatio(SPINE_TEXT_LIGHT, spineColor) >=
    getContrastRatio(SPINE_TEXT_DARK, spineColor)
    ? SPINE_TEXT_LIGHT
    : SPINE_TEXT_DARK;
}

describe('getContrastRatio', () => {
  it('흰색과 검정의 대비는 21:1이다', () => {
    expect(getContrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
  });

  it('같은 색끼리의 대비는 1:1이다', () => {
    expect(getContrastRatio('#B25932', '#B25932')).toBeCloseTo(1, 5);
  });

  it('인자 순서를 바꿔도 같은 값을 낸다', () => {
    expect(getContrastRatio('#E0AA4E', SPINE_TEXT_DARK)).toBeCloseTo(
      getContrastRatio(SPINE_TEXT_DARK, '#E0AA4E'),
      5,
    );
  });
});

describe('책등 팔레트 가독성', () => {
  // 319: 이 테스트가 팔레트를 손댈 때의 안전장치다. 흰 글자와 네이비 글자 어느 쪽으로도 4.5:1이
  // 나오지 않는 상대 휘도 "사각지대"(≈0.183~0.249)가 실제로 존재하고, 시안에서 눈으로 뽑은 테라코타
  // 원본값(#C0673A)이 정확히 그 구간에 있었다 — 그래서 팔레트를 바꾸면 색을 고르는 로직이 아니라
  // 색 자체가 조용히 읽히지 않게 된다.
  it.each(SPINE_COLORS)('책등 %s는 선택된 글자색과 4.5:1 이상 대비를 갖는다', (spineColor) => {
    const best = Math.max(
      getContrastRatio(SPINE_TEXT_LIGHT, spineColor),
      getContrastRatio(SPINE_TEXT_DARK, spineColor),
    );
    expect(best).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
  });

  // 361: 두 잉크는 브랜드 토큰(paper-white·pin-navy)이어야 한다. 순백·순흑으로 되돌아가는 것을
  // 막는 것이 이 테스트의 목적이다 — 순백은 이 앱이 쓰지 않는 색이라, 네이비 글자 책과 나란히
  // 놓이면 두 잉크가 한 벌로 읽히지 않는다(이 티켓이 고친 바로 그 증상이다).
  it('두 잉크는 브랜드 토큰 값이고 순백·순흑이 아니다', () => {
    expect(SPINE_TEXT_LIGHT).toBe('#FAF7F6'); // tailwind.config.js paper-white
    expect(SPINE_TEXT_DARK).toBe('#042142'); // tailwind.config.js pin-navy
  });

  // 361: 잉크를 네이비 하나로 통일하면서 팔레트의 어두운 3색을 기준선 바로 위로 올렸다. 여유가
  // 가장 적은 색이 슬레이트 블루·다크 올리브(4.6~4.9:1)라, 이 테스트가 "아직 여유가 남았는지"를
  // 눈에 보이게 남겨 둔다 — 팔레트를 조금이라도 어둡게 옮기면 여기서 먼저 걸린다.
  it('가장 빠듯한 책등도 AA 기준을 넘는다', () => {
    const margins = SPINE_COLORS.map(
      (spineColor) =>
        Math.max(
          getContrastRatio(SPINE_TEXT_LIGHT, spineColor),
          getContrastRatio(SPINE_TEXT_DARK, spineColor),
        ) - WCAG_AA_NORMAL_TEXT,
    );
    expect(Math.min(...margins)).toBeGreaterThan(0);
  });

  // 361(사용자 결정): 이 테스트의 의미가 뒤집혔다. 이전에는 "두 잉크가 모두 쓰이는지"를 봤는데,
  // 그 갈림 자체가 통일감을 깨는 원인이라는 피드백으로 잉크를 pin-navy 하나로 통일했다. 이제는
  // 반대로 **팔레트 전체가 네이비 하나로 수렴하는지**를 고정한다 — 책등 색을 더하거나 어둡게
  // 옮기면 여기서 먼저 걸린다.
  it('팔레트 전체가 네이비 잉크 하나로 통일된다', () => {
    const chosen = new Set(SPINE_COLORS.map((spineColor) => getSpineTextColorFor(spineColor)));
    expect(chosen).toEqual(new Set([SPINE_TEXT_DARK]));
  });

  // 319가 지키려던 성질이 팔레트를 밝히면서 깨지지 않았는지 함께 본다 — 책등이 밝은 칸 배경
  // (shelf-cell)에 묻히면 개별 책이 식별되지 않는다. WCAG 기준이 아니라 "면과 면이 구분되는가"의
  // 하한이라, 기존 팔레트에서 가장 낮았던 연한 청회색(1.82:1)을 그대로 바닥으로 삼는다.
  it('밝아진 책등도 칸 배경과 구분된다', () => {
    for (const spineColor of SPINE_COLORS) {
      expect(
        getContrastRatio(spineColor, SHELF_CELL_BACKGROUND),
        spineColor,
      ).toBeGreaterThanOrEqual(1.8);
    }
  });
});

// 365: 책등 글씨가 실제로 곤색(pin-navy)으로 나오는지 — 361의 잉크 통일이 화면까지 도달했는지를
// id 진입 경로에서 확인한다. 팔레트 순회 테스트(위)와 달리 이쪽은 실제 호출 경로다.
describe('책등 글자색은 곤색 하나다', () => {
  it('어떤 collectionId도 pin-navy를 받는다', () => {
    for (const id of SAMPLE_IDS) {
      expect(getSpineTextColor(id), `collectionId ${id}`).toBe(SPINE_TEXT_DARK);
    }
    expect(SPINE_TEXT_DARK).toBe('#042142');
  });
});

// 365: 라틴 글리프는 같은 크기에서 한글보다 작아 보여(x-height가 낮다) 영문 제목만 유독 작았다.
// 제목 단위로 판정해 한 크기를 쓰는 방식이라, 판정 자체가 이 기능의 전부다.
describe('책등 글자 크기', () => {
  it('한글 제목은 기본 크기다', () => {
    for (const title of ['비 오는 날의 카페', '서울 산책', '혼자 가는 곳']) {
      expect(getSpineFontSizePx(title), title).toBe(SPINE_FONT_SIZE_PX);
    }
  });

  it('영문 위주 제목은 한 단계 크다', () => {
    for (const title of ['Seoul Cafe', 'RAINY DAY', '2024 Seoul']) {
      expect(getSpineFontSizePx(title), title).toBe(SPINE_FONT_SIZE_LATIN_PX);
    }
  });

  it('한글이 더 많은 혼용 제목은 한글 크기를 따른다', () => {
    // 한 제목 안에서 크기를 오르내리게 하지 않는다는 결정의 결과다 — 섞이면 다수 쪽을 따른다.
    expect(isLatinDominantTitle('서울의 Cafe 산책')).toBe(false);
    expect(getSpineFontSizePx('서울의 Cafe 산책')).toBe(SPINE_FONT_SIZE_PX);
  });

  it('숫자·기호만 있는 제목은 한글 크기를 따른다(기본값)', () => {
    expect(getSpineFontSizePx('2024 ****')).toBe(SPINE_FONT_SIZE_PX);
  });

  it('영문 크기가 기본보다 크다', () => {
    expect(SPINE_FONT_SIZE_LATIN_PX).toBeGreaterThan(SPINE_FONT_SIZE_PX);
  });
});

describe('getSpineTextColor', () => {
  it('같은 collectionId면 항상 같은 글자색을 낸다', () => {
    expect(getSpineTextColor(4242)).toBe(getSpineTextColor(4242));
  });

  it('그 컬렉션의 책등 색과 4.5:1 이상 대비를 갖는다', () => {
    // collectionId → 책등 색은 해시(hashPaletteIndex)라, 색이 아니라 id로 진입하는 실제 호출
    // 경로에서도 기준이 지켜지는지 함께 본다.
    for (let collectionId = 0; collectionId < 60; collectionId += 1) {
      const ratio = getContrastRatio(getSpineTextColor(collectionId), getSpineColor(collectionId));
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    }
  });
});

// 319 디자인 피드백("현재 책의 높이가 달라야 하고, 자연스럽게 기울어진 책들도 있어야 해").
// 이 세 성질은 눈으로만 확인해 왔는데, 실제로 회귀가 있었다 — 이전 공식 `clamp(96+recordCount*6±3,
// 112, 168)`은 recordCount 2 이하를 전부 하한으로 뭉쳐, 화면의 거의 모든 책이 정확히 같은 키였다.
// 공식 자체는 순수 함수라 테스트로 고정할 수 있다.
describe('책등 다양성', () => {
  it('기록이 없는 컬렉션끼리도 높이가 여러 갈래로 갈린다', () => {
    // recordCount를 0으로 고정해 "해시만으로 얼마나 갈리는지"를 본다 — 이전 공식이라면 여기서
    // 전부 같은 값(하한)이 나온다.
    const heights = new Set(SAMPLE_IDS.map((id) => getSpineHeight(0, id)));
    expect(heights.size).toBeGreaterThanOrEqual(5);
  });

  it('높이는 항상 [SPINE_MIN, SPINE_MAX] 안에 있다', () => {
    // 상한은 행 최소 높이(Shelf.tsx ShelfRow minHeight)와 같은 값이라, 넘으면 책이 행 위로 삐져나온다.
    for (const id of SAMPLE_IDS) {
      for (const recordCount of [0, 1, 5, 20, 999]) {
        const height = getSpineHeight(recordCount, id);
        expect(height).toBeLessThanOrEqual(SPINE_MAX_HEIGHT);
        expect(height).toBeGreaterThanOrEqual(100);
      }
    }
  });

  it('같은 collectionId는 항상 같은 높이·기울기를 낸다(새로고침해도 유지)', () => {
    for (const id of SAMPLE_IDS) {
      expect(getSpineHeight(3, id)).toBe(getSpineHeight(3, id));
      expect(getSpineTilt(id)).toBe(getSpineTilt(id));
    }
  });

  it('기울어진 책이 눈에 띌 만큼 섞여 있다', () => {
    const tilted = SAMPLE_IDS.filter((id) => getSpineTilt(id) !== 0);
    const ratio = tilted.length / SAMPLE_IDS.length;
    expect(ratio).toBeGreaterThan(0.35);
    expect(ratio).toBeLessThan(0.85);
  });

  it('색과 높이가 서로 묶여 있지 않다', () => {
    // 색 팔레트 길이(6)와 높이 단계 수(6)가 같아서, salt 없이 같은 해시를 쓰면 두 모듈러 결과가
    // 완전히 일치했다 — "세이지색 책은 반드시 158px"처럼 색이 곧 키가 되는 규칙이 눈에 보였다.
    // 한 색 안에서 높이가 여러 갈래로 갈리는지로 검증한다.
    const heightsByColor = new Map<string, Set<number>>();
    for (const id of SAMPLE_IDS) {
      const color = getSpineColor(id);
      const bucket = heightsByColor.get(color) ?? new Set<number>();
      bucket.add(getSpineHeight(0, id));
      heightsByColor.set(color, bucket);
    }
    const colorsWithVariedHeights = [...heightsByColor.values()].filter(
      (heights) => heights.size > 1,
    );
    expect(colorsWithVariedHeights.length).toBe(heightsByColor.size);
  });
});
