import { useSearchRecordsMutation } from '@/features/search/hooks/useSearchRecordsMutation';
import { SearchInput } from '@/features/search/components/SearchInput';
import { SearchResultList } from '@/features/search/components/SearchResultList';

/**
 * AI 자연어 검색 화면: 입력 제출 → 결과 리스트. 지도는 이번 티켓 범위 밖이다.
 * 근거: Jira S15P11A705-149.
 * SearchInput·SearchResultList가 형제 컴포넌트로 같은 mutation 상태(idle/pending/error/success)를
 * 공유해야 해서 useSearchRecordsMutation은 여기서 한 번만 호출하고 아래로 내려준다.
 */
export function SearchPage() {
  const searchMutation = useSearchRecordsMutation();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-extrabold text-pin-navy">검색</h1>
      <SearchInput
        onSubmit={(query) => searchMutation.mutate(query)}
        isPending={searchMutation.isPending}
      />
      <SearchResultList searchMutation={searchMutation} />
    </main>
  );
}
