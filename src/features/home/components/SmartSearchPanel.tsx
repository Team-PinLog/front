import { useState, type FormEvent } from 'react';
import { usePlaceRecordSheet } from '@/contexts/usePlaceRecordSheet';

interface SmartSearchPanelProps {
  onSubmit: (query: string) => void;
  isPending: boolean;
}

/**
 * 홈 히어로: 타이틀·서브카피·검색바·장소추가 버튼. 제출은 상위(HomePage)가 들고 있는
 * useSearchRecordsMutation으로 위임한다(props 계약은 그대로 유지).
 * 근거: Jira S15P11A705-306 첨부 디자인 이미지(유일한 목표 디자인 — 기존 mockup 문서와
 * 다르면 이 이미지를 따른다). "+장소추가" 버튼은 옛 HomePage의 우측 하단 고정
 * AddPlaceRecordButton(FAB) 로직을 그대로 옮겨온 것이다 — usePlaceRecordSheet().open을
 * 재사용하며, 히어로가 이미 PlaceRecordSheetProvider 트리 안에서 렌더되므로 Context를
 * 그대로 재사용할 수 있다. FAB는 중복 노출을 막기 위해 HomePage에서 제거했다.
 */
export function SmartSearchPanel({ onSubmit, isPending }: SmartSearchPanelProps) {
  const [query, setQuery] = useState('');
  const sheet = usePlaceRecordSheet();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-[32px] font-extrabold leading-tight text-pin-navy">
          장소를 맥락으로 기억하다
        </h1>
        <p className="mt-2 text-sm text-ink-gray">키워드가 아닌 맥락과 감정으로</p>
      </div>

      <div className="flex items-center gap-3">
        <form onSubmit={handleSubmit} className="relative flex-1">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink-gray-light"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.35-4.35" />
          </svg>

          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="비 오는 날 혼자 책 읽기 좋은 카페 찾아줘"
            aria-label="저장한 장소 검색"
            className="h-14 w-full rounded-full border border-pin-navy/15 bg-snow-white pl-12 pr-16 text-sm text-pin-navy outline-none placeholder:text-ink-gray-light focus:border-log-mint focus:ring-2 focus:ring-log-mint/20"
          />

          <button
            type="submit"
            disabled={!query.trim() || isPending}
            aria-label={isPending ? '검색 중' : '검색'}
            className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-pin-navy text-snow-white transition-colors enabled:hover:bg-log-mint disabled:cursor-not-allowed disabled:bg-pin-navy/90"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 17 17 7M7 7h10v10" />
            </svg>
          </button>
        </form>

        <button
          type="button"
          onClick={sheet.open}
          className="flex h-14 flex-none items-center gap-2 rounded-2xl border border-pin-navy/15 bg-snow-white px-5 text-sm font-bold text-pin-navy transition-colors hover:border-log-mint hover:text-log-mint"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          장소추가
        </button>
      </div>
    </section>
  );
}
