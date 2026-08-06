import { useEffect, useRef } from 'react';
import { useCoverJobQueue } from '@/contexts/useCoverJobQueue';
import { useCoverGeneration } from '../hooks/useCoverGeneration';
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
 */
export function CollectionCoverModal({ collection, onClose }: CollectionCoverModalProps) {
  const coverJobQueue = useCoverJobQueue();

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

  // 표지를 만들 길이 없을 때만 "표지 없이 닫기"를 연다 — 요청 자체가 실패했거나(서비스 장애),
  // 상한을 넘겨 그만 물은 경우다.
  const canLeaveWithoutCover = cover.error !== null || cover.isTimedOut;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pin-navy/40 p-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-lg bg-white p-6">
        <h2 className="flex-none text-sm font-bold text-pin-navy">
          &lsquo;{collection.title}&rsquo; 표지 만들기
        </h2>

        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <CoverStylePicker cover={cover} onRedraw={() => cover.start(collection)} />
        </div>

        {/* 표지를 만들 수 없는 상황(서비스 장애·상한 초과)에서의 유일한 탈출구. 이때는 표지 없는
            컬렉션이 남지만, 그건 우리가 고를 수 있는 선택지가 아니라 만들 그림 자체가 없는 것이다. */}
        {canLeaveWithoutCover && (
          <button
            type="button"
            onClick={onClose}
            className="mt-2 flex-none text-xs text-ink-gray underline"
          >
            표지 없이 닫기
          </button>
        )}

        {/* 318 수정: "나중에 하기"를 없앴다. 표지 없는 컬렉션을 남기면 나중에 표지를 붙이는
            별도 UI가 반드시 필요해진다 — 고르기 싫은 사용자에게는 무작위 한 장이 빈 표지보다
            낫다. 다만 이미지 서비스가 아예 응답하지 않는 상황에서는 나갈 길이 있어야 하므로,
            그때만 "표지 없이 닫기"가 나타난다(위).
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
    </div>
  );
}
