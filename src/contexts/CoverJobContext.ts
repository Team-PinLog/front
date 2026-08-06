import { createContext } from 'react';
import type { CoverFinalizationJob } from '@/features/collections/hooks/useCoverFinalization';

/**
 * 326: 화풍 선택까지 끝난 표지 인쇄본을 **화면 밖에서** 완성·저장하기 위한 접수처.
 *
 * 근거: docs/api-contract.md § Collection 표지 이미지 — 생성 버튼을 표지 완성에 묶지 않는다.
 * 인쇄본은 GPU 잡이라 몇 분이 걸릴 수 있는데, 모달이 그걸 기다리면 컬렉션은 이미 만들어졌는데도
 * 사용자가 계속 붙잡혀 있게 된다.
 *
 * **Context가 필요한 이유는 상태 공유가 아니라 수명이다.** 진행 중인 잡 목록을 화면이 읽을 일은
 * 없다(그래서 값은 enqueue 하나뿐이다). 필요한 것은 폴링의 구독자를 모달보다 오래 사는 곳에
 * 두는 것뿐이다 — TanStack Query는 구독자가 사라지면 폴링을 멈추기 때문이다.
 *
 * ⚠️ Provider는 라우터 **바깥**(main.tsx)에 둔다. AppLayout 안에 두면 RootLayout이 레이아웃을
 * 걷어내는 경로(`/collections/...` 등)로 이동하는 순간 트리가 통째로 빠져 저장이 취소된다 —
 * 표지 저장 직후 컬렉션 상세로 들어가는 것은 아주 흔한 동선이다.
 */
export interface CoverJobQueueValue {
  /**
   * 인쇄본 완성·저장을 백그라운드에 맡긴다. 호출한 화면은 바로 닫아도 된다.
   * 같은 coverRequestId를 두 번 맡겨도 잡은 하나다.
   */
  enqueue(job: CoverFinalizationJob): void;
}

export const CoverJobContext = createContext<CoverJobQueueValue | null>(null);
