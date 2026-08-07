import { ContextStickyNote } from '@/shared/ui/ContextStickyNote';
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
 *
 * 디자인 개편: Context 원문을 회색 박스가 아니라 공용 ContextStickyNote(손글씨 포스트잇)로 그린다.
 * 앱의 다른 곳(Collection 펼친 화면·기록 상세)에서 Context 원문은 전부 이 포스트잇이고 홈만
 * 예외였다 — 같은 데이터는 같은 모양으로 보여야 사용자가 "내가 적어 둔 그 메모"로 알아본다.
 * 색·기울기·테이프 각도는 contextId 해시로 정해지므로 홈과 다른 화면에서 같은 Context가 같은
 * 모양으로 나온다.
 *
 * "장소 1/3" 번호 라벨은 뺐다. 검색 결과는 similarity 순이지만 그 값은 UI에 노출하지 않기로
 * 확정돼 있어(08_API_명세 6.1), 화면에 남은 번호는 순위도 순서도 뜻하지 않는 장식이었다.
 */
export function SearchResultGallery({ items, onSelectRecord }: SearchResultGalleryProps) {
  return (
    // 포스트잇이 카드 밖으로 살짝 기울어 나오므로(rotate + 테이프가 -top-3) overflow-y를 자르지
    // 않도록 세로 여유를 둔다. overflow-x-auto는 세로도 함께 자르기 때문에 생기는 문제다 —
    // docs/troubleshooting/2026-08-06-overflow-y-auto-clips-horizontally.md의 반대 방향 사례.
    <div className="flex gap-4 overflow-x-auto px-1 pb-6 pt-4">
      {/* pl-diary-card: 링 제본에서 뜯어낸 한 장. 제본은 왼쪽이다 — 뜯긴 구멍과 너덜너덜한
          왼쪽 변이 그 클래스에 있다. 모서리·여백도 그 클래스가 소유한다: Tailwind 유틸리티와
          같은 프로퍼티를 나눠 가지면 빌드 순서상 유틸리티가 이겨서 안 먹는다
          (index.css .shell-main에서 겪은 것과 같은 건). */}
      {items.map((item) => (
        <button
          key={item.recordId}
          type="button"
          onClick={() => onSelectRecord(item.recordId)}
          className="pl-diary-card flex w-72 flex-none flex-col gap-2 border border-line-card bg-snow-white text-left shadow-sm transition-transform hover:-translate-y-1"
        >
          <div>
            <p className="text-base font-bold text-pin-navy">{item.place.name}</p>
            <p className="text-xs text-ink-gray">{item.place.address}</p>
          </div>

          {item.keywords.length > 0 ? (
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
          ) : item.keywordStatus === 'PROCESSING' ? (
            <p className="text-xs text-ink-gray-light">
              AI가 키워드를 분석 중이에요. 잠시 후 자동으로 채워집니다
            </p>
          ) : (
            <p className="text-xs text-ink-gray-light">이 기록엔 키워드가 없어요</p>
          )}

          {/* editable을 주지 않는다 — 여기서는 읽기만 하고, 수정은 기록 상세에서 한다. */}
          <div className="mt-2">
            <ContextStickyNote
              contextId={item.matchedContext.contextId}
              body={item.matchedContext.body}
            />
          </div>
        </button>
      ))}
    </div>
  );
}
