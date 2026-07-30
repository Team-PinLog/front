import type { SearchResultItem } from '@/features/search/api/searchRecords';

interface SearchResultGalleryProps {
  items: SearchResultItem[];
  onSelectRecord: (recordId: number) => void;
}

/**
 * 스마트 검색 결과 갤러리: 가로 스크롤 카드 목록.
 * 근거: Jira S15P11A705-165, mockup(PinLog.responsive.dc.html) home-coverflow(1063~1104행).
 * 목업은 3D coverflow(카드 겹침) 효과를 쓰지만, 이번 범위는 가로 스크롤 + 카드 형태로 충분하다고
 * 명시돼 있어 완전한 3D 구현은 하지 않았다.
 * 검색 응답(08_API_명세 6.1)의 matchedContext는 Record당 정확히 1개뿐이라, 카드 하나에
 * 포스트잇은 항상 1개만 그린다(목업의 "최대 3개" 가정과 달리 API가 여러 개를 주지 않는다).
 * 카드 클릭은 라우트 이동(SearchResultItem.tsx의 149 패턴)이 아니라 RecordDetailOverlay를
 * 여는 로컬 상태 콜백으로 연결한다 — 홈에서는 페이지 이동 없이 모달로 상세를 본다.
 */
export function SearchResultGallery({ items, onSelectRecord }: SearchResultGalleryProps) {
  const total = items.length;

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {items.map((item, index) => (
        <button
          key={item.recordId}
          type="button"
          onClick={() => onSelectRecord(item.recordId)}
          className="flex w-72 flex-none flex-col gap-3 rounded-2xl border border-line-card bg-white p-5 text-left shadow-sm transition-transform hover:-translate-y-1"
        >
          <p className="text-[11px] font-bold tracking-[0.12em] text-log-mint">
            장소 {index + 1}/{total}
          </p>

          <div>
            <p className="text-base font-bold text-pin-navy">{item.place.name}</p>
            <p className="text-xs font-semibold text-log-mint">{item.place.address}</p>
          </div>

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

          <div className="rounded-lg border border-pin-navy/10 bg-paper-white p-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-gray">
              {item.matchedContext.body}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
