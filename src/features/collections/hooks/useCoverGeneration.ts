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
  pickRandomReadyCandidate,
  resolveCoverCandidates,
  type CoverGenerationPhase,
} from '../lib/coverGenerationPhase';
import { collectCoverKeywords } from '../lib/coverKeywords';
// 타입만 가져온다(런타임 순환 없음) — 인계 대상인 useCoverFinalization이 잡의 모양을 소유한다.
import type { CoverFinalizationJob } from './useCoverFinalization';

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

export interface UseCoverGenerationOptions {
  /**
   * 화풍 선택이 **접수된** 순간에 부른다(인쇄본 완성이 아니다).
   *
   * 326: 호출부는 여기서 인쇄본 잡을 백그라운드로 넘기고 화면을 닫는다. 인쇄본은 GPU 잡이라
   * 수십 초에서 몇 분이 걸리는데, 그동안 모달이 사용자를 붙잡고 있을 이유가 없다
   * (docs/api-contract.md § Collection 표지 이미지 — "생성 버튼을 표지 완성에 묶지 않는다").
   *
   * 인계에 필요한 것을 한 덩어리로 넘긴다 — 대상 컬렉션은 start()가 받았으므로 호출부가 그때의
   * id를 다시 붙들고 있을 필요가 없다.
   */
  onStyleAccepted?: (job: CoverFinalizationJob) => void;
}

