import { describe, expect, it } from 'vitest';
import type { CoverJobStatus, CoverRequestState } from '../api/coverGeneration';
import {
  isCoverPollingSettled,
  isTerminalJobStatus,
  resolveCoverCandidates,
} from './coverGenerationPhase';

// 317: 이 흐름에서 가장 깨지기 쉬운 지점은 "폴링을 언제 멈추는가"다. 잘못 멈추면 인쇄본이 완성돼도
// 화면이 영영 갱신되지 않고, 안 멈추면 모달을 닫을 때까지 1초마다 요청이 나간다. 단계별 종료 조건을
// 회귀로 고정한다.

function candidate(status: CoverJobStatus, styleId = 'watercolour'): CoverRequestState['final'] {
  return {
    styleId,
    label: '수채화',
    status,
    url: status === 'done' ? '/image/files/a.webp' : null,
  };
}

function state(overrides: Partial<CoverRequestState>): CoverRequestState {
  return {
    coverRequestId: 'r1',
    status: 'running',
    candidates: [],
    final: null,
    ...overrides,
  };
}

describe('isCoverPollingSettled', () => {
  it('아직 응답이 없으면 계속 폴링한다', () => {
    expect(isCoverPollingSettled(undefined, 'generating')).toBe(false);
    expect(isCoverPollingSettled(undefined, 'finalizing')).toBe(false);
  });

  it('idle이면 응답과 무관하게 멈춘 것으로 본다', () => {
    // 호출부가 단계를 잘못 넘겨도 무한 폴링이 되지 않게 하는 안전판이다.
    expect(isCoverPollingSettled(undefined, 'idle')).toBe(true);
    expect(isCoverPollingSettled(state({ status: 'running' }), 'idle')).toBe(true);
  });

  describe('generating(화풍 선택 전)', () => {
    it('최상위 status가 running이면 계속 폴링한다', () => {
      expect(isCoverPollingSettled(state({ status: 'running' }), 'generating')).toBe(false);
    });

    it('최상위 status가 done이면 멈춘다', () => {
      expect(isCoverPollingSettled(state({ status: 'done' }), 'generating')).toBe(true);
    });

    it('최상위 status가 failed여도 멈춘다', () => {
      expect(isCoverPollingSettled(state({ status: 'failed' }), 'generating')).toBe(true);
    });
  });

  describe('finalizing(화풍 선택 후)', () => {
    it('⚠️ 최상위 status가 done이어도 final이 없으면 계속 폴링한다', () => {
      // 이 티켓의 핵심 함정. 선택 직후 서버에 인쇄본 잡이 등록되기 전 한 박자 동안 이전 done이
      // 그대로 오는데, 그걸 보고 멈추면 인쇄본이 완성돼도 화면이 갱신되지 않는다.
      expect(isCoverPollingSettled(state({ status: 'done', final: null }), 'finalizing')).toBe(
        false,
      );
    });

    it('final이 아직 running이면 계속 폴링한다', () => {
      expect(
        isCoverPollingSettled(
          state({ status: 'running', final: candidate('running') }),
          'finalizing',
        ),
      ).toBe(false);
    });

    it('final이 done이면 멈춘다', () => {
      expect(
        isCoverPollingSettled(state({ status: 'done', final: candidate('done') }), 'finalizing'),
      ).toBe(true);
    });

    it('final이 failed여도 멈춘다', () => {
      // GPU 작업 실패는 종료 상태다 — 계속 폴링해도 바뀌지 않는다. 재시도는 사용자가 다른 화풍을
      // 고르는 것으로 이뤄진다.
      expect(
        isCoverPollingSettled(state({ status: 'done', final: candidate('failed') }), 'finalizing'),
      ).toBe(true);
    });
  });
});

describe('isTerminalJobStatus', () => {
  it('done·failed만 종료 상태다', () => {
    expect(isTerminalJobStatus('done')).toBe(true);
    expect(isTerminalJobStatus('failed')).toBe(true);
    expect(isTerminalJobStatus('queued')).toBe(false);
    expect(isTerminalJobStatus('running')).toBe(false);
  });
});

describe('resolveCoverCandidates', () => {
  const initial = [candidate('queued', 'a'), candidate('queued', 'b')].map((c) => c!);

  it('폴링 응답이 오기 전에는 생성 응답의 후보(전부 queued)를 쓴다', () => {
    expect(resolveCoverCandidates(initial, undefined)).toBe(initial);
  });

  it('폴링 응답이 오면 그쪽으로 교체한다', () => {
    const polled = state({ candidates: [candidate('done', 'a')!] });
    expect(resolveCoverCandidates(initial, polled)).toBe(polled.candidates);
  });

  it('폴링 응답의 후보가 비어 있으면 생성 응답 쪽을 유지한다', () => {
    // 빈 배열로 교체하면 6칸 스켈레톤이 사라져 화면이 순간 비고, 다음 응답에서 다시 생긴다.
    expect(resolveCoverCandidates(initial, state({ candidates: [] }))).toBe(initial);
  });
});
