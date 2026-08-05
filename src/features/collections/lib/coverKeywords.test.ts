import { describe, expect, it } from 'vitest';
import { collectCoverKeywords, COVER_KEYWORD_LIMIT } from './coverKeywords';

describe('collectCoverKeywords', () => {
  it('Record 순서대로 모으고 중복은 처음 자리를 유지한다', () => {
    // 서버 응답 순서를 그대로 쓴다(재정렬 금지 — conventions.md 6장).
    const keywords = collectCoverKeywords([
      { keywords: ['카페', '조용한'] },
      { keywords: ['조용한', '독서'] },
    ]);

    expect(keywords).toEqual(['카페', '조용한', '독서']);
  });

  it('상한을 넘으면 자른다', () => {
    const keywords = collectCoverKeywords([{ keywords: ['1', '2', '3', '4', '5', '6', '7'] }]);

    expect(keywords).toHaveLength(COVER_KEYWORD_LIMIT);
    expect(keywords).toEqual(['1', '2', '3', '4', '5']);
  });

  it('keywords가 빈 Record만 있어도 빈 배열을 돌려준다', () => {
    // AI 미완료 상태의 정상 응답이다(architecture.md 5장) — 오류로 처리하지 않는다.
    // 이미지 서비스는 title만으로도 그린다.
    expect(collectCoverKeywords([{ keywords: [] }, { keywords: [] }])).toEqual([]);
  });

  it('Record가 하나도 없어도 빈 배열이다', () => {
    expect(collectCoverKeywords([])).toEqual([]);
  });

  it('공백뿐인 키워드는 버리고 앞뒤 공백은 다듬는다', () => {
    expect(collectCoverKeywords([{ keywords: ['  카페 ', '   ', '카페'] }])).toEqual(['카페']);
  });
});
