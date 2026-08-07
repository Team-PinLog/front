import type { CoverCandidate, CoverJobStatus, CoverRequestState } from '../api/coverGeneration';

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
  /**
   * 326: 화풍 선택이 접수되어 인쇄본 잡을 백그라운드로 넘긴 상태.
   *
   * 화면(모달) 쪽 흐름은 여기서 끝난다 — 인쇄본을 기다리지 않고 닫으므로 더 물을 것이 없다.
   * 'idle'로 되돌리지 않는 이유: 후보 카드를 그대로 둔 채(고른 것을 보여주며) 폴링만 멈춰야
   * 모달이 닫히기 직전 한 프레임 동안 화면이 스켈레톤으로 되돌아가지 않는다.
   */
  | 'accepted'
  /** 화풍 선택 후 인쇄본 생성 중 — final이 terminal이어야 끝. 백그라운드 러너가 쓴다. */
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
 * accepted도 마찬가지로 멈춘다 — 인쇄본은 다른 구독자(백그라운드 러너)가 본다.
 */
export function isCoverPollingSettled(
  state: CoverRequestState | undefined,
  phase: CoverGenerationPhase,
): boolean {
  if (phase === 'idle' || phase === 'accepted') {
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
 * 318: 폴링 상한. 317에는 상한이 없어서, 잡이 끝내 terminal이 되지 않으면 모달을 닫을 때까지
 * 1초마다 요청이 계속 나갔다(사용자가 탭을 켜둔 채 자리를 비우면 몇 시간이 된다).
 *
 * 5분은 "GPU 큐가 밀려 오래 걸릴 수 있다"(front#99)를 넉넉히 감안한 값이다 — 정상 생성은 수십 초다.
 * 상한에 닿아도 **실패로 단정하지 않는다.** 서버 작업은 계속 돌고 있을 수 있고, 우리가 그만 묻는
 * 것뿐이다. 화면에는 "오래 걸리고 있어요"로 안내하고 다시 시도할 길을 준다.
 */
export const COVER_POLL_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * 폴링을 시작한 시점(startedAt)으로부터 상한을 넘겼는가.
 *
 * 시각을 인자로 받는 이유: Date.now()를 안에서 부르면 이 판정을 테스트할 수 없다.
 */
export function isCoverPollingExpired(
  startedAt: number | null,
  now: number,
  timeoutMs: number = COVER_POLL_TIMEOUT_MS,
): boolean {
  if (startedAt === null) {
    return false;
  }
  return now - startedAt >= timeoutMs;
}

/**
 * 326: 저장해도 되는 인쇄본 URL. 저장할 것이 없으면 null이다.
 *
 * **`status: 'done'`이면서 url이 있을 때만 돌려준다.** 서버(core)는 coverImageUrl의 경로 패턴만
 * 검사하고 파일의 실제 존재는 확인하지 않으므로(확인하려면 core가 이미지 서비스에 결합된다),
 * 완성 전 URL을 보내면 깨진 표지가 그대로 저장된다.
 *
 * 백그라운드 저장으로 바뀌면서 이 판정이 더 중요해졌다 — 예전에는 사용자가 완성된 그림을 보고
 * 완료를 눌렀지만, 이제는 아무도 보지 않는 상태에서 프론트 판정만으로 PATCH가 나간다.
 */
export function resolveSavableCoverUrl(final: CoverRequestState['final']): string | null {
  if (final === null || final.status !== 'done') {
    return null;
  }
  return final.url;
}

/**
 * 326: 백그라운드 폴링을 연속 실패로 포기할 시점인가.
 *
 * 화면에 붙어 있던 폴링은 실패해도 사용자가 보고 다시 시도할 수 있었지만, 백그라운드 러너에는
 * 볼 사람도 누를 사람도 없다. 그렇다고 한 번의 실패로 접으면 순간적인 네트워크 끊김에 표지를
 * 잃는다 — 몇 번은 견디고, 그래도 안 되면 조용히 접는다(표지 없는 컬렉션은 정상 상태다).
 *
 * 성공 응답이 오면 TanStack Query가 실패 카운트를 0으로 되돌리므로 "연속" 실패가 된다.
 */
export const COVER_POLL_MAX_CONSECUTIVE_FAILURES = 3;

export function hasCoverPollingGivenUp(
  consecutiveFailureCount: number,
  maxFailures: number = COVER_POLL_MAX_CONSECUTIVE_FAILURES,
): boolean {
  return consecutiveFailureCount >= maxFailures;
}

/**
 * 318: 사용자가 고르지 않을 때 대신 고를 후보 하나를 뽑는다.
 *
 * **왜 무작위인가**: "표지 없는 컬렉션"을 만들지 않기 위해서다. 사용자가 화풍을 안 고르고 나가면
 * 표지가 비는데, 그러면 나중에 표지를 붙이는 별도 UI가 반드시 필요해진다. 어느 화풍이든 그 컬렉션의
 * 제목·키워드로 그린 그림이므로, 고르지 않은 사용자에게는 아무거나 하나가 빈 표지보다 낫다.
 *
 * ⚠️ 표지 **판형** 배정(collectionCoverVariant.ts)의 Math.random 금지와 혼동하지 말 것. 그쪽은 매
 * 렌더 다시 계산하므로 무작위면 책 얼굴이 계속 바뀐다. 이 선택은 **한 번 뽑아 서버에 저장하고 끝**이라
 * 재현될 필요가 없다.
 *
 * 아직 그려지지 않은 후보(url이 없는 것)는 뽑지 않는다 — 저장했다가 깨진 표지가 된다.
 * 뽑을 게 없으면 null이고, 호출부는 더 기다린다.
 */
export function pickRandomReadyCandidate(
  candidates: CoverCandidate[],
  random: () => number = Math.random,
): CoverCandidate | null {
  const ready = candidates.filter(
    (candidate) => candidate.status === 'done' && candidate.url !== null,
  );
  if (ready.length === 0) {
    return null;
  }
  return ready[Math.floor(random() * ready.length)] ?? ready[0];
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
