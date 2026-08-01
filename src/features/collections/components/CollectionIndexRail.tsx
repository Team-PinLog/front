import type { CollectionRecordItem } from './CollectionDetailView';

interface CollectionIndexRailProps {
  records: CollectionRecordItem[];
  activeIndex: number;
  disabled: boolean;
  onSelect: (index: number) => void;
}

/**
 * Collection 상세(플립북) 우측에 붙는 세로 인덱스 탭 레일. 근거: Jira S15P11A705-246,
 * 목업 book-index-panel/book-index-scroll(mockup/index.html 262-271행, 2876-2895행) —
 * record마다 세로로 쌓인 탭을 두고 클릭 시 해당 스프레드로 바로 이동한다.
 * 목업은 이 레일을 책 바깥쪽에 절대 위치(left:100%)로 붙이고 드래그 스크롤·자석(hover proximity)
 * 효과까지 구현하지만, SpreadFadeIn(CollectionDetailView.tsx 26-27행)과 같은 판단으로 그 물리 효과는
 * 가져오지 않고 flex 형제 요소 + 표준 overflow-y-auto로만 구현한다 — 반응형 레이아웃에서 절대 위치는
 * 뷰포트 폭에 따라 잘리거나 겹칠 수 있어서다.
 * CollectionToc(같은 파일의 전체 목차 패널)와 같은 목록을 동시에 보여주면 중복이라, 호출부가 목차가
 * 열려 있는 동안은 이 컴포넌트를 아예 렌더링하지 않는다.
 */
export function CollectionIndexRail({
  records,
  activeIndex,
  disabled,
  onSelect,
}: CollectionIndexRailProps) {
  return (
    <div className="hidden w-28 flex-none flex-col gap-1.5 overflow-y-auto pr-1 md:flex md:max-h-[520px]">
      {records.map((record, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            key={record.recordId}
            type="button"
            onClick={() => onSelect(index)}
            disabled={disabled}
            aria-current={isActive}
            title={record.place.name}
            className={`flex flex-none items-center gap-1.5 rounded-r-lg border-y border-r px-2.5 py-2 text-left transition-colors disabled:opacity-40 ${
              isActive
                ? 'border-log-mint bg-log-mint text-pin-navy'
                : 'border-line-card bg-paper-white text-ink-gray hover:border-log-mint/40 hover:text-log-mint'
            }`}
          >
            <span
              className={`flex-none text-[10px] font-bold ${isActive ? 'text-pin-navy' : 'text-log-mint'}`}
            >
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-semibold">
              {record.place.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
