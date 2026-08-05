import { describe, expect, it } from 'vitest';
import type { CoverJobStatus, CoverRequestState } from '../api/coverGeneration';
import {
  COVER_POLL_TIMEOUT_MS,
  isCoverPollingExpired,
  isCoverPollingSettled,
  isTerminalJobStatus,
  pickRandomReadyCandidate,
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

describe('isCoverPollingExpired', () => {
  // 318: 317에는 상한이 없어 잡이 끝내 terminal이 되지 않으면 모달을 닫을 때까지 1초마다 요청이
  // 계속 나갔다. 상한은 "실패 판정"이 아니라 "그만 묻기"다.
  const startedAt = 1_000_000;

  it('시작 전(null)이면 만료가 아니다', () => {
    expect(isCoverPollingExpired(null, startedAt + COVER_POLL_TIMEOUT_MS * 10)).toBe(false);
  });

  it('상한 이전에는 만료가 아니다', () => {
    expect(isCoverPollingExpired(startedAt, startedAt + COVER_POLL_TIMEOUT_MS - 1)).toBe(false);
  });

  it('상한에 정확히 닿으면 만료다', () => {
    expect(isCoverPollingExpired(startedAt, startedAt + COVER_POLL_TIMEOUT_MS)).toBe(true);
  });

  it('상한은 인자로 바꿀 수 있다(테스트·향후 조정용)', () => {
    expect(isCoverPollingExpired(startedAt, startedAt + 10, 5)).toBe(true);
    expect(isCoverPollingExpired(startedAt, startedAt + 3, 5)).toBe(false);
  });
});

describe('pickRandomReadyCandidate', () => {
  // 318: "표지 없는 컬렉션"을 남기지 않기 위한 대타 선택이다. 사용자가 고르지 않으면 완성된 것 중
  // 하나가 표지가 된다 — 그래야 나중에 표지를 붙이는 별도 UI가 필요 없다.
  const ready = (styleId: string) => ({
    styleId,
    label: styleId,
    status: 'done' as const,
    url: `/image/files/${styleId}.webp`,
  });

  it('완성된 후보 중에서만 뽑는다', () => {
    const candidates = [
      { styleId: 'a', label: 'a', status: 'running' as const, url: null },
      ready('b'),
      { styleId: 'c', label: 'c', status: 'failed' as const, url: null },
    ];

    expect(pickRandomReadyCandidate(candidates, () => 0)?.styleId).toBe('b');
  });

  it('status는 done인데 url이 없으면 뽑지 않는다', () => {
    // 저장했다가 깨진 표지가 된다 — 서버는 파일 존재를 검증하지 않는다.
    const candidates = [{ styleId: 'a', label: 'a', status: 'done' as const, url: null }];

    expect(pickRandomReadyCandidate(candidates, () => 0)).toBeNull();
  });

  it('완성된 것이 없으면 null이다(호출부는 더 기다린다)', () => {
    expect(pickRandomReadyCandidate([], () => 0)).toBeNull();
  });

  it('난수에 따라 서로 다른 후보를 뽑는다', () => {
    const candidates = [ready('a'), ready('b'), ready('c')];

    expect(pickRandomReadyCandidate(candidates, () => 0)?.styleId).toBe('a');
    expect(pickRandomReadyCandidate(candidates, () => 0.5)?.styleId).toBe('b');
    expect(pickRandomReadyCandidate(candidates, () => 0.99)?.styleId).toBe('c');
  });

  it('난수가 상한(1)에 닿아도 범위를 벗어나지 않는다', () => {
    const candidates = [ready('a'), ready('b')];

    expect(pickRandomReadyCandidate(candidates, () => 1)?.styleId).toBe('a');
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