export interface CoverGeneration {
  phase: CoverGenerationPhase;
  /** 화면에 그릴 후보 카드(서버 응답 순서 그대로). */
  candidates: CoverCandidate[];
  /** 사용자가 고른 화풍. 선택 전에는 null. */
  selectedStyleId: string | null;
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
 * 317: Collection 표지의 **화면 쪽** 흐름(생성 → 후보 폴링 → 화풍 선택 접수)을 하나로 묶는다.
 *
 * **폴링을 setInterval이 아니라 TanStack Query의 refetchInterval로 하는 이유**: 언마운트 시 타이머
 * 정리와 중복 요청 방지를 직접 짜지 않아도 된다. front#99가 "컴포넌트 unmount 시 폴링 timer를 반드시
 * 정리"하라고 못박은 부분인데, setInterval + useEffect로 하면 정리 누락·의존성 배열 실수로 타이머가
 * 남기 쉽다. Query는 구독자가 사라지면 알아서 멈춘다.
 *
 * 326: **인쇄본(final) 폴링과 저장은 여기서 하지 않는다.** 그 두 가지는 화면 수명과 무관해야 하기
 * 때문이다 — 구독자가 사라지면 폴링이 멈춘다는 바로 그 성질 때문에, 모달 안에서 인쇄본을 기다리면
 * "모달을 닫지 말고 기다려라"가 되어버린다. 선택이 접수되면 onStyleAccepted로 coverRequestId를
 * 넘기고 이 훅의 역할은 끝난다. 인쇄본은 라우터 바깥의 CoverJobProvider가 이어받는다
 * (hooks/useCoverFinalization.ts).
 *
 * 종료 조건은 단계마다 다르다 — lib/coverGenerationPhase.ts의 isCoverPollingSettled 주석 참고.
 */
export function useCoverGeneration(options: UseCoverGenerationOptions = {}): CoverGeneration {
  const [coverRequestId, setCoverRequestId] = useState<string | null>(null);
  const [phase, setPhase] = useState<CoverGenerationPhase>('idle');
  const [initialCandidates, setInitialCandidates] = useState<CoverCandidate[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  // 후보 생성 폴링의 상한 기준 시각. '다시 그리기'로 새 요청을 시작하면 다시 잡는다.
  // 인쇄본 쪽 상한은 여기서 재지 않는다 — 백그라운드 러너가 인계 시점부터 따로 잰다.
  const [pollStartedAt, setPollStartedAt] = useState<number | null>(null);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [isAutoPicking, setIsAutoPicking] = useState(false);
  // 자동 선택은 딱 한 번만 쏜다. 폴링이 1초마다 새 데이터를 주므로 effect가 반복 실행되는데,
  // mutate가 접수돼 phase가 바뀌기까지의 짧은 틈에 두 번째 요청이 나가면 인쇄본 잡이 두 개 생긴다.
  const autoPickFiredRef = useRef(false);
  // 표지를 붙일 컬렉션. 화면에 그릴 일이 없어 state가 아니라 ref다 — 선택이 접수될 때 인계할
  // 잡을 조립하는 데만 쓴다.
  const targetCollectionIdRef = useRef<number | null>(null);
  // 콜백을 ref로 들고 부르는 이유: 선택 접수 시점의 최신 콜백이어야 한다. 뮤테이션 옵션에 그대로
  // 넣으면 useMutation이 처음 받은 클로저를 붙들어, 호출부가 그 사이 갱신한 값(예: 방금 만든
  // 컬렉션 id)을 못 보고 옛 값으로 인쇄본 잡을 등록할 수 있다.
  const onStyleAcceptedRef = useRef(options.onStyleAccepted);
  useEffect(() => {
    onStyleAcceptedRef.current = options.onStyleAccepted;
  });

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
      // 326: 여기서 이 훅의 일은 끝난다. 후보 폴링을 멈추고(accepted), 인쇄본은 호출부가
      // 백그라운드로 넘긴다. 상한 타이머도 더 잡지 않는다 — 기다릴 것이 없다.
      setPhase('accepted');
      setPollStartedAt(null);
      const collectionId = targetCollectionIdRef.current;
      if (collectionId !== null) {
        onStyleAcceptedRef.current?.({ coverRequestId: data.coverRequestId, collectionId });
      }
    },
  });

  /**
   * "알아서 골라주기": 완성된 후보가 나오는 대로 무작위 한 장을 골라 인쇄본 생성을 요청한다.
   *
   * 누른 시점에 아직 아무것도 안 그려졌을 수 있어(GPU 큐) 즉시 고르지 못한다 — 의사만 기록해 두고
   * 폴링으로 첫 완성본이 도착하면 그때 고른다.
   * 그 사이 사용자가 직접 고르면 phase가 accepted가 되어 이 effect는 더 이상 개입하지 않는다.
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
    targetCollectionIdRef.current = null;
    createMutation.reset();
    selectMutation.reset();
  }, [createMutation, selectMutation]);

  /**
   * 표지 요청을 시작한다. 326부터는 **'다시 그리기'(후보 6종을 새로 받기)도 같은 입구**를 쓴다 —
   * 서버에 "다시 그려라"가 따로 없고 새 coverRequest를 만드는 것이 곧 다시 그리기다.
   *
   * 그래서 이전 요청에 걸어둔 선택 의사(직접 고른 화풍·"알아서 골라주기")를 여기서 지운다.
   * 남겨두면 새 후보가 도착하는 즉시 옛 의사가 발동해, 사용자가 새 그림을 보기도 전에 골라진다.
   */
  const start = useCallback(
    (payload: StartCoverGenerationPayload) => {
      setSelectedStyleId(null);
      setIsAutoPicking(false);
      autoPickFiredRef.current = false;
      targetCollectionIdRef.current = payload.collectionId;
      createMutation.mutate(payload);
    },
    [createMutation],
  );

  const select = useCallback(
    (styleId: string) => {
      // accepted 이후의 클릭은 무시한다 — 이미 인쇄본 잡이 등록됐고, 한 번 더 보내면 같은
      // coverRequest에 GPU 잡이 하나 더 생긴다.
      if (coverRequestId === null || phase === 'accepted' || selectMutation.isPending) {
        return;
      }
      selectMutation.mutate(styleId);
    },
    [coverRequestId, phase, selectMutation],
  );

  return {
    phase,
    candidates: resolveCoverCandidates(initialCandidates, stateQuery.data),
    selectedStyleId,
    // 선택이 접수된 뒤에는 기다리는 것이 없으므로 상한 안내를 띄우지 않는다.
    isTimedOut: isTimedOut && phase === 'generating',
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
