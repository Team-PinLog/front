import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ImageApiError } from '@/shared/http/imageClient';
import { getCoverRequest, type CoverRequestState } from '../api/coverGeneration';
import {
  COVER_POLL_TIMEOUT_MS,
  hasCoverPollingGivenUp,
  isCoverPollingExpired,
  isCoverPollingSettled,
  resolveSavableCoverUrl,
} from '../lib/coverGenerationPhase';
import { coverRequestQueryKey } from './useCoverGeneration';
import { useSaveCollectionCoverMutation } from './useSaveCollectionCoverMutation';

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·클라이언트를 직접 부르지 않는다.

/** front#99 권장 폴링 간격. 화면에 붙어 있지 않아도 간격을 늘리지 않는다 — 상한이 5분이라 짧다. */
const COVER_POLL_INTERVAL_MS = 1000;

export interface CoverFinalizationJob {
  /** 화풍 선택까지 끝난 표지 요청. 이 id로 인쇄본 완성만 기다린다. */
  coverRequestId: string;
  /** 완성된 인쇄본을 붙일 컬렉션. */
  collectionId: number;
}

/**
 * 326: **아무도 보고 있지 않은 표지 하나**를 끝까지 데려간다 — 인쇄본(final) 완성을 기다려
 * `PATCH /collections/{id}`로 저장하고, 끝나면 스스로 사라진다.
 *
 * **왜 훅이 화면 밖(CoverJobProvider)에 사는가**: TanStack Query는 구독자가 사라지면 폴링을
 * 멈춘다. 그래서 인쇄본을 모달 안에서 기다리면 "모달을 닫지 말고 기다려라"가 된다 — 인쇄본은
 * GPU 잡이라 몇 분이 걸릴 수 있는데, api-contract.md는 생성 버튼을 표지 완성에 묶지 말라고 한다.
 * 잡 하나에 훅 인스턴스 하나(러너 컴포넌트 하나)를 두어, 사용자가 컬렉션을 연달아 만들어도
 * 먼저 시작한 표지가 뒤엣것에 밀려 사라지지 않게 한다.
 *
 * **끝났음을 알리는 방법이 onSettled 하나뿐인 이유**: 이 흐름에는 사용자에게 보여줄 화면이 없다.
 * 성공하든(저장 완료) 실패하든(잡 실패·저장 실패·상한 초과) 러너는 조용히 물러난다. 표지 없는
 * 컬렉션은 오류가 아니라 정상 상태이고(api-contract.md), 모달이 닫힌 지 몇 분 뒤에 뜨는 에러
 * 모달은 사용자가 원인과 연결하지 못한다.
 */
export function useCoverFinalization(job: CoverFinalizationJob, onSettled: () => void): void {
  const saveCoverMutation = useSaveCollectionCoverMutation(job.collectionId);
  // 상한의 기준은 이 러너가 인쇄본을 이어받은 시각이다. 화풍 선택 직전까지 후보 생성에 쓴 시간은
  // 여기에 합산하지 않는다 — 후보에 3분, 인쇄본에 3분은 각각 정상인데 합쳐서 재면 정상 흐름이
  // 중간에 끊긴다. useState의 초기화 함수라 마운트 때 한 번만 잡힌다.
  const [pollStartedAt] = useState(() => Date.now());
  const [isExpired, setIsExpired] = useState(false);
  // 저장은 한 번만 쏜다 — 폴링이 1초마다 새 데이터를 주므로 effect가 반복 실행되는데, mutate 접수와
  // 상태 반영 사이의 틈에 두 번째 PATCH가 나가면 같은 값을 두 번 저장한다.
  const saveFiredRef = useRef(false);
  // onSettled는 이 훅을 언마운트시키는 콜백이다. 두 번 부르면(예: 저장 성공과 상한 도달이 겹치면)
  // 이미 사라진 잡을 또 지우게 되므로 한 번으로 막는다.
  const settledRef = useRef(false);
  const settleOnceRef = useRef(onSettled);
  useEffect(() => {
    settleOnceRef.current = onSettled;
  });

  const stateQuery = useQuery<CoverRequestState, ImageApiError>({
    queryKey: coverRequestQueryKey(job.coverRequestId),
    queryFn: () => getCoverRequest(job.coverRequestId),
    // 모달이 후보 폴링으로 채워둔 캐시를 그대로 물려받는다(같은 쿼리 키) — 인수인계 순간에
    // 빈 화면 없이 이어지고, staleTime 0이라 곧바로 다음 폴링이 나간다.
    staleTime: 0,
    // 전역 retry:1을 상속하면 실패한 폴링이 매 주기마다 두 번씩 나간다. 연속 실패는 아래
    // refetchInterval에서 fetchFailureCount로 따로 센다.
    retry: false,
    refetchInterval: (query) => {
      if (isCoverPollingExpired(pollStartedAt, Date.now())) {
        return false;
      }
      // 이미지 서비스가 계속 실패를 돌려주면(404·5xx) 상한까지 1초마다 두드릴 이유가 없다.
      if (hasCoverPollingGivenUp(query.state.fetchFailureCount)) {
        return false;
      }
      return isCoverPollingSettled(query.state.data, 'finalizing') ? false : COVER_POLL_INTERVAL_MS;
    },
  });

  // 상한 도달을 렌더 중 Date.now()로 판정하면 안 된다 — 렌더가 순수하지 않아지고, 무엇보다 5분이
  // 지나도 리렌더를 유발할 것이 없어 러너가 살아 있는 채로 남는다. 타이머로 한 번 깨워 정리한다.
  useEffect(() => {
    const remainingMs = Math.max(0, COVER_POLL_TIMEOUT_MS - (Date.now() - pollStartedAt));
    const timer = window.setTimeout(() => setIsExpired(true), remainingMs);
    return () => window.clearTimeout(timer);
  }, [pollStartedAt]);

  useEffect(() => {
    if (settledRef.current) {
      return;
    }

    const settle = () => {
      settledRef.current = true;
      settleOnceRef.current();
    };

    // 그만 물어야 하는 세 가지: 상한 초과 / 연속 실패로 포기 / 인쇄본이 실패로 끝남.
    // 어느 쪽이든 표지 없이 남기고 조용히 물러난다.
    if (isExpired || hasCoverPollingGivenUp(stateQuery.failureCount)) {
      settle();
      return;
    }

    const coverImageUrl = resolveSavableCoverUrl(stateQuery.data?.final ?? null);
    if (!coverImageUrl) {
      if (stateQuery.data?.final?.status === 'failed') {
        settle();
      }
      return;
    }

    if (saveFiredRef.current) {
      return;
    }
    saveFiredRef.current = true;
    // 성공하면 훅 안에서 컬렉션 상세·책장 쿼리가 무효화되어 표지가 뒤늦게 화면에 나타난다
    // (useSaveCollectionCoverMutation). 실패해도 재시도하지 않는다 — 볼 사람도 누를 사람도 없다.
    saveCoverMutation.mutate(coverImageUrl, { onSuccess: settle, onError: settle });
  }, [isExpired, saveCoverMutation, stateQuery.data, stateQuery.failureCount]);
}
