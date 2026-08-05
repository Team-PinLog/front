import type { CoverJobStatus, CoverRequestState } from '../api/coverGeneration';

/**
 * 317: 표지 생성 폴링의 단계와 종료 판정. 컴포넌트 파일과 분리해 lib/에 두는 것은 이 레포
 * 관례다(shelfSpine.ts 상단 주석 — react-refresh/only-export-components).
 *
 * ⚠️ **이 흐름의 가장 큰 함정: 폴링 종료 조건이 단계마다 다르다.**
 *
 * 화풍 선택 전에는 후보 6장이 모두 terminal이면 최상위 `status`가 `done`이 된다. 그런데 사용자가
 * 화풍을 고르면 **새 인쇄본 잡이 생겨 다시 `running`으로 돌아가고**, 그때는 `final.status`가
 * terminal이 되어야 끝난다(front#99 마지막 각주).
 *
 * 그래서 "status === 'done'이면 폴링 중단"이라는 단일 조건을 쓰면 두 가지가 동시에 깨진다.
 *  - 선택 직후: 서버에 새 잡이 등록되기 전 한 박자 동안 이전 `done`이 그대로 오는데, 그걸 보고
 *    폴링을 멈추면 인쇄본이 완성돼도 화면이 영영 갱신되지 않는다.
 *  - 그래서 이 모듈은 **단계(phase)를 함께 받아** 판정한다.
 */
export type CoverGenerationPhase =
  /** 아직 시작 전(컬렉션 생성 전이거나 표지 요청 전). */
  | 'idle'
  /** 후보 6종 생성 중 — 최상위 status가 terminal이면 끝. */
  | 'generating'
  /** 화풍 선택 후 인쇄본 생성 중 — final이 terminal이어야 끝. */
  | 'finalizing';

const TERMINAL_JOB_STATUSES: readonly CoverJobStatus[] = ['done', 'failed'];

export function isTerminalJobStatus(status: CoverJobStatus): boolean {
  return TERMINAL_JOB_STATUSES.includes(status);
}

/**
 * 이 단계에서 더 이상 폴링할 필요가 없는가.
 *
 * state가 아직 없으면(첫 응답 전) 당연히 계속 폴링한다. idle이면 애초에 폴링을 걸지 않지만,
 * 호출부가 상태를 잘못 넘겨도 무한 폴링이 되지 않도록 여기서도 멈춘 것으로 본다.
 */
export function isCoverPollingSettled(
  state: CoverRequestState | undefined,
  phase: CoverGenerationPhase,
): boolean {
  if (phase === 'idle') {
    return true;
  }
  if (!state) {
    return false;
  }
  if (phase === 'finalizing') {
    // final이 아직 null이면 인쇄본 잡이 등록되기 전이다 — 최상위 status가 done이어도 계속 본다.
    return state.final !== null && isTerminalJobStatus(state.final.status);
  }
  return isTerminalJobStatus(state.status);
}

/**
 * 후보 카드에 실제로 그릴 목록.
 *
 * 폴링 응답이 오기 전에는 생성 응답이 준 6종(전부 queued)을 그대로 쓰고, 폴링 응답이 오면 그쪽으로
 * 교체한다 — 6장을 다 기다리지 않고 done된 카드부터 보여주기 위한 것이다(front#99 UX 권장사항).
 * 서버가 준 순서를 그대로 유지한다(재정렬 금지 — conventions.md 6장).
 */
export function resolveCoverCandidates(
  initial: CoverRequestState['candidates'],
  polled: CoverRequestState | undefined,
): CoverRequestState['candidates'] {
  return polled?.candidates.length ? polled.candidates : initial;
}
