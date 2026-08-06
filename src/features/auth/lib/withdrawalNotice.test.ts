import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearWithdrawalNotice,
  hasWithdrawalNotice,
  saveWithdrawalNotice,
  WITHDRAWAL_NOTICE_KEY,
  WITHDRAWAL_NOTICE_TTL_MS,
} from './withdrawalNotice';

// 시계를 mock하지 않고 now를 인자로 넘겨 검사한다 — 함수가 시각을 주입받게 만든 이유가 이것이다.
const NOW = 1_700_000_000_000;

describe('saveWithdrawalNotice', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('저장 시각을 sessionStorage에 남긴다', () => {
    saveWithdrawalNotice(NOW);

    expect(sessionStorage.getItem(WITHDRAWAL_NOTICE_KEY)).toBe(String(NOW));
  });

  it('인자를 생략하면 현재 시각을 쓴다', () => {
    const before = Date.now();

    saveWithdrawalNotice();

    const saved = Number(sessionStorage.getItem(WITHDRAWAL_NOTICE_KEY));
    expect(saved).toBeGreaterThanOrEqual(before);
    expect(saved).toBeLessThanOrEqual(Date.now());
  });
});

describe('hasWithdrawalNotice', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('표시가 없으면 false다', () => {
    expect(hasWithdrawalNotice(NOW)).toBe(false);
  });

  it('방금 저장한 표시는 true다', () => {
    saveWithdrawalNotice(NOW);

    expect(hasWithdrawalNotice(NOW)).toBe(true);
  });

  it('경계(TTL과 정확히 같은 경과)까지는 true다', () => {
    saveWithdrawalNotice(NOW);

    expect(hasWithdrawalNotice(NOW + WITHDRAWAL_NOTICE_TTL_MS)).toBe(true);
  });

  // 공급자 화면에서 이탈해 콜백이 오지 않은 경우, 나중에 같은 탭에서 평범히 로그인해도
  // 완료 문구가 뜨면 안 된다. 지울 기회가 없던 표시를 끊는 것이 이 경계의 목적이다.
  it('TTL을 넘긴 표시는 false다', () => {
    saveWithdrawalNotice(NOW);

    expect(hasWithdrawalNotice(NOW + WITHDRAWAL_NOTICE_TTL_MS + 1)).toBe(false);
  });

  it('저장 시각이 미래면(기기 시계가 되돌아간 경우) false다', () => {
    saveWithdrawalNotice(NOW);

    expect(hasWithdrawalNotice(NOW - 1)).toBe(false);
  });

  it('숫자가 아닌 값이 들어 있으면 false다', () => {
    sessionStorage.setItem(WITHDRAWAL_NOTICE_KEY, 'yes');

    expect(hasWithdrawalNotice(NOW)).toBe(false);
  });
});

describe('clearWithdrawalNotice', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('저장된 표시를 제거한다', () => {
    saveWithdrawalNotice(NOW);

    clearWithdrawalNotice();

    expect(hasWithdrawalNotice(NOW)).toBe(false);
  });

  it('저장된 표시가 없어도 에러 없이 동작한다', () => {
    expect(() => clearWithdrawalNotice()).not.toThrow();
  });
});
