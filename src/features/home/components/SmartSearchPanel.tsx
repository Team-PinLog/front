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

      {/* 377-E: 검색창 가로 축소(사용자 지시). 이전에는 히어로 폭을 꽉 채워(flex-1) 지도가 그만큼
          가려졌고, 옆의 버튼도 같은 높이라 덩어리가 컸다. 폭에 상한을 두고 버튼을 줄여 히어로가
          배경(지도·지역 뷰)을 덜 덮게 한다. */}
      <div className="flex items-center gap-2.5">
        <form onSubmit={handleSubmit} className="relative w-full max-w-[26rem]">
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
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-gray-light"
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
            className="h-12 w-full rounded-full border border-pin-navy/15 bg-snow-white pl-11 pr-14 text-sm text-pin-navy outline-none placeholder:text-ink-gray-light focus:border-log-mint focus:ring-2 focus:ring-log-mint/20"
          />

          <button
            type="submit"
            disabled={!query.trim() || isPending}
            aria-label={isPending ? '검색 중' : '검색'}
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-pin-navy text-snow-white transition-colors enabled:hover:bg-log-mint disabled:cursor-not-allowed disabled:bg-pin-navy/90"
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

        {/* 377-E: 크기 축소 + 라벨 "장소 저장" + **북마크 아이콘**.
            ⚠️ 목업 v2는 이 자리에 핀 아이콘을 제안했지만 사용자가 북마크로 지정했다 — 핀이 아니다.
            핀은 "지도 위의 장소"를 뜻하는 기호로 이미 쓰고 있어, 저장 동작까지 핀으로 두면 같은
            기호가 두 가지를 뜻하게 된다. */}
        <button
          type="button"
          onClick={sheet.open}
          className="flex h-12 flex-none items-center gap-1.5 rounded-xl border border-pin-navy/15 bg-snow-white px-3.5 text-[13px] font-bold text-pin-navy transition-colors hover:border-log-mint hover:text-log-mint"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1Z" />
          </svg>
          장소 저장
        </button>
      </div>
    </section>
  );
}
