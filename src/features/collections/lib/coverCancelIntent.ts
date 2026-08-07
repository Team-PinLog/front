import type { CoverGenerationPhase } from './coverGenerationPhase';

/**
 * 413(front#130): 표지 화풍 선택창에서 "닫기"를 눌렀을 때 무엇을 할지.
 *
 * - `close`  — 그대로 닫는다. 사용자가 잃을 것이 없는 상태다.
 * - `confirm` — 한 번 더 묻는다. 지금 닫으면 **되돌릴 수 없다**(아래 참고).
 * - `blocked` — 닫지 않는다. 요청이 날아가 있어 결과를 놓치면 안 되는 짧은 구간이다.
 *
 * ⚠️ **왜 한 번 더 묻는가.** 318이 "나중에 하기"를 없앴던 근거가 아직 유효하다 — 표지 없는
 * Collection에 나중에 표지를 붙이는 진입점이 이 앱에 아직 없다(계약은 "이후 등록·교체할 진입점을
 * 제공한다"고만 적혀 있다, docs/api-contract.md § 표지 이미지 `coverImageUrl`). 즉 여기서 닫으면
 * 이 컬렉션의 표지는 당분간 기본 표지로 굳는다. 그래도 **닫는 길 자체는 있어야 한다**(front#130) —
 * 다만 ESC 오타 한 번으로 되돌릴 수 없는 상태가 되지 않게 확인을 한 겹 둔다. 확인 다이얼로그는
 * 이 레포의 기존 정책과 같은 도구다(shared/ui/ConfirmDialog).
 *
 * 반대로 **표지를 만들 길이 이미 없는 상태(요청 실패·상한 초과)에서는 묻지 않는다.** 그때는
 * 사용자가 고르는 것이 아니라 그릴 그림 자체가 없는 것이라, 확인은 성가심일 뿐이다.
 */
export type CoverCancelIntent = 'close' | 'confirm' | 'blocked';

export interface CoverCancelSituation {
  phase: CoverGenerationPhase;
  /** 요청 자체의 실패(네트워크·404·422·5xx). */
  hasError: boolean;
  /** 후보 폴링 상한(5분)을 넘겨 그만 물은 상태. */
  isTimedOut: boolean;
  /** 화풍 선택 요청이 서버로 날아가 있는 중. */
  isSelecting: boolean;
}

export function resolveCoverCancelIntent({
  phase,
  hasError,
  isTimedOut,
  isSelecting,
}: CoverCancelSituation): CoverCancelIntent {
  // 선택 요청이 날아가 있는 짧은 구간. 여기서 닫으면 접수 여부를 모른 채 화면이 사라지고,
  // 인계(onStyleAccepted)도 놓친다 — 응답이 오면 모달은 어차피 스스로 닫힌다.
  if (isSelecting) {
    return 'blocked';
  }
  // 선택이 접수된 뒤. 인쇄본은 이미 백그라운드로 넘어갔으니 물을 것이 없다(326).
  if (phase === 'accepted') {
    return 'close';
  }
  if (hasError || isTimedOut) {
    return 'close';
  }
  // 후보가 그려지는 중 = 사용자가 고를 그림이 있거나 곧 생긴다. 이때만 되묻는다.
  if (phase === 'generating') {
    return 'confirm';
  }
  // idle: 아직 요청 결과가 오지 않아 화면에 고를 것이 없다. 붙잡을 이유가 없다.
  return 'close';
}
