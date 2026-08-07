import { describe, expect, it } from 'vitest';
import { resolveCoverCancelIntent, type CoverCancelSituation } from './coverCancelIntent';

/**
 * 413(front#130): 표지 선택창의 닫기 요청이 어떻게 처리되는지 고정한다.
 * 핵심은 "어떤 상태에서도 나갈 길이 있다"는 것 — blocked는 선택 요청이 날아가 있는 순간뿐이고,
 * 그 순간은 응답이 오면 모달이 스스로 닫힌다.
 */
const base: CoverCancelSituation = {
  phase: 'generating',
  hasError: false,
  isTimedOut: false,
  isSelecting: false,
};

describe('resolveCoverCancelIntent', () => {
  it('후보를 그리는 중이면 한 번 더 묻는다 — 지금 닫으면 되돌릴 진입점이 없다', () => {
    expect(resolveCoverCancelIntent(base)).toBe('confirm');
  });

  it('아직 아무것도 시작되지 않았으면 그대로 닫는다', () => {
    expect(resolveCoverCancelIntent({ ...base, phase: 'idle' })).toBe('close');
  });

  it('요청이 실패했거나 상한을 넘겼으면 묻지 않고 닫는다 — 고를 그림 자체가 없다', () => {
    expect(resolveCoverCancelIntent({ ...base, hasError: true })).toBe('close');
    expect(resolveCoverCancelIntent({ ...base, isTimedOut: true })).toBe('close');
  });

  it('선택이 접수된 뒤에는 물을 것이 없다 — 인쇄본은 이미 백그라운드로 넘어갔다', () => {
    expect(resolveCoverCancelIntent({ ...base, phase: 'accepted' })).toBe('close');
  });

  it('선택 요청이 날아가 있는 동안에는 닫지 않는다', () => {
    expect(resolveCoverCancelIntent({ ...base, isSelecting: true })).toBe('blocked');
  });

  it('선택 요청 중이면 실패·상한 상태여도 먼저 막는다 — 접수 여부를 모른 채 나가면 안 된다', () => {
    expect(resolveCoverCancelIntent({ ...base, isSelecting: true, isTimedOut: true })).toBe(
      'blocked',
    );
  });
});
