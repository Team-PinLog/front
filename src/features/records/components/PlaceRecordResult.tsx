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
    <div className="mt-3">
      <p className="text-[11px] font-bold tracking-[0.08em] text-ink-gray-light">{heading}</p>

      {succeededTitles.length > 0 && (
        <p className="mt-1 text-sm text-ink-gray">
          {summaryMessage(successNounPhrase, succeededTitles)}
        </p>
      )}

      {failedItems.length > 0 && (
        <div className="mt-1 flex flex-col gap-1.5">
          {failedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600"
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
        <p className="mt-1 text-xs text-ink-gray-light">
          {pendingItems.map((item) => item.title).join(', ')} 다시 시도하는 중…
        </p>
      )}
    </div>
  );
}

// keywords: []는 AI 미완료 상태의 정상 응답이다(architecture.md 5장) — 오류가 아니라 "잠시 후 채워짐" 안내로 처리한다.
export function PlaceRecordResult({
  data,
  collectionCreationResults,
  existingCollectionAddResults,
  onClose,
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
        onSuccess: () => {
          setCreationItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, status: 'success' } : item)),
          );
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
    <div className="relative flex flex-1 flex-col overflow-hidden p-8">
      <button
        type="button"
        onClick={onClose}
        aria-label="저장 결과 닫기"
        className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-pin-navy/10 text-pin-navy"
      >
        ×
      </button>

      <p className="text-sm font-bold tracking-[0.06em] text-log-mint">{resultLabel}</p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-pin-navy">
        {data.place.name}
      </h2>
      <p className="text-base font-semibold text-log-mint">{data.place.address}</p>

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

      {data.keywords.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {data.keywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded-full bg-log-mint/10 px-3 py-1.5 text-xs font-bold text-log-mint"
            >
              {keyword}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-xs text-ink-gray-light">
          키워드는 AI가 분석 중이에요. 잠시 후 자동으로 채워집니다.
        </p>
      )}

      {savedContext && (
        <div className="mt-auto whitespace-pre-wrap rounded-lg border border-line-card bg-white p-4 text-sm leading-relaxed text-ink-gray">
          {savedContext.body}
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="mt-4 h-11 flex-none rounded-lg bg-pin-navy text-sm font-bold text-white"
      >
        확인
      </button>
    </div>
  );
}
