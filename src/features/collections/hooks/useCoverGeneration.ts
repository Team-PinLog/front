import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ImageApiError } from '@/shared/http/imageClient';
import {
  createCoverRequest,
  getCoverRequest,
  selectCoverStyle,
  type CoverCandidate,
  type CoverRequestState,
} from '../api/coverGeneration';
import { getCollectionDetail } from '../api/getCollectionDetail';
import {
  COVER_POLL_TIMEOUT_MS,
  isCoverPollingExpired,
  isCoverPollingSettled,
  isTerminalJobStatus,
  pickRandomReadyCandidate,
  resolveCoverCandidates,
  type CoverGenerationPhase,
} from '../lib/coverGenerationPhase';
import { collectCoverKeywords } from '../lib/coverKeywords';

// ⭐ 표준 패턴: 컴포넌트는 이 Hook만 호출한다. API 함수·클라이언트를 직접 부르지 않는다.

/** front#99 권장 폴링 간격. 6장을 다 기다리지 않고 done된 카드부터 붙이기 위한 값이다. */
const COVER_POLL_INTERVAL_MS = 1000;

/**
 * 키워드 조달용 상세 조회 크기. 표지 키워드는 앞쪽 Record 몇 개면 충분하고(COVER_KEYWORD_LIMIT=5),
 * 여기서 큰 값을 보내면 표지와 무관한 요청이 무거워진다 — 상세 화면의 30(useCollectionDetailQuery)과
 * 목적이 다르다.
 */
const KEYWORD_SOURCE_RECORD_SIZE = 10;

export interface StartCoverGenerationPayload {
  collectionId: number;
  title: string;
}

/**
 * 표지 요청 직전에 키워드를 모은다. 실패하면 빈 배열로 진행한다 — 키워드는 그림의 힌트일 뿐이고,
 * 이것 때문에 표지 생성 자체를 막으면 사용자는 이유를 알 수 없는 실패를 보게 된다.
 * 이미지 서비스는 title만으로도 그린다.
 */
async function loadCoverKeywords(collectionId: number): Promise<string[]> {
  try {
    const detail = await getCollectionDetail(collectionId, {
      recordSize: KEYWORD_SOURCE_RECORD_SIZE,
    });
    return collectCoverKeywords(detail.records.items);
  } catch {
    return [];
  }
}

export function coverRequestQueryKey(coverRequestId: string) {
  return ['coverRequest', coverRequestId] as const;
}

export interface CoverGeneration {
  phase: CoverGenerationPhase;
  /** 화면에 그릴 후보 카드(서버 응답 순서 그대로). */
  candidates: CoverCandidate[];
  /** 사용자가 고른 화풍. 선택 전에는 null. */
  selectedStyleId: string | null;
  /** 인쇄본. 완료 전에는 null. */
  final: CoverRequestState['final'];
  /** 인쇄본까지 끝나 상위로 넘길 수 있는 상태인가. */
  isSettled: boolean;
  /** 상한(5분)을 넘겨 폴링을 그만둔 상태. 실패가 아니라 "그만 묻기로 했다"는 뜻이다. */
  isTimedOut: boolean;
  /** 사용자가 "알아서 골라주기"를 눌러, 완성되는 대로 무작위 한 장이 선택되는 중. */
  isAutoPicking: boolean;
  /** 요청 자체의 실패(네트워크·404·422·5xx). 잡 실패(status: 'failed')와 다른 것이다. */
  error: ImageApiError | null;
  isStarting: boolean;
  isSelecting: boolean;
  start: (payload: StartCoverGenerationPayload) => void;
  select: (styleId: string) => void;
  /** 고르지 않고 맡긴다 — 완성되는 대로 무작위 한 장이 선택된다. */
  requestAutoPick: () => void;
  reset: () => void;
}

