import type { CoverCandidate } from '../api/coverGeneration';
import type { CoverGeneration } from '../hooks/useCoverGeneration';

/**
 * 317: 화풍 6종 카드. 서버가 준 순서 그대로 그리고(재정렬 금지), **6장을 다 기다리지 않고 done된
 * 카드부터 이미지를 붙인다**(front#99 UX 권장사항 — GPU 큐 때문에 전체 완료까지 오래 걸린다).
 *
 * 카드 자리는 처음부터 6칸을 잡아둔다. 완료된 것만 렌더하면 이미지가 하나씩 도착할 때마다 그리드가
 * 재배치되어 사용자가 고르려던 카드가 눈앞에서 움직인다.
 *
 * 표지 이미지는 세로 2:3이다(미리보기 512×768) — aspect-[2/3]로 자리를 먼저 잡아 로드 전후로
 * 레이아웃이 흔들리지 않게 한다(docs/api-contract.md § Collection 표지 이미지).
 */

const STATUS_LABEL: Record<CoverCandidate['status'], string> = {
  queued: '대기 중',
  running: '그리는 중',
  done: '',
  failed: '실패',
};

/**
 * 생성 요청 응답이 오기 전에 깔아둘 빈 카드 수. 서버가 화풍 6종을 준다는 전제(front#99)에서 온
 * 값이고, 응답이 오면 실제 후보로 교체된다 — 응답의 개수가 6이 아니어도 그쪽을 따른다.
 * 이 자리를 비워두면 요청 대기 동안 모달 본문이 통째로 비어 "멈춘 화면"으로 보인다.
 */
const COVER_SKELETON_COUNT = 6;

export interface CoverStylePickerProps {
  cover: CoverGeneration;
  /** 생성 요청 자체가 실패했을 때 같은 컬렉션으로 다시 시도한다. */
  onRetry: () => void;
}

export function CoverStylePicker({ cover, onRetry }: CoverStylePickerProps) {
  const isFinalizing = cover.phase === 'finalizing';
  const hasCandidates = cover.candidates.length > 0;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <p className="text-xs font-bold text-pin-navy">표지 화풍을 골라 주세요</p>
      <p className="mt-1 text-[11px] text-ink-gray-light">
        {isFinalizing
          ? '고른 화풍으로 표지를 완성하고 있어요. 잠시만 기다려 주세요.'
          : cover.isAutoPicking
            ? '완성되는 대로 하나를 골라 표지로 씁니다.'
            : '그림이 완성되는 대로 하나씩 나타나요. 마음에 드는 화풍을 골라 주세요.'}
      </p>

      {/* 요청 실패(네트워크·404·422·5xx)와 GPU 작업 실패(카드의 status: failed)는 다른 것이라
          메시지를 섞지 않는다 — 카드별 실패는 카드 안에 따로 표시된다. */}
      {cover.error && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs text-red-600">{cover.error.message}</p>
          {!hasCandidates && (
            <button
              type="button"
              onClick={onRetry}
              disabled={cover.isStarting}
              className="h-8 flex-none rounded-lg border border-pin-navy/15 px-3 text-xs font-bold text-pin-navy disabled:opacity-40"
            >
              다시 시도
            </button>
          )}
        </div>
      )}

      <ul className="mt-3 grid grid-cols-3 gap-2">
        {hasCandidates
          ? cover.candidates.map((candidate) => (
              <li key={candidate.styleId}>
                <CoverStyleCard
                  candidate={candidate}
                  isSelected={cover.selectedStyleId === candidate.styleId}
                  // 인쇄본 생성이 시작되면 선택을 바꿀 수 없다 — 이미 GPU 잡이 돌고 있다.
                  // 다만 그 인쇄본이 실패했으면 다시 열어준다 — 안 그러면 실패 문구만 보이고
                  // 다른 화풍으로 다시 시도할 길이 없는 막다른 상태가 된다.
                  isDisabled={
                    (isFinalizing && cover.final?.status !== 'failed') || cover.isSelecting
                  }
                  onSelect={() => cover.select(candidate.styleId)}
                />
              </li>
            ))
          : Array.from({ length: COVER_SKELETON_COUNT }, (_, index) => (
              <li key={index} aria-hidden="true">
                <div className="aspect-[2/3] w-full animate-pulse rounded-lg bg-line-subtle" />
              </li>
            ))}
      </ul>

      {cover.final?.status === 'failed' && (
        <p className="mt-2 text-xs text-red-600">
          표지를 완성하지 못했어요. 다른 화풍으로 다시 시도해 주세요.
        </p>
      )}

      {/* 318: 상한(5분)을 넘겨 폴링을 그만둔 상태. 실패로 단정하지 않는다 — 서버 작업은 계속
          돌고 있을 수 있고 우리가 그만 묻는 것뿐이다. */}
      {cover.isTimedOut && (
        <p className="mt-2 text-xs text-ink-gray">
          표지 생성이 오래 걸리고 있어요. 지금은 넘어가고 나중에 다시 시도해 주세요.
        </p>
      )}
    </div>
  );
}

function CoverStyleCard({
  candidate,
  isSelected,
  isDisabled,
  onSelect,
}: {
  candidate: CoverCandidate;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: () => void;
}) {
  const isReady = candidate.status === 'done' && candidate.url !== null;

  return (
    <button
      type="button"
      onClick={onSelect}
      // 아직 안 그려진 카드는 고를 수 없다 — 선택은 style_id로 보내지만, 사용자가 그림을 보지 않고
      // 고르게 하는 것은 이 화면의 목적(화풍을 눈으로 비교)에 어긋난다.
      disabled={!isReady || isDisabled}
      aria-pressed={isSelected}
      className={`flex w-full flex-col overflow-hidden rounded-lg border text-left transition disabled:cursor-not-allowed ${
        isSelected ? 'border-log-mint ring-2 ring-log-mint/30' : 'border-line-card'
      }`}
    >
      <div className="relative aspect-[2/3] w-full bg-line-subtle">
        {isReady ? (
          <img
            src={candidate.url as string}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={`grid h-full w-full place-items-center gap-1 text-[10px] ${
              candidate.status === 'failed' ? 'text-red-600' : 'text-ink-gray-light'
            }`}
          >
            {/* 대기·생성 중에는 스피너를 함께 돌린다 — 글자만 있으면 GPU 큐에서 수십 초씩 멈춰
                있을 때 화면이 멎은 것처럼 보인다. 실패한 카드에는 돌릴 것이 없다. */}
            {candidate.status !== 'failed' && <Spinner />}
            <span>{STATUS_LABEL[candidate.status]}</span>
          </div>
        )}
      </div>
      <span className="truncate px-1.5 py-1 text-[11px] font-bold text-pin-navy">
        {candidate.label}
      </span>
    </button>
  );
}

/** 생성 대기·진행 중 표시. 원 궤도 중 4분의 1만 진하게 칠해 회전이 눈에 보이게 한다. */
function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
