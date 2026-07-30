import type { CreateRecordResponse } from '../api/createRecord';

// 168: 저장 시 함께 선택한 Collection에 담은 결과 요약 — succeededTitles 순서는 선택 순서를 따른다.
export interface CollectionAddResult {
  selectedCount: number;
  succeededTitles: string[];
  failedCount: number;
}

interface PlaceRecordResultProps {
  data: CreateRecordResponse;
  collectionAddResult: CollectionAddResult;
  onClose: () => void;
}

function collectionResultMessage(result: CollectionAddResult): string {
  const { selectedCount, succeededTitles, failedCount } = result;

  if (selectedCount === 0) {
    return '컬렉션 없이 개인 장소 기록으로 저장되었습니다';
  }

  const succeededCount = succeededTitles.length;
  if (succeededCount === 0) {
    return '컬렉션 추가에 실패했습니다';
  }

  const base =
    succeededCount === 1
      ? `${succeededTitles[0]}에 추가되었습니다`
      : `${succeededCount}개 컬렉션에 추가되었습니다`;

  return failedCount > 0 ? `${base} (${failedCount}개 실패)` : base;
}

// keywords: []는 AI 미완료 상태의 정상 응답이다(architecture.md 5장) — 오류가 아니라 "잠시 후 채워짐" 안내로 처리한다.
export function PlaceRecordResult({ data, collectionAddResult, onClose }: PlaceRecordResultProps) {
  const savedContext = data.contexts.at(-1);
  const resultLabel =
    data.result === 'RECORD_CREATED' ? '새 기록으로 저장했어요' : '기존 기록에 맥락을 추가했어요';

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
      <p className="mt-2 text-sm text-ink-gray">{collectionResultMessage(collectionAddResult)}</p>

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
