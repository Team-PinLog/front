import { useState, type FormEvent } from 'react';

interface SearchInputProps {
  onSubmit: (query: string) => void;
  isPending: boolean;
}

/**
 * AI 자연어 검색 입력: 단일 텍스트 필드 + 제출.
 * 근거: Jira S15P11A705-149, docs/reference/08_API_명세.md 6.1.
 * 필드 하나·검증 없음이라 RHF 없이 plain useState로 충분하다.
 */
export function SearchInput({ onSubmit, isPending }: SearchInputProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="예: 비 오는 날 친구와 가려고 저장한 카페"
        className="h-11 flex-1 rounded-lg border border-pin-navy/15 bg-white px-3 text-sm text-pin-navy outline-none placeholder:text-ink-gray-light focus:border-log-mint focus:ring-2 focus:ring-log-mint/20"
      />
      <button
        type="submit"
        disabled={!query.trim() || isPending}
        className="h-11 flex-none rounded-lg bg-log-mint px-4 text-sm font-bold text-pin-navy disabled:opacity-40"
      >
        {isPending ? '검색 중…' : '검색'}
      </button>
    </form>
  );
}
