import { describe, expect, it } from 'vitest';
import type { CoverJobStatus, CoverRequestState } from '../api/coverGeneration';
import {
  COVER_POLL_MAX_CONSECUTIVE_FAILURES,
  COVER_POLL_TIMEOUT_MS,
  hasCoverPollingGivenUp,
  isCoverPollingExpired,
  isCoverPollingSettled,
  isTerminalJobStatus,
  pickRandomReadyCandidate,
  resolveCoverCandidates,
  resolveSavableCoverUrl,
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

  it('326: accepted면 아직 그리는 중이어도 멈춘다', () => {
    // 화풍 선택이 접수되면 화면 쪽 흐름은 끝난다 — 인쇄본은 백그라운드 러너가 별도로 본다.
    // 여기서 멈추지 않으면 모달이 닫힌 뒤에도 후보 폴링이 러너와 겹쳐 두 배로 나간다.
    expect(isCoverPollingSettled(state({ status: 'running' }), 'accepted')).toBe(true);
    expect(isCoverPollingSettled(undefined, 'accepted')).toBe(true);
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

describe('resolveSavableCoverUrl', () => {
  // 326: 백그라운드 저장으로 바뀌면서 아무도 보지 않는 상태로 PATCH가 나간다 — 무엇을 저장해도
  // 되는지의 판정이 이 함수 하나에 모인다. 서버는 파일 존재를 검증하지 않는다.
  it('done이고 url이 있으면 그 url을 저장한다', () => {
    expect(resolveSavableCoverUrl(candidate('done'))).toBe('/image/files/a.webp');
  });

  it('아직 인쇄본 잡이 없으면(null) 저장할 것이 없다', () => {
    expect(resolveSavableCoverUrl(null)).toBeNull();
  });

  it('그리는 중이면 저장하지 않는다', () => {
    expect(resolveSavableCoverUrl(candidate('running'))).toBeNull();
    expect(resolveSavableCoverUrl(candidate('queued'))).toBeNull();
  });

  it('실패한 인쇄본은 저장하지 않는다', () => {
    expect(resolveSavableCoverUrl(candidate('failed'))).toBeNull();
  });

  it('status는 done인데 url이 없으면 저장하지 않는다', () => {
    // 보내면 깨진 표지가 그대로 남는다 — 서버는 경로 패턴만 본다.
    expect(
      resolveSavableCoverUrl({ styleId: 'a', label: 'a', status: 'done', url: null }),
    ).toBeNull();
  });
});

describe('hasCoverPollingGivenUp', () => {
  // 326: 백그라운드 러너에는 실패를 보고 다시 누를 사람이 없다. 순간적인 끊김은 견디고, 계속
  // 실패하면 상한(5분)까지 1초마다 두드리지 않고 조용히 접는다.
  it('연속 실패가 상한 미만이면 계속 폴링한다', () => {
    expect(hasCoverPollingGivenUp(0)).toBe(false);
    expect(hasCoverPollingGivenUp(COVER_POLL_MAX_CONSECUTIVE_FAILURES - 1)).toBe(false);
  });

  it('연속 실패가 상한에 닿으면 포기한다', () => {
    expect(hasCoverPollingGivenUp(COVER_POLL_MAX_CONSECUTIVE_FAILURES)).toBe(true);
    expect(hasCoverPollingGivenUp(COVER_POLL_MAX_CONSECUTIVE_FAILURES + 1)).toBe(true);
  });

  it('상한은 인자로 바꿀 수 있다', () => {
    expect(hasCoverPollingGivenUp(1, 2)).toBe(false);
    expect(hasCoverPollingGivenUp(2, 2)).toBe(true);
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
