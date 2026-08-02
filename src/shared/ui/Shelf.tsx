import type { ReactNode } from 'react';
import { getSpineColor, getSpineHeight, getSpineWidth } from '@/shared/lib/shelfSpine';

/**
 * 목업(mockup/PinLog.responsive.dc.html)의 책장(cabinet-shell) 비주얼을 옮긴 공통 프리미티브.
 * 근거: Jira S15P11A705-169/250. MyShelfList·FollowedShelfCard가 공유한다.
 * 250: LibraryPage가 "나의 책장·팔로우한 책장"을 캐비닛 하나 + 3열(ShelfColumnGrid/ShelfColumn)로
 * 합쳤다. ShelfBoard는 더 이상 캐비닛 맨 아래에 한 번만 두지 않는다 — ShelfTier가 행(row)마다 선반을
 * 반복해서 깐다(chunkIntoShelfRows로 SHELF_ROW_SIZE개씩 자른 뒤 ShelfTier로 감싸는 게 표준 패턴).
 */

interface ShelfCabinetProps {
  headerTitle: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function ShelfCabinet({ headerTitle, headerRight, children }: ShelfCabinetProps) {
  return (
    <div className="overflow-hidden rounded-[10px] border-[8px] border-[#172742] bg-[#101d35] shadow-[0_18px_38px_rgba(4,18,38,.3)]">
      <div className="relative flex h-[46px] flex-none items-center justify-center border-b-[7px] border-[#2b3d5b] bg-gradient-to-b from-[#243757] via-[#142643] to-[#0d1d35] px-6">
        <span className="truncate text-[15px] font-bold text-white">{headerTitle}</span>
        {headerRight && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{headerRight}</div>
        )}
      </div>
      <div className="flex flex-col gap-3 bg-[#111b31] px-5 py-4">{children}</div>
    </div>
  );
}

export function ShelfLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-[#d8e0ed]">
      {children}
    </span>
  );
}

export function ShelfBoard() {
  return (
    <div className="h-2.5 flex-none rounded-[1px] bg-gradient-to-b from-[#e0b77d] to-[#b9854f] shadow-[0_7px_10px_rgba(0,0,0,.3)]" />
  );
}

// 250: 한 캐비닛 안에서 소유자별 책장을 나란히 두기 위한 3열 그리드. 칸 사이 세로선(border-l)으로
// "내 책장"과 "팔로우한 책장"이 같은 캐비닛의 다른 칸임을 드러낸다.
export function ShelfColumnGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-3 gap-x-5">{children}</div>;
}

export function ShelfColumn({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 border-l border-white/10 pl-5 first:border-l-0 first:pl-0">
      {children}
    </div>
  );
}

// 250: 한 행(row)에 들어갈 스파인들. chunkIntoShelfRows(SHELF_ROW_SIZE)로 이미 한 줄 분량으로 잘려
// 들어오므로 줄바꿈·스크롤은 이 레벨에서 다루지 않는다 — ShelfTier/바깥 컨테이너가 담당한다.
// gap-0.5(2px)로 스파인을 거의 붙여 두되, 스파인 자체의 border(border-black/20)가 있어 경계는
// 시각적으로 구분된다 — 완전히 0으로 붙이지는 않는다.
export function ShelfRow({ children }: { children: ReactNode }) {
  return <div className="flex items-end gap-0.5">{children}</div>;
}

// 250: 행 하나 + 그 바로 아래 선반 한 조각을 한 단위로 반복한다. 캐비닛 하단에 선반을 한 번만 두던
// 구조 대신, 책이 SHELF_ROW_SIZE개씩 한 줄을 채울 때마다 선반이 깔리는 구조로 바꾼 것이다.
export function ShelfTier({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <ShelfRow>{children}</ShelfRow>
      <ShelfBoard />
    </div>
  );
}

interface ShelfBookSpineProps {
  title: string;
  index: number;
  recordCount: number;
  onClick: () => void;
}

export function ShelfBookSpine({ title, index, recordCount, onClick }: ShelfBookSpineProps) {
  const height = getSpineHeight(recordCount);
  const width = getSpineWidth(index);

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{ width, height, backgroundColor: getSpineColor(index) }}
      className="flex flex-none flex-col items-center justify-start overflow-hidden rounded-t-sm rounded-b-[2px] border border-black/20 pb-2 pt-3 shadow-[2px_0_5px_rgba(0,0,0,.3)] transition-transform hover:-translate-y-2"
    >
      <span
        style={{ maxHeight: height - 24 }}
        className="[writing-mode:vertical-rl] overflow-hidden whitespace-nowrap text-[10px] font-bold text-white [text-shadow:0_1px_3px_rgba(4,18,38,.5)]"
      >
        {title}
      </span>
    </button>
  );
}

export function ShelfAddSlot({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="새 컬렉션 만들기"
      className="flex h-[140px] w-11 flex-none flex-col items-center justify-center gap-2 rounded-t-sm rounded-b-[2px] border-2 border-dashed border-log-mint bg-log-mint/10 transition-transform hover:-translate-y-2 hover:bg-log-mint/20"
    >
      <span className="text-lg font-bold leading-none text-log-mint">＋</span>
      <span className="[writing-mode:vertical-rl] whitespace-nowrap text-[10px] font-bold text-log-mint/90">
        새 컬렉션
      </span>
    </button>
  );
}

interface ShelfIconButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
}

export function ShelfIconButton({ label, onClick, children }: ShelfIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-7 w-7 flex-none place-items-center rounded-full border border-white/20 bg-white/10 text-[#d8e0ed] transition hover:border-log-mint hover:bg-log-mint hover:text-pin-navy"
    >
      {children}
    </button>
  );
}

export function ShelfMoreButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-9 flex-none self-center rounded-full border border-log-mint/50 px-4 text-xs font-bold text-log-mint disabled:opacity-40"
    >
      {children}
    </button>
  );
}
