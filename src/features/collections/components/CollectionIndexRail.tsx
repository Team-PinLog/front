import type { CollectionRecordItem } from './CollectionDetailView';

interface CollectionIndexRailProps {
  records: CollectionRecordItem[];
  activeIndex: number;
  /** 지금 목차 장(첫 장)을 보고 있는지. true면 맨 위 "목차" 탭이 활성으로 그려진다. */
  isTocActive: boolean;
  disabled: boolean;
  onSelect: (index: number) => void;
  /** 맨 위 "목차" 탭 클릭 — 첫 장(목차)으로 되돌아간다. */
  onSelectToc: () => void;
}

// 탭 공통 모양. 활성/비활성만 다르고 나머지는 같다.
const TAB_BASE_CLASS =
  'flex flex-none items-center rounded-r-lg border-y border-r py-2 pl-5 pr-2 text-left shadow-[3px_3px_8px_-3px_rgba(4,33,66,0.22)] transition-colors disabled:opacity-40';
const TAB_ACTIVE_CLASS = 'border-log-mint bg-log-mint text-paper-white';
const TAB_IDLE_CLASS =
  'border-line-card bg-snow-white text-ink-gray hover:border-log-mint/40 hover:text-log-mint';
// 332 디자인 피드백 2번: "목차" 탭은 선택되지 않은 상태에서도 record 탭들과 구분돼야 한다 —
// 같은 회색이면 장소명 하나로 오인된다. 옅은 알파 면은 충분히 눈에 띄지 않아(2차 피드백) 브랜드
// 남색 단색으로 칠한다. 활성 색(민트)과는 색상 자체가 달라 "지금 이 장"이라는 신호는 그대로 남는다.
const TOC_TAB_IDLE_CLASS = 'border-pin-navy bg-pin-navy text-paper-white hover:bg-pin-navy/85';

/**
 * Collection 상세(플립북) 우측에 붙는 세로 인덱스 탭 레일. 근거: Jira S15P11A705-246,
 * 목업 book-index-panel/book-index-scroll(mockup/index.html 262-271행, 2876-2895행) —
 * record마다 세로로 쌓인 탭을 두고 클릭 시 해당 스프레드로 바로 이동한다.
 * 목업은 이 레일을 책 바깥쪽에 절대 위치(left:100%)로 붙이고 드래그 스크롤·자석(hover proximity)
 * 효과까지 구현하지만, SpreadFadeIn(CollectionDetailView.tsx 26-27행)과 같은 판단으로 그 물리 효과는
 * 가져오지 않고 flex 형제 요소 + 표준 overflow-y-auto로만 구현한다 — 반응형 레이아웃에서 절대 위치는
 * 뷰포트 폭에 따라 잘리거나 겹칠 수 있어서다.
 * 332 시안은 이 레일이 책 옆에 떨어져 있지 않고 "책 오른쪽 가장자리에 물려 튀어나온 탭"이다 —
 * 절대 위치 대신 호출부에서 책을 z-10으로 올려 탭의 왼쪽 끝이 책 뒤로 들어가게 만든다.
 * ⚠️ 겹치는 양을 정할 때 책 표지가 페이지보다 8px 크다는 것(CollectionDetailView의 -inset-2)을
 * 반드시 함께 본다. 첫 구현은 여기에 -ml-3(12px)까지 더해 총 20px이 가려졌는데, 탭의 왼쪽
 * 패딩(16px)보다 커서 장소명 글자가 책 뒤로 잘려 들어갔다(디자인 피드백 1번). 이제 음수 마진 없이
 * 표지 턱 8px만 겹치고, 왼쪽 패딩을 pl-5(20px)로 둬 글자가 항상 표지 바깥에서 시작하게 한다.
 *
 * 332 디자인 피드백 2번: 폭을 w-28(112px)에서 w-20(80px)으로 줄이고, 맨 위에 "목차" 탭을 더했다 —
 * 하단 목차 버튼을 없애면서(페이지 클릭으로 이동) 목차로 곧장 돌아갈 진입점이 이 레일밖에 남지
 * 않았기 때문이다. 목차도 하나의 장이므로 record 탭들과 같은 모양·같은 줄에 세운다.
 */
export function CollectionIndexRail({
  records,
  activeIndex,
  isTocActive,
  disabled,
  onSelect,
  onSelectToc,
}: CollectionIndexRailProps) {
  return (
    <div className="hidden w-20 flex-none flex-col gap-1 overflow-y-auto pt-12 md:flex md:max-h-[600px] xl:max-h-[720px]">
      <button
        type="button"
        onClick={onSelectToc}
        disabled={disabled}
        aria-current={isTocActive}
        title="목차"
        className={`${TAB_BASE_CLASS} ${isTocActive ? TAB_ACTIVE_CLASS : TOC_TAB_IDLE_CLASS}`}
      >
        <span className="min-w-0 flex-1 truncate text-xs font-bold">목차</span>
      </button>

      {records.map((record, index) => {
        const isActive = !isTocActive && index === activeIndex;
        return (
          <button
            key={record.recordId}
            type="button"
            onClick={() => onSelect(index)}
            disabled={disabled}
            aria-current={isActive}
            title={record.place.name}
            className={`${TAB_BASE_CLASS} ${isActive ? TAB_ACTIVE_CLASS : TAB_IDLE_CLASS}`}
          >
            <span className="min-w-0 flex-1 truncate text-xs font-bold">{record.place.name}</span>
          </button>
        );
      })}
    </div>
  );
}
