import type { CollectionRecordItem } from './CollectionDetailView';

interface CollectionIndexRailProps {
  records: CollectionRecordItem[];
  activeIndex: number;
  disabled: boolean;
  onSelect: (index: number) => void;
}

/**
 * 컬렉션 펼침면 오른쪽 가장자리에 물려 튀어나온 **세로 인덱스 탭**. 근거: Jira S15P11A705-246,
 * 418(다이어리 리디자인).
 *
 * 246/332에서는 민트·남색 알약 탭이었다. 418에서 화면 전체가 종이가 되면서 탭도 종이가 된다 —
 * 다이어리 옆구리에 붙인 크라프트 인덱스 라벨이고, 지금 펼친 장만 잉크가 진해진다.
 * 색은 415가 확정한 팔레트(크림·잉크·민트)에서 가져왔다.
 *
 * 418에서 **목차 탭이 사라졌다.** 목차 장(속표지)이 없어졌기 때문이다 — 시안의 왼쪽 면이 곧
 * 컬렉션의 표제 + 전체 지도라, 그 역할을 하던 별도의 첫 장이 필요 없다. 이제 이 레일이 "이 책에
 * 어떤 장이 있는가"를 보여주는 유일한 목록이다.
 *
 * ⚠️ 높이는 펼침면과 같은 상한을 쓴다(CollectionSpreadPage와 같은 식). 항목이 많으면 레일 **안에서**
 * 스크롤되고, 펼침면 자체나 페이지는 자라지 않는다 — 418이 금지한 것은 페이지 스크롤이다.
 */

const TAB_BASE_CLASS =
  'flex flex-none items-center rounded-r-[4px] border-y border-r py-2 pl-4 pr-2 text-left transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 disabled:opacity-40';
const TAB_ACTIVE_CLASS =
  'border-[#cfd9d1] bg-[#dff0e4] text-[#2f6a4e] focus-visible:outline-[#3f7d5f]';
const TAB_IDLE_CLASS =
  'border-[#e4ded3] bg-[#f7f3ec] text-[#8a857e] hover:bg-[#efe9df] hover:text-[#5c574f] focus-visible:outline-[#4f9b78]';

export function CollectionIndexRail({
  records,
  activeIndex,
  disabled,
  onSelect,
}: CollectionIndexRailProps) {
  return (
    // 탭은 펼침면에 **닿되 물리지는 않는다**(-ml-1). 처음엔 12px을 물렸는데, 펼침면이 자기 열보다
    // 좁을 때(mx-auto)와 꽉 찰 때 물림량이 달라져 어떤 폭에서는 장소명 앞글자가 책 뒤로 잘렸다
    // (실렌더 확인 — 246이 겪었던 함정과 같은 것이다). 붙어 보이는 일은 왼쪽 모서리를 각지게
    // 두는 것(rounded-r만 준다)이 이미 하고 있다.
    <div className="-ml-1 hidden max-h-[min(760px,calc(100dvh-88px))] w-[96px] flex-none flex-col gap-1 overflow-y-auto pt-14 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#4f9b78] lg:flex">
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
