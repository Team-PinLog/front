import { useState } from 'react';
import { useCreateCollectionMutation } from '@/features/collections/hooks/useCreateCollectionMutation';
import { useAddRecordsToCollectionMutation } from '@/features/collections/hooks/useAddRecordsToCollectionMutation';
import type { CreateRecordResponse } from '../api/createRecord';

// 178: "새로 만든 컬렉션"과 "기존 컬렉션에 추가"는 사용자에게 다른 의미라 배열은 섞지 않되,
// 성공/실패를 다루는 모양(shape)은 이 인터페이스로 공유한다.
export interface CollectionOutcome {
  title: string;
  status: 'success' | 'error';
}

// "+ 컬렉션 생성"으로 새로 만든 Collection의 최초 생성 결과 — 제목별 성공/실패.
export type CollectionCreationOutcome = CollectionOutcome;

// 168: 저장 시 함께 선택한 기존 Collection에 추가한 최초 결과 — 재시도 시 collectionId가 필요하다.
export interface ExistingCollectionAddOutcome extends CollectionOutcome {
  collectionId: number;
}

interface TrackedOutcome {
  id: number;
  title: string;
  status: 'success' | 'error' | 'pending';
}

interface PlaceRecordResultProps {
  data: CreateRecordResponse;
  collectionCreationResults: CollectionCreationOutcome[];
  existingCollectionAddResults: ExistingCollectionAddOutcome[];
  onClose: () => void;
  /**
   * 327: 실패했던 컬렉션 생성을 이 화면에서 다시 시도해 성공한 경우. 호출부가 표지 단계를 띄운다 —
   * 처음에 성공했을 때와 결과가 같아야 하고, 아니면 재시도로 만든 컬렉션만 표지 없이 남는다.
   */
  onCollectionCreated?: (collection: { collectionId: number; title: string }) => void;
}

function summaryMessage(nounPhrase: string, titles: string[]): string {
  return titles.length === 1
    ? `${titles[0]}${nounPhrase}`
    : `${titles.length}개 컬렉션${nounPhrase}`;
}

interface CollectionOutcomeSectionProps {
  heading: string;
  successNounPhrase: string;
  failureLabel: string;
  items: TrackedOutcome[];
  onRetry: (id: number) => void;
}

// 178: "새로 만든 컬렉션"·"기존 컬렉션 추가" 두 블록이 성공 요약·실패 안내·재시도 버튼을 같은 방식으로
// 보여주되, 헤딩으로 어느 쪽인지 구분한다 — 배열 자체는 합치지 않는다(사용자에게 다른 의미).
function CollectionOutcomeSection({
  heading,
  successNounPhrase,
  failureLabel,
  items,
  onRetry,
}: CollectionOutcomeSectionProps) {
  if (items.length === 0) {
    return null;
  }

  const succeededTitles = items
    .filter((item) => item.status === 'success')
    .map((item) => item.title);
  const failedItems = items.filter((item) => item.status === 'error');
  const pendingItems = items.filter((item) => item.status === 'pending');

  return (
    <div className="mt-4">
      <p className="text-[13px] font-bold tracking-[0.08em] text-[#a29d95]">{heading}</p>

      {succeededTitles.length > 0 && (
        <p className="mt-1.5 text-[15px] font-medium text-[#8a857e]">
          {summaryMessage(successNounPhrase, succeededTitles)}
        </p>
      )}

      {failedItems.length > 0 && (
        <div className="mt-1.5 flex flex-col gap-1.5">
          {failedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600"
            >
              <span>
                {item.title} {failureLabel}
              </span>
              <button
                type="button"
                onClick={() => onRetry(item.id)}
                className="flex-none font-bold text-red-700 underline"
              >
                다시 시도
              </button>
            </div>
          ))}
        </div>
      )}

      {pendingItems.length > 0 && (
        <p className="mt-1.5 text-[13px] text-[#a29d95]">
          {pendingItems.map((item) => item.title).join(', ')} 다시 시도하는 중…
        </p>
      )}
    </div>
  );
}