/**
 * 317: Collection 표지 생성 흐름 전체(생성 → 폴링 → 화풍 선택 → 인쇄본 폴링)를 하나로 묶는다.
 *
 * **폴링을 setInterval이 아니라 TanStack Query의 refetchInterval로 하는 이유**: 언마운트 시 타이머
 * 정리와 중복 요청 방지를 직접 짜지 않아도 된다. front#99가 "컴포넌트 unmount 시 폴링 timer를 반드시
 * 정리"하라고 못박은 부분인데, setInterval + useEffect로 하면 정리 누락·의존성 배열 실수로 타이머가
 * 남기 쉽다. Query는 구독자가 사라지면 알아서 멈춘다.
 *
 * 종료 조건은 단계마다 다르다 — lib/coverGenerationPhase.ts의 isCoverPollingSettled 주석 참고.
 */
export function useCoverGeneration(): CoverGeneration {
  const [coverRequestId, setCoverRequestId] = useState<string | null>(null);
  const [phase, setPhase] = useState<CoverGenerationPhase>('idle');
  const [initialCandidates, setInitialCandidates] = useState<CoverCandidate[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  // 폴링 상한의 기준 시각. 화풍 선택으로 새 잡이 시작되면 다시 잡는다 — 후보 생성에 3분,
  // 인쇄본에 3분이 걸리는 것은 각각 정상인데 합쳐서 재면 정상 흐름이 중간에 끊긴다.
  const [pollStartedAt, setPollStartedAt] = useState<number | null>(null);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [isAutoPicking, setIsAutoPicking] = useState(false);
  // 자동 선택은 딱 한 번만 쏜다. 폴링이 1초마다 새 데이터를 주므로 effect가 반복 실행되는데,
  // mutate가 접수돼 phase가 바뀌기까지의 짧은 틈에 두 번째 요청이 나가면 인쇄본 잡이 두 개 생긴다.
  const autoPickFiredRef = useRef(false);

  // 상한 도달을 렌더 중 Date.now()로 판정하면 안 된다 — 렌더가 순수하지 않아지고, 무엇보다 5분이
  // 지나도 리렌더를 유발할 것이 없어 화면이 그대로 멈춰 있는다. 타이머로 한 번만 깨워 상태를 뒤집는다.
  // pollStartedAt이 바뀌면(새 잡) 이전 타이머는 정리되고 다시 시작한다.
  // 이 effect는 타이머만 건다 — 플래그 되돌리기(setIsTimedOut(false))는 pollStartedAt을 세우는
  // 쪽에서 함께 한다. effect 안에서 동기적으로 setState하면 렌더가 연쇄로 한 번 더 돈다.
  useEffect(() => {
    if (pollStartedAt === null) {
      return;
    }
    const remainingMs = Math.max(0, COVER_POLL_TIMEOUT_MS - (Date.now() - pollStartedAt));
    const timer = window.setTimeout(() => setIsTimedOut(true), remainingMs);
    return () => window.clearTimeout(timer);
  }, [pollStartedAt]);

  /** 새 잡을 시작할 때마다 상한 기준 시각과 플래그를 함께 초기화한다. */
  const restartPollTimeout = useCallback(() => {
    setPollStartedAt(Date.now());
    setIsTimedOut(false);
  }, []);

  const createMutation = useMutation<
    Awaited<ReturnType<typeof createCoverRequest>>,
    ImageApiError,
    StartCoverGenerationPayload
  >({
    // 키워드 조달과 표지 요청을 한 뮤테이션으로 묶는다 — 두 단계를 컴포넌트에서 이어붙이면
    // "키워드가 도착하면 표지 요청을 시작"하는 effect가 필요해지고, 그 effect는 모달이 닫히는
    // 타이밍과 얽혀 취소 처리가 까다로워진다.
    mutationFn: async ({ collectionId, title }) =>
      createCoverRequest({ title, keywords: await loadCoverKeywords(collectionId) }),
    onSuccess: (data) => {
      setCoverRequestId(data.coverRequestId);
      setInitialCandidates(data.candidates);
      setPhase('generating');
      restartPollTimeout();
    },
  });

  const stateQuery = useQuery<CoverRequestState, ImageApiError>({
    queryKey: coverRequestQueryKey(coverRequestId ?? ''),
    queryFn: () => getCoverRequest(coverRequestId as string),
    enabled: coverRequestId !== null && phase !== 'idle',
    // 폴링 자체가 최신값을 계속 가져오므로 캐시를 신선하다고 볼 이유가 없다.
    staleTime: 0,
    // 전역 retry:1을 상속하면 실패한 폴링이 매 주기마다 두 번씩 나간다.
    retry: false,
    refetchInterval: (query) => {
      // 318: 상한을 넘기면 그만 묻는다. 잡이 끝내 terminal이 되지 않는 경우(선택은 접수됐는데
      // 인쇄본 잡이 생기지 않는 등) 상한이 없으면 모달을 닫을 때까지 1초마다 요청이 계속 나간다.
      if (isCoverPollingExpired(pollStartedAt, Date.now())) {
        return false;
      }
      return isCoverPollingSettled(query.state.data, phase) ? false : COVER_POLL_INTERVAL_MS;
    },
  });

  const selectMutation = useMutation<
    Awaited<ReturnType<typeof selectCoverStyle>>,
    ImageApiError,
    string
  >({
    mutationFn: (styleId: string) => selectCoverStyle(coverRequestId as string, styleId),
    onSuccess: (data) => {
      setSelectedStyleId(data.styleId);
      // 선택 직후 서버 상태는 아직 이전 done일 수 있다 — phase를 먼저 바꿔야 그 응답을 보고
      // 폴링을 멈추지 않는다(isCoverPollingSettled는 finalizing에서 final만 본다).
      setPhase('finalizing');
      // 인쇄본은 새 잡이다 — 상한도 여기서 다시 잡는다.
      restartPollTimeout();
    },
  });

  /**
   * "알아서 골라주기": 완성된 후보가 나오는 대로 무작위 한 장을 골라 인쇄본까지 진행한다.
   *
   * 누른 시점에 아직 아무것도 안 그려졌을 수 있어(GPU 큐) 즉시 고르지 못한다 — 의사만 기록해 두고
   * 폴링으로 첫 완성본이 도착하면 그때 고른다.
   * 그 사이 사용자가 직접 고르면 phase가 finalizing이 되어 이 effect는 더 이상 개입하지 않는다.
   */
  useEffect(() => {
    if (!isAutoPicking || phase !== 'generating' || autoPickFiredRef.current) {
      return;
    }
    const picked = pickRandomReadyCandidate(stateQuery.data?.candidates ?? []);
    if (!picked) {
      return;
    }
    autoPickFiredRef.current = true;
    selectMutation.mutate(picked.styleId);
  }, [isAutoPicking, phase, stateQuery.data, selectMutation]);

  const requestAutoPick = useCallback(() => {
    setIsAutoPicking(true);
  }, []);

  const reset = useCallback(() => {
    setCoverRequestId(null);
    setPhase('idle');
    setInitialCandidates([]);
    setSelectedStyleId(null);
    setPollStartedAt(null);
    setIsTimedOut(false);
    setIsAutoPicking(false);
    autoPickFiredRef.current = false;
    createMutation.reset();
    selectMutation.reset();
  }, [createMutation, selectMutation]);

  const start = useCallback(
    (payload: StartCoverGenerationPayload) => {
      createMutation.mutate(payload);
    },
    [createMutation],
  );

  const select = useCallback(
    (styleId: string) => {
      if (coverRequestId === null || selectMutation.isPending) {
        return;
      }
      selectMutation.mutate(styleId);
    },
    [coverRequestId, selectMutation],
  );

  const final = stateQuery.data?.final ?? null;
  const isSettled = phase === 'finalizing' && final !== null && isTerminalJobStatus(final.status);

  return {
    phase,
    candidates: resolveCoverCandidates(initialCandidates, stateQuery.data),
    selectedStyleId,
    final,
    isSettled,
    // 끝나지 않은 채 상한을 넘긴 경우만 타임아웃이다 — 이미 끝났으면 상한을 넘겨도 정상 완료다.
    isTimedOut: isTimedOut && !isSettled,
    isAutoPicking,
    // 셋 중 먼저 난 실패 하나만 보여준다 — 폴링 실패는 이미 끝난 생성 요청의 성공을 덮지 않는다.
    error: createMutation.error ?? selectMutation.error ?? stateQuery.error ?? null,
    isStarting: createMutation.isPending,
    isSelecting: selectMutation.isPending,
    start,
    select,
    requestAutoPick,
    reset,
  };
}
