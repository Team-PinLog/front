import type { CollectionRecordItem } from './CollectionDetailView';

interface CollectionIndexRailProps {
  records: CollectionRecordItem[];
  activeIndex: number;
  /** 지금 목차 장을 보고 있는지. true면 맨 위 "목차" 탭이 활성으로 그려진다(418-39). */
  isTocActive: boolean;
  disabled: boolean;
  onSelect: (index: number) => void;
  /** 맨 위 "목차" 탭 클릭 — 첫 장(목차)으로 되돌아간다. */
  onSelectToc: () => void;
}

/**
 * 컬렉션 펼침면 오른쪽 가장자리에 물려 튀어나온 **세로 인덱스 탭**. 근거: Jira S15P11A705-246,
 * 418(다이어리 리디자인).
 *
 * 246/332에서는 민트·남색 알약 탭이었다. 418에서 화면 전체가 종이가 되면서 탭도 종이가 된다 —
 * 다이어리 옆구리에 붙인 크라프트 인덱스 라벨이고, 지금 펼친 장만 잉크가 진해진다.
 * 색은 415가 확정한 팔레트(크림·잉크·민트)에서 가져왔다.
 *
 * 418-39에서 **목차 탭이 돌아왔다.** 목차 장이 되살아나면서 그 장으로 곧장 되돌아갈 진입점이
 * 다시 필요해졌기 때문이다(332가 이 탭을 둔 것과 같은 이유다). 목차도 하나의 장이므로 record
 * 탭들과 같은 모양·같은 줄에 세운다.
 *
 * ⚠️ 높이는 펼침면과 같은 상한을 쓴다(CollectionSpreadPage와 같은 식). 항목이 많으면 레일 **안에서**
 * 스크롤되고, 펼침면 자체나 페이지는 자라지 않는다 — 418이 금지한 것은 페이지 스크롤이다.
 */

const TAB_BASE_CLASS =
  'flex flex-none items-center rounded-r-[4px] border-y border-r py-2 pl-4 pr-2 text-left transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 disabled:opacity-40';
const TAB_ACTIVE_CLASS =
  'border-[#cfd9d1] bg-[#dff0e4] text-[#2f6a4e] focus-visible:outline-[#3f7d5f]';
// 418-45: 기본 상태를 브랜드 네이비(pin-navy #042142)로 바꾼다. 글자는 paper-white라 대비가
// 충분하고(#042142 위 #FAF7F6 ≈ 16:1, WCAG AAA), 호버는 현행 문법 그대로 "한 단계 밝게"로 남긴다
// (알파 85%). 활성 상태는 지금처럼 색상 자체가 다른 민트라 세 상태가 서로 구분된다.
const TAB_IDLE_CLASS =
  'border-pin-navy bg-pin-navy text-paper-white hover:bg-pin-navy/85 focus-visible:outline-paper-white';

export function CollectionIndexRail({
  records,
  activeIndex,
  isTocActive,
  disabled,
  onSelect,
  onSelectToc,
}: CollectionIndexRailProps) {
  return (
    // 탭은 펼침면에 **닿되 물리지는 않는다**(-ml-1). 처음엔 12px을 물렸는데, 펼침면이 자기 열보다
    // 좁을 때(mx-auto)와 꽉 찰 때 물림량이 달라져 어떤 폭에서는 장소명 앞글자가 책 뒤로 잘렸다
    // (실렌더 확인 — 246이 겪었던 함정과 같은 것이다). 붙어 보이는 일은 왼쪽 모서리를 각지게
    // 두는 것(rounded-r만 준다)이 이미 하고 있다.
    // 418-41: `relative z-20`이 없으면 이 레일은 **위치 지정되지 않은** 요소라 형제 중 위치 지정된
    // 것들(펼침면의 z-10 상자, 그리고 오른쪽으로 14px 삐져나오는 뒤쪽 종이 2겹) 아래에 깔린다 —
    // 탭 왼쪽 끝과 장소명 앞글자가 종이 뒤로 들어가 잘린 것처럼 보였다(실렌더 확인).
    <div className="relative z-20 -ml-1 hidden max-h-[min(760px,calc(100dvh-88px))] w-[96px] flex-none flex-col gap-1 overflow-y-auto pt-14 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#4f9b78] lg:flex">
      <button
        type="button"
        onClick={onSelectToc}
        disabled={disabled}
        aria-current={isTocActive}
        title="목차"
        className={`${TAB_BASE_CLASS} ${isTocActive ? TAB_ACTIVE_CLASS : TAB_IDLE_CLASS}`}
      >
        <span className="min-w-0 flex-1 truncate text-[11px] font-bold">목차</span>
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
            <span className="min-w-0 flex-1 truncate text-[11px] font-bold">
              {record.place.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
