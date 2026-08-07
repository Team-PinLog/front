import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useCoverJobQueue } from '@/contexts/useCoverJobQueue';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { useCoverGeneration } from '../hooks/useCoverGeneration';
import { resolveCoverCancelIntent } from '../lib/coverCancelIntent';
import { CoverStylePicker } from './CoverStylePicker';

export interface CollectionCoverModalProps {
  /** 표지를 붙일 컬렉션. **이미 서버에 만들어져 있어야 한다**(표지 요청에 id가 필요하다). */
  collection: { collectionId: number; title: string };
  onClose: () => void;
}

/**
 * 컬렉션 표지 화풍 선택 모달.
 *
 * 327: 원래 NewCollectionModal의 두 번째 단계였던 것을 그대로 떼어냈다 — 장소 추가 흐름에서 만든
 * 새 컬렉션도 같은 화면으로 표지를 고르게 하기 위해서다. **라이브러리 쪽 화면·동작은 그대로다.**
 *
 * **마운트가 곧 열림이다**(isOpen prop이 없다). 표지 요청은 마운트될 때 시작하고, 언마운트되면
 * 후보 폴링이 함께 멈춘다(TanStack Query는 구독자가 사라지면 폴링을 멈춘다). 열림/닫힘을 prop으로
 * 받으면 "닫혀 있지만 마운트된" 상태에서 폴링을 멈추는 처리를 따로 해야 한다.
 *
 * 326: 화풍이 정해지면 인쇄본을 기다리지 않고 바로 닫는다 — 그 뒤(인쇄본 완성 → PATCH 저장)는
 * CoverJobProvider가 화면 밖에서 이어받는다. 사용자가 표지를 고르지 않고 닫아도 컬렉션은 이미
 * 만들어져 있고, 표지만 없는 정상 상태로 남는다(docs/api-contract.md § Collection 표지 이미지).
 *
 * 413(front#130): **닫을 길이 아예 없던 것을 고쳤다.** 배포 QA에서 이 화면에 들어오면 화풍을 고를
 * 때까지 나갈 수 없다는 것이 확인됐다(그전까지의 탈출구는 요청이 실패했을 때만 나타나는 "표지 없이
 * 닫기" 하나뿐이었다). 이제 헤더의 닫기 버튼과 ESC로 언제든 나갈 수 있다.
 *  - **취소가 계약상 안전한 이유**: 컬렉션은 이 화면에 오기 전에 이미 만들어져 있고, `coverImageUrl`
 *    이 `null`인 것은 오류가 아니라 정상 상태다(api-contract.md § 표지 이미지 — "화풍 선택 전에
 *    이탈해 표지 없는 Collection이 남는 것도 정상").
 *  - **취소 후 어디로 가는가**: 이 컴포넌트는 옮기지 않고 `onClose`만 부른다. 두 호출부 모두 닫으면
 *    곧바로 방금 만든 컬렉션이 보이는 자리다 — 라이브러리는 책장(MyShelfList, 생성 시
 *    myCollections를 무효화해 새 책이 이미 꽂혀 있다), 장소 기록 흐름은 이 모달 뒤에 깔린 저장 결과
 *    화면(PlaceRecordSheet 327 주석)이다. 여기서 라우팅을 하면 오히려 사용자를 있던 자리에서
 *    끌어내는 셈이 된다.
 *  - **폴링 정리**: 닫으면 이 컴포넌트가 언마운트되고, 후보 폴링(TanStack Query)과 상한 타이머
 *    (useCoverGeneration의 setTimeout)가 구독·effect 정리와 함께 멈춘다. 그래서 취소 경로에 별도
 *    정리 코드를 두지 않는다 — "마운트가 곧 열림"인 위 설계가 그대로 취소에도 쓰인다.
 *  - **배경 클릭으로는 닫지 않는다.** 이 레포 정책이고(ConfirmDialog 348, 기록 시트 324), 여기서는
 *    오클릭 한 번에 그리던 그림 6장이 사라지므로 더더욱 열어둘 이유가 없다.
 */