// keywords: []는 AI 미완료 상태의 정상 응답이다(architecture.md 5장) — 오류가 아니라 중립 안내로 처리한다.
// mockup: 다운로드 "장소 기록 완료 화면.dc.html"(S15P11A705-323 디자인 개정). 새로 만든 Record인지
// 기존 Record에 맥락만 더한 것인지에 따라 헤딩 문구가 달라진다(resultLabel) — mockup 데모는 후자
// 상태 하나만 보여주지만, 실제로는 이 분기를 그대로 옮긴 것이다.
export function PlaceRecordResult({
  data,
  collectionCreationResults,
  existingCollectionAddResults,
  onClose,
  onCollectionCreated,
}: PlaceRecordResultProps) {
  const [creationItems, setCreationItems] = useState<TrackedOutcome[]>(() =>
    collectionCreationResults.map((result, index) => ({
      id: index,
      title: result.title,
      status: result.status,
    })),
  );
  const [addItems, setAddItems] = useState<(TrackedOutcome & { collectionId: number })[]>(() =>
    existingCollectionAddResults.map((result, index) => ({
      id: index,
      collectionId: result.collectionId,
      title: result.title,
      status: result.status,
    })),
  );
  const createCollectionMutation = useCreateCollectionMutation();
  const addToCollectionMutation = useAddRecordsToCollectionMutation();

  const savedContext = data.contexts.at(-1);
  const resultLabel =
    data.result === 'RECORD_CREATED' ? '새 기록으로 저장했어요' : '기존 기록에 맥락을 추가했어요';

  const handleRetryCreation = (id: number) => {
    const target = creationItems.find((item) => item.id === id);
    if (!target) {
      return;
    }
    setCreationItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'pending' } : item)),
    );
    createCollectionMutation.mutate(
      { title: target.title, recordIds: [data.recordId] },
      {
        onSuccess: (created) => {
          setCreationItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, status: 'success' } : item)),
          );
          onCollectionCreated?.({ collectionId: created.collectionId, title: created.title });
        },
        onError: () => {
          setCreationItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, status: 'error' } : item)),
          );
        },
      },
    );
  };

  const handleRetryAdd = (id: number) => {
    const target = addItems.find((item) => item.id === id);
    if (!target) {
      return;
    }
    setAddItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'pending' } : item)),
    );
    addToCollectionMutation.mutate(
      { collectionId: target.collectionId, recordIds: [data.recordId] },
      {
        onSuccess: () => {
          setAddItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, status: 'success' } : item)),
          );
        },
        onError: () => {
          setAddItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, status: 'error' } : item)),
          );
        },
      },
    );
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        onClick={onClose}
        aria-label="저장 결과 닫기"
        className="absolute right-6 top-6 grid h-11 w-11 place-items-center rounded-full bg-[#efece8] text-lg text-[#6f6a63] transition-colors hover:bg-[#e2ddd6] sm:right-[26px] sm:top-[26px]"
      >
        ✕
      </button>

      <div className="flex-none pr-14">
        <p className="text-[13px] font-extrabold tracking-[0.14em] text-[#4f9b78]">SAVED</p>
        <h1 className="mt-2 text-[26px] font-extrabold leading-[1.3] tracking-[-0.02em] text-[#2c2a28] sm:text-[32px]">
          {resultLabel}
        </h1>
      </div>

      <div className="place-scroll mt-7 flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
        <div className="flex-none">
          <h2 className="text-[28px] font-extrabold tracking-[-0.02em] text-[#2c2a28] sm:text-[34px]">
            {data.place.name}
          </h2>
          <p className="mt-2 text-[17px] font-bold text-[#4f9b78]">{data.place.address}</p>
        </div>

        <div className="mt-5 flex-none">
          {data.keywords.length > 0 ? (
            <div className="flex flex-wrap gap-2.5">
              {data.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full bg-[#dcecdf] px-4 py-2 text-[15px] font-bold text-[#3f7d5f]"
                >
                  #{keyword}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[15px] font-medium text-[#a29d95]">
              키워드는 잠시 후 자동으로 채워져요.
            </p>
          )}
        </div>

        {savedContext && (
          <div className="relative mt-6 w-full max-w-[360px] pt-4">
            <div
              className="pointer-events-none absolute left-1/2 top-0 h-[26px] w-[70px] -translate-x-1/2 rotate-[-5deg] border border-[rgba(190,175,95,0.35)] bg-[rgba(214,200,120,0.42)] shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
              aria-hidden="true"
            />
            <div
              className="min-h-[150px] bg-gradient-to-br from-[#faf0a0] to-[#f4e88a] px-6 py-6 shadow-[5px_8px_16px_-8px_rgba(90,80,30,0.4)]"
              style={{ transform: 'rotate(-1.2deg)' }}
            >
              <p className="whitespace-pre-wrap font-[Gaegu] text-xl leading-[1.5] text-[#3f3a2a]">
                {savedContext.body}
              </p>
            </div>
          </div>
        )}

        <CollectionOutcomeSection
          heading="기존 컬렉션에 추가"
          successNounPhrase="에 추가되었습니다"
          failureLabel="컬렉션 추가에 실패했습니다"
          items={addItems}
          onRetry={handleRetryAdd}
        />

        <CollectionOutcomeSection
          heading="새로 만든 컬렉션"
          successNounPhrase="을 새로 만들었습니다"
          failureLabel="컬렉션 생성에 실패했습니다"
          items={creationItems}
          onRetry={handleRetryCreation}
        />
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-6 h-[60px] flex-none rounded-[14px] bg-[#5faa84] text-[19px] font-extrabold tracking-[-0.01em] text-white shadow-[0_8px_18px_-8px_rgba(79,155,120,0.7)]"
      >
        확인
      </button>
    </div>
  );
}
