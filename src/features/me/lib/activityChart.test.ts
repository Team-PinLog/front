import { describe, expect, it } from 'vitest';
import {
  formatMonthAxisLabel,
  getAxisLabelInterval,
  getBarLengthPercent,
  getMaxRecordCount,
  getPeakIndex,
} from './activityChart';

describe('getBarLengthPercent', () => {
  it('최고값을 100%로 두는 선형 스케일이다', () => {
    expect(getBarLengthPercent(5, 5)).toBe(100);
    expect(getBarLengthPercent(1, 4)).toBe(25);
  });

  it('0건은 0%다 — 빈 달이 막대로 보이면 안 된다', () => {
    expect(getBarLengthPercent(0, 5)).toBe(0);
  });

  it('아주 작은 값도 최소 길이만큼은 보인다', () => {
    expect(getBarLengthPercent(1, 1000)).toBe(3);
  });

  it('최고값이 0이면(전부 빈 달) 모든 막대가 0%다', () => {
    expect(getBarLengthPercent(0, 0)).toBe(0);
  });
});

describe('getMaxRecordCount', () => {
  it('빈 배열은 0이다', () => {
    expect(getMaxRecordCount([])).toBe(0);
  });

  it('가장 큰 recordCount를 돌려준다', () => {
    expect(getMaxRecordCount([{ recordCount: 2 }, { recordCount: 7 }, { recordCount: 0 }])).toBe(7);
  });
});

describe('getPeakIndex', () => {
  it('최고값 막대 하나의 인덱스만 돌려준다', () => {
    expect(getPeakIndex([{ recordCount: 2 }, { recordCount: 7 }, { recordCount: 3 }])).toBe(1);
  });

  it('동점이면 더 이른 쪽 하나만 고른다', () => {
    expect(getPeakIndex([{ recordCount: 7 }, { recordCount: 7 }])).toBe(0);
  });

  it('전부 0건이면 -1이다(값 라벨을 어디에도 붙이지 않는다)', () => {
    expect(getPeakIndex([{ recordCount: 0 }, { recordCount: 0 }])).toBe(-1);
    expect(getPeakIndex([])).toBe(-1);
  });
});

describe('formatMonthAxisLabel', () => {
  it('1월은 해가 바뀐 지점이라 연도를 함께 적는다', () => {
    expect(formatMonthAxisLabel('2026-01')).toBe('26년 1월');
  });

  it('나머지 달은 월만 적는다(앞의 0을 떼고)', () => {
    expect(formatMonthAxisLabel('2026-03')).toBe('3월');
    expect(formatMonthAxisLabel('2026-11')).toBe('11월');
  });

  it('형식을 벗어난 값은 원문 그대로 둔다', () => {
    expect(formatMonthAxisLabel('2026/03')).toBe('2026/03');
  });
});

describe('getAxisLabelInterval', () => {
  it('12달 이하는 매 칸에 라벨을 찍는다', () => {
    expect(getAxisLabelInterval(1)).toBe(1);
    expect(getAxisLabelInterval(12)).toBe(1);
  });

  it('달 수가 늘면 간격을 벌린다 — 막대는 그대로 다 그린다', () => {
    expect(getAxisLabelInterval(13)).toBe(2);
    expect(getAxisLabelInterval(24)).toBe(2);
    expect(getAxisLabelInterval(36)).toBe(3);
  });
});
