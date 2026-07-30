import { useState, type FormEvent } from 'react';

interface SmartSearchPanelProps {
  onSubmit: (query: string) => void;
  isPending: boolean;
}

/**
 * 홈 상단 스마트 검색 패널: 라벨·설명·입력창. 제출은 상위(HomePage)가 들고 있는
 * useSearchRecordsMutation으로 위임한다(SearchInput.tsx와 동일한 props 계약).
 * 근거: Jira S15P11A705-165, mockup(PinLog.responsive.dc.html) 1046~1057행.
 * 추천 검색어 칩(quickChips)은 이 화면에 없다 — mockup 렌더 루프 본문이 비어 있고 연결된
 * 데이터도 검색과 무관한 더미(리테일 대시보드 잔재)라 실존하는 기능이 아니다.
 */
export function SmartSearchPanel({ onSubmit, isPending }: SmartSearchPanelProps) {
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
    <section className="flex flex-col gap-4 rounded-2xl border border-pin-navy/10 bg-white p-6">
      <div>
        <h2 className="text-base font-bold text-pin-navy">스마트 검색</h2>
        <p className="text-sm text-ink-gray">저장한 장소를 자유롭게 검색해보세요.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="비 오는 날 가기 좋은 카페가 어디지?"
          aria-label="저장한 장소 검색"
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
    </section>
  );
}