export function CollectionCoverModal({ collection, onClose }: CollectionCoverModalProps) {
  const coverJobQueue = useCoverJobQueue();
  const titleId = useId();
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);

  const cover = useCoverGeneration({
    onStyleAccepted: (job) => {
      coverJobQueue.enqueue(job);
      onClose();
    },
  });

  // 표지 요청은 컬렉션당 한 번만 시작한다. cover.start는 '다시 그리기'와 같은 입구라, 조건을
  // 잘못 걸면 렌더마다 새 coverRequest가 생겨 GPU 잡이 쌓인다(start는 참조가 고정되지 않아
  // 이 effect 자체는 자주 도는데, 실제 요청은 ref 가드가 한 번으로 막는다).
  const startedForRef = useRef<number | null>(null);
  const { collectionId, title } = collection;
  const { start } = cover;
  useEffect(() => {
    if (startedForRef.current === collectionId) {
      return;
    }
    startedForRef.current = collectionId;
    start({ collectionId, title });
  }, [collectionId, title, start]);

  // 413: 닫기 요청 하나에 닫기 버튼·ESC가 같이 걸린다. 무엇을 할지는 lib이 정한다
  // (그대로 닫기 / 한 번 더 묻기 / 지금은 막기 — 근거는 coverCancelIntent.ts).
  const requestLeave = useCallback(() => {
    const intent = resolveCoverCancelIntent({
      phase: cover.phase,
      hasError: cover.error !== null,
      isTimedOut: cover.isTimedOut,
      isSelecting: cover.isSelecting,
    });
    if (intent === 'blocked') {
      return;
    }
    if (intent === 'confirm') {
      setIsLeaveConfirmOpen(true);
      return;
    }
    onClose();
  }, [cover.phase, cover.error, cover.isTimedOut, cover.isSelecting, onClose]);

  // ESC로도 나갈 수 있어야 한다(front#130이 "취소·뒤로가기 수단이 없다"고 지적한 그 수단이다).
  // 확인 다이얼로그가 떠 있는 동안에는 걸지 않는다 — 그때 ESC는 다이얼로그가 처리해야 하고,
  // 둘 다 반응하면 한 번의 ESC로 다이얼로그와 모달이 동시에 닫힌다.
  useEffect(() => {
    if (isLeaveConfirmOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      requestLeave();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLeaveConfirmOpen, requestLeave]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pin-navy/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-lg bg-white p-6"
      >
        <div className="flex flex-none items-start justify-between gap-2">
          <h2 id={titleId} className="text-sm font-bold text-pin-navy">
            &lsquo;{collection.title}&rsquo; 표지 만들기
          </h2>
          {/* 닫기는 항상 보인다. 조건부로 나타나는 탈출구는 "지금은 나갈 수 없는 화면"으로 읽혀
              front#130의 보고가 그대로 재발한다. */}
          <button
            type="button"
            onClick={requestLeave}
            aria-label="표지 만들기 닫기"
            className="-mr-1 -mt-1 grid h-8 w-8 flex-none place-items-center rounded-lg text-ink-gray hover:bg-line-subtle"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <CoverStylePicker cover={cover} onRedraw={() => cover.start(collection)} />
        </div>

        {/* 318 수정: "나중에 하기"를 없앴다. 표지 없는 컬렉션을 남기면 나중에 표지를 붙이는
            별도 UI가 반드시 필요해진다 — 고르기 싫은 사용자에게는 무작위 한 장이 빈 표지보다 낫다.
            413: 그래서 본문의 큰 버튼은 여전히 "알아서 골라주기" 하나다. 나가는 길은 본문이 아니라
            헤더의 닫기(+ESC)로 두어, 고르는 화면의 무게중심을 바꾸지 않았다 — front#130이 요구한
            것은 "표지 없이 두는 쉬운 길"이 아니라 "나갈 수 있을 것"이다.
            326: "완료"는 없앴다. 화풍이 정해지면 그것으로 사용자의 일은 끝이고 모달이 닫힌다 —
            인쇄본을 기다리는 버튼을 남겨두면 백그라운드 저장의 의미가 없다. */}
        <div className="mt-4 flex-none">
          <button
            type="button"
            onClick={cover.requestAutoPick}
            disabled={cover.isAutoPicking || cover.phase !== 'generating'}
            className="h-11 w-full rounded-lg border border-pin-navy/15 text-sm font-bold text-pin-navy disabled:opacity-40"
          >
            {cover.isAutoPicking ? '고르는 중…' : '알아서 골라주기'}
          </button>
        </div>
      </div>

      {/* 413: "표지는 나중에 등록할 수 있어요"라고 쓰지 않는다. 계약에는 등록·교체 진입점을
          제공한다고 적혀 있지만(api-contract.md § 표지 이미지) **이 앱에는 아직 그 진입점이 없다** —
          지키지 못할 약속을 안내 문구로 두면 사용자는 있지도 않은 메뉴를 찾게 된다. 대신 지금
          사실인 것만 말한다: 컬렉션은 이미 만들어졌고, 표지 자리는 기본 표지가 채우며, 그리던
          그림은 사라진다. 진입점이 생기면 이 문구부터 고친다. */}
      <ConfirmDialog
        isOpen={isLeaveConfirmOpen}
        title="표지를 만들지 않고 닫을까요?"
        description={
          <>
            &lsquo;{collection.title}&rsquo; 컬렉션은 이미 만들어졌어요. 닫아도 사라지지 않고, 표지
            자리는 기본 표지가 대신합니다.
            <br />
            다만 지금 그리고 있는 화풍 6종은 사라져요.
          </>
        }
        confirmLabel="표지 없이 닫기"
        cancelLabel="계속 고르기"
        onConfirm={onClose}
        onCancel={() => setIsLeaveConfirmOpen(false)}
      />
    </div>
  );
}
