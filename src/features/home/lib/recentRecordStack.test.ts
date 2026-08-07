import { describe, expect, it } from 'vitest';
import {
  formatRecentRelativeDay,
  getCycledRecentIndex,
  getRecentStackCardLayout,
  getRecentStackOffset,
  RECENT_STACK_VISIBLE_DEPTH,
} from './recentRecordStack';

describe('getRecentStackCardLayout', () => {
  it('앞장은 기울지 않고 밀리지도 않으며 원래 크기다', () => {
    const front = getRecentStackCardLayout(0);
    expect(front.isFront).toBe(true);
    expect(front.rotateDeg).toBe(0);
    expect(front.translateXPx).toBe(0);
    expect(front.translateYPx).toBe(0);
    expect(front.scale).toBe(1);
  });

  it('뒤로 갈수록 작아지고 z가 낮아진다', () => {
    const layouts = [0, 1, 2, 3].map(getRecentStackCardLayout);
    for (let i = 1; i < layouts.length; i += 1) {
      expect(layouts[i]!.scale).toBeLessThan(layouts[i - 1]!.scale);
      expect(layouts[i]!.zIndex).toBeLessThan(layouts[i - 1]!.zIndex);
    }
  });

  it('뒷장은 각도가 0이 아니어서 가장자리가 드러난다', () => {
    expect(getRecentStackCardLayout(1).rotateDeg).not.toBe(0);
    expect(getRecentStackCardLayout(2).rotateDeg).not.toBe(0);
  });

  it('보이는 깊이를 넘겨도 값이 끊기지 않고 마지막 배치를 유지한다', () => {
    const deep = getRecentStackCardLayout(RECENT_STACK_VISIBLE_DEPTH + 5);
    expect(Number.isFinite(deep.rotateDeg)).toBe(true);
    expect(deep.scale).toBeGreaterThan(0);
  });

  it('음수·소수 offset을 0 이상 정수로 접는다', () => {
    expect(getRecentStackCardLayout(-3).offset).toBe(0);
    expect(getRecentStackCardLayout(1.7).offset).toBe(1);
  });
});

describe('getRecentStackOffset', () => {
  it('활성 카드가 앞장(0)이고 그 다음 항목이 한 장 뒤다', () => {
    expect(getRecentStackOffset(2, 2, 5)).toBe(0);
    expect(getRecentStackOffset(3, 2, 5)).toBe(1);
  });

  it('목록 끝을 넘어가면 처음으로 이어진다', () => {
    expect(getRecentStackOffset(0, 4, 5)).toBe(1);
    expect(getRecentStackOffset(1, 4, 5)).toBe(2);
  });

  it('모든 항목의 offset이 서로 겹치지 않는다', () => {
    const total = 6;
    const offsets = Array.from({ length: total }, (_, index) =>
      getRecentStackOffset(index, 3, total),
    );
    expect(new Set(offsets).size).toBe(total);
  });

  it('빈 목록에서도 계산이 깨지지 않는다', () => {
    expect(getRecentStackOffset(0, 0, 0)).toBe(0);
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
