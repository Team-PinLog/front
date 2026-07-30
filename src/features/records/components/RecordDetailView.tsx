import { useState } from 'react';
import { ErrorState } from '@/shared/ui/ErrorState';
import { AddToCollectionButton } from '@/features/collections/components/AddToCollectionButton';
import { useRecordDetailQuery } from '../hooks/useRecordDetailQuery';
import { useAddRecordContextMutation } from '../hooks/useAddRecordContextMutation';
import { ContextCard } from './ContextCard';

const CONTEXT_BODY_MAX_LENGTH = 500;

interface RecordDetailViewProps {
  recordId: number;
}

/**
 * Record 상세: place·contexts·keywords 조회 + Context 추가.
 * 근거: Jira S15P11A705-137, docs/reference/08_API_명세.md 5.2·5.4.
 */
export function RecordDetailView({ recordId }: RecordDetailViewProps) {
  const [contextBody, setContextBody] = useState('');
  const detailQuery = useRecordDetailQuery(recordId);
  const addContextMutation = useAddRecordContextMutation(recordId);

  const handleAddContext = () => {
    const body = contextBody.trim();
    if (!body) {
      return;
    }
    addContextMutation.mutate(body, {
      onSuccess: () => setContextBody(''),
    });
  };

  if (detailQuery.isPending) {
    return <p className="p-8 text-sm text-ink-gray">불러오는 중…</p>;
  }

  if (detailQuery.isError) {
    // 08_API_명세 1.5: 타인 소유·존재하지 않는 Record 모두 404 RESOURCE_NOT_FOUND로 응답한다(소유 여부 은닉).
    const isNotFound = detailQuery.error.code === 'RESOURCE_NOT_FOUND';
    return (
      <div className="p-8">
        <ErrorState
          title={isNotFound ? '기록을 찾을 수 없어요' : '기록을 불러오지 못했어요'}
          description={
            isNotFound ? '삭제되었거나 접근 권한이 없는 기록이에요.' : '잠시 후 다시 시도해 주세요.'
          }
        />
      </div>
    );
  }

  const record = detailQuery.data;
  // contexts !== null로 소유 여부를 구분한다(privacy-rules.md 1장). 이 화면은 GET /records/{id}(본인 전용)만 다루므로
  // 항상 배열이지만, 타인 응답과 같은 DTO(RecordDetail)를 쓰는 만큼 문서의 표준 분기 방식을 그대로 따른다.
  const isOwner = record.contexts !== null;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-pin-navy">{record.place.name}</h1>
          <p className="text-sm font-semibold text-log-mint">{record.place.address}</p>
        </div>
        <AddToCollectionButton />
      </header>

      {record.keywords.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {record.keywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded-full bg-log-mint/10 px-3 py-1.5 text-xs font-bold text-log-mint"
            >
              {keyword}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-ink-gray-light">
          키워드는 AI가 분석 중이에요. 잠시 후 자동으로 채워집니다.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-bold tracking-[0.12em] text-log-mint">기록한 맥락</h2>
        {isOwner && record.contexts!.length === 0 && (
          <p className="text-xs text-ink-gray-light">아직 기록된 맥락이 없어요.</p>
        )}
        {isOwner &&
          record.contexts!.map((context) => (
            <ContextCard key={context.contextId} recordId={recordId} context={context} />
          ))}
      </section>

      <section className="flex flex-col gap-2">
        <label
          htmlFor="record-context-body"
          className="text-[11px] font-bold tracking-[0.12em] text-log-mint"
        >
          맥락 추가
        </label>
        <textarea
          id="record-context-body"
          value={contextBody}
          onChange={(event) => setContextBody(event.target.value)}
          maxLength={CONTEXT_BODY_MAX_LENGTH}
          placeholder="이 장소에서 새로 기억하고 싶은 맥락을 적어보세요"
          className="min-h-[120px] resize-none rounded-lg border border-pin-navy/15 bg-white p-3 text-sm leading-relaxed text-pin-navy outline-none placeholder:text-ink-gray-light focus:border-log-mint focus:ring-2 focus:ring-log-mint/20"
        />
        <p className="text-right text-[11px] text-ink-gray-light">
          {contextBody.length}/{CONTEXT_BODY_MAX_LENGTH}
        </p>

        {addContextMutation.isError && (
          <p className="text-xs text-red-600">{addContextMutation.error.message}</p>
        )}

        <button
          type="button"
          onClick={handleAddContext}
          disabled={!contextBody.trim() || addContextMutation.isPending}
          className="h-11 flex-none rounded-lg bg-log-mint text-sm font-bold text-pin-navy disabled:opacity-40"
        >
          {addContextMutation.isPending ? '저장 중…' : '저장'}
        </button>
      </section>
    </main>
  );
}
