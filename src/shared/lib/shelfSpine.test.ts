import { describe, expect, it } from 'vitest';
import {
  getContrastRatio,
  getSpineColor,
  getSpineHeight,
  getSpineTextColor,
  getSpineTilt,
  SPINE_COLORS,
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

  it('밝은 책등에는 네이비 글자를, 어두운 책등에는 흰 글자를 고른다', () => {
    // 팔레트 전체를 훑어 두 글자색이 모두 실제로 쓰이는지 확인한다 — 한쪽으로만 쏠리면
    // getSpineTextColor가 사실상 상수와 다를 바 없다는 뜻이다.
    const chosen = new Set(
      SPINE_COLORS.map((spineColor) =>
        getContrastRatio(SPINE_TEXT_LIGHT, spineColor) >=
        getContrastRatio(SPINE_TEXT_DARK, spineColor)
          ? SPINE_TEXT_LIGHT
          : SPINE_TEXT_DARK,
      ),
    );
    expect(chosen).toEqual(new Set([SPINE_TEXT_LIGHT, SPINE_TEXT_DARK]));
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
