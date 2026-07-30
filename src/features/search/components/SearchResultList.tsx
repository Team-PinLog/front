import type { UseMutationResult } from '@tanstack/react-query';
import type { ApiError } from '@/shared/http/types';
import { ErrorState } from '@/shared/ui/ErrorState';
import type { SearchRecordsResponse } from '../api/searchRecords';
import { SearchResultItem } from './SearchResultItem';

interface SearchResultListProps {
  searchMutation: UseMutationResult<SearchRecordsResponse, ApiError, string>;
}

/**
 * 검색 결과 영역: SearchInput 제출로 트리거되는 useSearchRecordsMutation 상태를 그대로 분기한다.
 * 근거: Jira S15P11A705-149, docs/reference/08_API_명세.md 6.1.
 * idle(미검색)·success+items:[](검색 결과 0건)·error(요청 실패)를 서로 다른 문구로 명확히 구분한다.
 */
export function SearchResultList({ searchMutation }: SearchResultListProps) {
  if (searchMutation.isIdle) {
    return <p className="p-8 text-center text-sm text-ink-gray-light">검색어를 입력하세요.</p>;
  }

  if (searchMutation.isPending) {
    return <p className="p-8 text-center text-sm text-ink-gray">검색 중…</p>;
  }

  if (searchMutation.isError) {
    return (
      <div className="p-8">
        <ErrorState title="검색하지 못했어요" description="잠시 후 다시 검색해 주세요." />
      </div>
    );
  }

  const { items } = searchMutation.data;

  if (items.length === 0) {
    return <p className="p-8 text-center text-sm text-ink-gray-light">검색 결과가 없습니다.</p>;
  }

  return (
    <section className="flex flex-col gap-3">
      {items.map((item) => (
        <SearchResultItem key={item.recordId} item={item} />
      ))}
    </section>
  );
}
