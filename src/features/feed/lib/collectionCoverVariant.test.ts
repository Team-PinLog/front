import { describe, expect, it } from 'vitest';
import { getCollectionAccentColor } from '@/shared/lib/getCollectionAccentColor';
import {
  COLLECTION_COVER_VARIANTS,
  getCollectionCoverSlots,
  getCollectionCoverVariant,
} from './collectionCoverVariant';

// 실제 collectionId는 생성 순서를 따르는 연속 정수다 — 무작위 정수가 아니라 이 분포로 검증해야
// 화면에서 실제로 보이는 결과를 검증하는 것이 된다(hashPaletteIndex 상단 주석과 같은 이유).
const SEQUENTIAL_IDS = Array.from({ length: 600 }, (_, index) => index + 1);

describe('getCollectionCoverVariant', () => {
  it('같은 collectionId는 항상 같은 판형을 준다', () => {
    for (const id of SEQUENTIAL_IDS.slice(0, 50)) {
      const first = getCollectionCoverVariant(id);
      expect(getCollectionCoverVariant(id)).toBe(first);
      expect(getCollectionCoverVariant(id)).toBe(first);
    }
  });

  it('정의된 판형만 반환한다', () => {
    for (const id of SEQUENTIAL_IDS) {
      expect(COLLECTION_COVER_VARIANTS).toContain(getCollectionCoverVariant(id));
    }
  });

  it('5종이 모두 나오고 특정 종에 편중되지 않는다', () => {
    const counts = new Map<string, number>();
    for (const id of SEQUENTIAL_IDS) {
      const variant = getCollectionCoverVariant(id);
      counts.set(variant, (counts.get(variant) ?? 0) + 1);
    }

    expect(counts.size).toBe(COLLECTION_COVER_VARIANTS.length);

    // 균등하면 각 120건. 편중 판정은 ±40%로 느슨하게 둔다 — 해시의 통계적 균등성을 재는 게 아니라
    // "한 판형이 서가를 뒤덮거나 아예 안 보이는" 수준의 쏠림만 걸러내는 것이 목적이다.
    const expected = SEQUENTIAL_IDS.length / COLLECTION_COVER_VARIANTS.length;
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(expected * 0.6);
      expect(count).toBeLessThan(expected * 1.4);
    }
  });

  it('연속한 id가 같은 판형으로 비정상적으로 길게 이어지지 않는다', () => {
    // 상한을 7로 둔 근거: 판형이 id마다 독립적으로 균등 배정되면 n개 중 최장 연속 길이는 대략
    // log₅(n)이고(n=600이면 약 4), 8 이상이 나올 확률은 600 / 5⁷ ≈ 0.008로 사실상 없다. 실측값은
    // 4~5다. 즉 이 테스트가 잡으려는 것은 "우연한 연속"이 아니라 해시가 뭉개져 블록 단위로 같은
    // 판형이 쏟아지는 구조적 고장이다.
    // ⚠️ 연속을 3 이하로 "보장"할 수는 없다 — 그러려면 배정이 목록 내 위치에 의존해야 하는데,
    // 그러면 같은 컬렉션이 페이지를 넘길 때마다 다른 표지가 되어 결정론 요구(위 첫 테스트)와
    // 정면으로 충돌한다. Feed 목록 순서도 id 순이 아니라 서버 추천 순서다.
    let run = 1;
    let longestRun = 1;
    for (let i = 1; i < SEQUENTIAL_IDS.length; i += 1) {
      const isSame =
        getCollectionCoverVariant(SEQUENTIAL_IDS[i]) ===
        getCollectionCoverVariant(SEQUENTIAL_IDS[i - 1]);
      run = isSame ? run + 1 : 1;
      longestRun = Math.max(longestRun, run);
    }
    expect(longestRun).toBeLessThanOrEqual(7);
  });

  it('색 팔레트와 판형이 서로 독립이다(해시 접두어 효과)', () => {
    // ⚠️ 이 티켓의 핵심 함정. 접두어 없이 hashPaletteIndex(collectionId, 5)를 쓰면 색(=%10)과
    // 판형(=%5)이 같은 h에서 나오는데 gcd(10,5)=5라 판형이 색에 완전히 종속된다 — (색,판형) 50조합
    // 중 10조합만 나타나고 "같은 색 책은 늘 같은 판형"이 된다. 접두어를 태운 지금은 두 축이
    // 독립이므로 조합이 50개에 가깝게 관측돼야 한다.
    const pairs = new Set<string>();
    for (const id of SEQUENTIAL_IDS) {
      pairs.add(`${getCollectionAccentColor(id)}|${getCollectionCoverVariant(id)}`);
    }
    expect(pairs.size).toBeGreaterThan(40);
  });
});

describe('getCollectionCoverSlots', () => {
  it('keywords를 카테고리·부제 순으로 배정한다', () => {
    const slots = getCollectionCoverSlots('비 오는 날 카페', ['비 오는 날', '카페', '혼자'], false);
    expect(slots).toEqual({ title: '비 오는 날 카페', category: '비 오는 날', subtitle: '카페' });
  });

  it('keywords가 빈 배열이어도 제목만으로 성립한다', () => {
    // AI 미완료 상태의 정상 응답이다 — 오류로 처리하지 않는다(architecture.md 5장).
    expect(getCollectionCoverSlots('제목만 있는 컬렉션', [], false)).toEqual({
      title: '제목만 있는 컬렉션',
      category: null,
      subtitle: null,
    });
  });

  it('keywords가 1개면 부제를 비운다', () => {
    expect(getCollectionCoverSlots('한 개', ['카페'], false).subtitle).toBeNull();
  });

  it('축약 모드에서는 카테고리·부제를 모두 버린다', () => {
    expect(getCollectionCoverSlots('좁은 카드', ['카페', '혼자', '독서'], true)).toEqual({
      title: '좁은 카드',
      category: null,
      subtitle: null,
    });
  });
});
