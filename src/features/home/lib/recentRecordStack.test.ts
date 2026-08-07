import { describe, expect, it } from 'vitest';
import {
  formatRecentRelativeDay,
  getCycledRecentIndex,
  getRecentRowLayout,
  getVisibleRecentIndexes,
  RECENT_ROW_COUNT,
} from './recentRecordStack';

describe('getRecentRowLayout', () => {
  it('첫 행이 앞 카드다 — 손글씨 메모를 지연 호출하는 자리', () => {
    expect(getRecentRowLayout(0).isFront).toBe(true);
    expect(getRecentRowLayout(1).isFront).toBe(false);
  });

  it('행마다 가로 오프셋과 기울기가 달라 지그재그로 어긋난다', () => {
    const rows = [0, 1, 2].map(getRecentRowLayout);
    const offsets = rows.map((row) => row.translateXPx);
    const rotations = rows.map((row) => row.rotateDeg);
    // 값이 모두 같으면 정렬된 목록처럼 보여 "손으로 붙였다"는 인상이 사라진다.
    expect(new Set(offsets).size).toBe(3);
    expect(new Set(rotations).size).toBe(3);
  });

  it('기울기 방향이 번갈아 바뀐다', () => {
    expect(getRecentRowLayout(0).rotateDeg).toBeLessThan(0);
    expect(getRecentRowLayout(1).rotateDeg).toBeGreaterThan(0);
  });

  it('위 행이 아래 행 위로 겹친다 — 압정이 아래 카드에 가리지 않게', () => {
    expect(getRecentRowLayout(0).zIndex).toBeGreaterThan(getRecentRowLayout(1).zIndex);
  });

  it('행 수를 넘겨도 값이 끊기지 않는다', () => {
    const deep = getRecentRowLayout(RECENT_ROW_COUNT + 3);
    expect(Number.isFinite(deep.translateXPx)).toBe(true);
    expect(Number.isFinite(deep.rotateDeg)).toBe(true);
  });

  it('음수·소수 행 번호를 0 이상 정수로 접는다', () => {
    expect(getRecentRowLayout(-2).rowIndex).toBe(0);
    expect(getRecentRowLayout(1.8).rowIndex).toBe(1);
  });
});

describe('getVisibleRecentIndexes', () => {
  it('활성 인덱스부터 RECENT_ROW_COUNT개를 순서대로 펼친다', () => {
    expect(getVisibleRecentIndexes(0, 5)).toEqual([0, 1]);
    expect(getVisibleRecentIndexes(2, 5)).toEqual([2, 3]);
  });

  it('끝을 넘어가면 처음으로 이어진다 — 넘김이 끊기지 않는다', () => {
    expect(getVisibleRecentIndexes(4, 5)).toEqual([4, 0]);
  });

  it('보이는 카드 수가 상세 지연 호출 상한과 같다 — 한 화면에서 요청이 이보다 많이 나가지 않는다', () => {
    expect(getVisibleRecentIndexes(0, 50)).toHaveLength(RECENT_ROW_COUNT);
  });

  it('기록이 행 수보다 적으면 있는 만큼만 펼친다 — 빈 종이를 지어내지 않는다', () => {
    expect(getVisibleRecentIndexes(0, 1)).toEqual([0]);
  });

  it('빈 목록이면 아무것도 없다', () => {
    expect(getVisibleRecentIndexes(0, 0)).toEqual([]);
  });
});

describe('getCycledRecentIndex', () => {
  it('마지막에서 다음으로 가면 처음으로 돌아온다', () => {
    expect(getCycledRecentIndex(4, 1, 5)).toBe(0);
  });

  it('처음에서 이전으로 가면 마지막으로 간다', () => {
    expect(getCycledRecentIndex(0, -1, 5)).toBe(4);
  });

  it('한 장뿐이면 어느 방향이든 제자리다', () => {
    expect(getCycledRecentIndex(0, 1, 1)).toBe(0);
    expect(getCycledRecentIndex(0, -1, 1)).toBe(0);
  });

  it('빈 목록이면 0이다', () => {
    expect(getCycledRecentIndex(0, 1, 0)).toBe(0);
  });
});

describe('formatRecentRelativeDay', () => {
  const now = new Date(2026, 7, 7, 9, 0, 0); // 2026-08-07 09:00 로컬

  it('같은 날이면 오늘이다', () => {
    expect(formatRecentRelativeDay(new Date(2026, 7, 7, 1, 0, 0).toISOString(), now)).toBe('오늘');
  });

  it('시간 차이가 아니라 자정 기준으로 센다 — 어제 23시는 어제다', () => {
    expect(formatRecentRelativeDay(new Date(2026, 7, 6, 23, 30, 0).toISOString(), now)).toBe(
      '어제',
    );
  });

  it('이틀 이상은 N일 전이다', () => {
    expect(formatRecentRelativeDay(new Date(2026, 7, 4, 12, 0, 0).toISOString(), now)).toBe(
      '3일 전',
    );
  });

  it('미래 시각은 오늘로 접는다', () => {
    expect(formatRecentRelativeDay(new Date(2026, 7, 9, 12, 0, 0).toISOString(), now)).toBe('오늘');
  });

  it('파싱할 수 없는 값이면 빈 문자열이라 화면이 깨지지 않는다', () => {
    expect(formatRecentRelativeDay('not-a-date', now)).toBe('');
  });
});
