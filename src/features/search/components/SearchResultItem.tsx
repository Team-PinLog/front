import { useNavigate } from '@tanstack/react-router';
import type { SearchResultItem as SearchResultItemType } from '../api/searchRecords';

const CONTEXT_PREVIEW_MAX_LENGTH = 80;

interface SearchResultItemProps {
  item: SearchResultItemType;
}

function toPreview(body: string): string {
  if (body.length <= CONTEXT_PREVIEW_MAX_LENGTH) {
    return body;
  }
  return `${body.slice(0, CONTEXT_PREVIEW_MAX_LENGTH)}…`;
}

/**
 * 검색 결과 한 건: place·매칭 Context 미리보기·keywords. 클릭 시 Record 상세로 이동한다.
 * 근거: Jira S15P11A705-149, docs/reference/08_API_명세.md 6.1.
 * similarity는 응답에 있지만 정렬 근거용일 뿐 UI에는 노출하지 않는다.
 */
export function SearchResultItem({ item }: SearchResultItemProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() =>
        void navigate({ to: '/records/$recordId', params: { recordId: item.recordId } })
      }
      className="flex flex-col gap-2 rounded-lg border border-line-card bg-white p-4 text-left"
    >
      <div>
        <p className="text-base font-bold text-pin-navy">{item.place.name}</p>
        <p className="text-xs font-semibold text-log-mint">{item.place.address}</p>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-gray">
        {toPreview(item.matchedContext.body)}
      </p>

      {item.keywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {item.keywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded-full bg-log-mint/10 px-3 py-1.5 text-xs font-bold text-log-mint"
            >
              {keyword}
            </span>
          ))}
        </div>
      )}

      <p className="text-[11px] text-ink-gray-light">{item.createdAt}</p>
    </button>
  );
}
