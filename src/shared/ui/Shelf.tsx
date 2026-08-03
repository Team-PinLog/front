import type { CSSProperties, ReactNode } from 'react';
import {
  getSpineColor,
  getSpineHeight,
  getSpineTilt,
  getSpineWidth,
  SPINE_MAX_HEIGHT,
  TILT_NEIGHBOR_CLEARANCE_PX,
} from '@/shared/lib/shelfSpine';

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

// 287-5: 헤더바(h-8+border-b, 기존 h-9+border-b-4=40에서 33으로)와 본문 padding(py-1.5, 기존
// py-2에서 축소)은 shelfSpine.ts SHELF_VISIBLE_HEIGHT_PX 계산식의 CABINET_HEADER_BAR_PX/
// CABINET_BODY_PADDING_PX와 반드시 같은 값이어야 한다 — Feed의 실제 캐비닛 높이
// (SHELF_CABINET_TOTAL_HEIGHT_PX)와 Library 캐비닛 최종 높이를 정확히 맞추는 역산의 입력값이다.
export function ShelfCabinet({ headerTitle, headerRight, children }: ShelfCabinetProps) {
  return (
    <div className="overflow-hidden rounded-[10px] border-[8px] border-[#172742] bg-[#101d35] shadow-[0_18px_38px_rgba(4,18,38,.3)]">
      <div className="relative flex h-8 flex-none items-center justify-center border-b border-[#2b3d5b] bg-gradient-to-b from-[#243757] via-[#142643] to-[#0d1d35] px-6">
        <span className="truncate text-[15px] font-bold text-white">{headerTitle}</span>
        {headerRight && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{headerRight}</div>
        )}
      </div>
      <div className="flex flex-col gap-3 bg-[#111b31] px-5 py-1.5">{children}</div>
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
// 287-4: 행 높이를 실제 책 높이(getSpineHeight, 112~168 가변)와 무관하게 SPINE_MAX_HEIGHT로
// 고정한다 — 이전엔 flex 컨테이너가 auto 높이라 그 행에서 가장 큰 책 높이를 따라가 3행이 균등하게
// 3등분되지 않았다. items-end(짧은 책도 선반에 발이 붙어 보이게)는 그대로 유지한다.
// 287-6: gap을 다시 거의 0(gap-px=1px)으로 줄였다 — 책이 실제로 선반에 빽빽하게 꽂힌 느낌을 위해서다
// (직전엔 마지막 자리 책의 좌회전 겹침을 막으려고 gap-2.5로 늘렸었는데, 그러면 모든 책 사이가 다
// 벌어져 보였다). 겹침 방지는 이제 ShelfBookSpine이 기울어진 책에만 개별로 주는
// marginLeft(TILT_NEIGHBOR_CLEARANCE_PX)가 맡는다.
export function ShelfRow({ children }: { children: ReactNode }) {
  return (
    <div style={{ height: SPINE_MAX_HEIGHT }} className="flex items-end gap-px">
      {children}
    </div>
  );
}

// 250: 행 하나 + 그 바로 아래 선반 한 조각을 한 단위로 반복한다. 캐비닛 하단에 선반을 한 번만 두던
// 구조 대신, 책이 SHELF_ROW_SIZE개씩 한 줄을 채울 때마다 선반이 깔리는 구조로 바꾼 것이다.
// 287-6: gap을 1.5(6px)에서 0으로 줄였다 — items-end로 책 하단이 이미 ShelfRow 바닥에 붙어 있는데
// 그 아래 6px 틈이 남아 책이 선반 위에 "떠 있는" 것처럼 보였다. 이 gap은 shelfSpine.ts
// SHELF_VISIBLE_HEIGHT_PX 계산의 "행-선반 gap 0" 항목과 반드시 일치해야 한다.
export function ShelfTier({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0">
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
  const tilt = getSpineTilt(index);

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={
        {
          width,
          height,
          // 287-6: ShelfRow의 기본 gap은 gap-px(1px)로 거의 붙어 있다 — 기울어진 책(tilt !== 0, 지금은
          // 매 행 마지막 자리)만 회전축(중앙) 때문에 위쪽 모서리가 왼쪽 이웃 쪽으로 삐져나오므로, 그
          // 책에만 marginLeft로 여유를 준다. 나머지 책은 0이라 거의 맞닿아 보인다.
          marginLeft: tilt !== 0 ? TILT_NEIGHBOR_CLEARANCE_PX : undefined,
          backgroundColor: getSpineColor(index),
          '--spine-tilt': `${tilt}deg`,
        } as CSSProperties
      }
      // 287: 기본 기울기는 --spine-tilt(index 기반, getSpineTilt)로 고정하고, 호버 시에는 책이
      // 살짝 빠져나와 세워지는 느낌을 주도록 translateY(-10px) + rotate(0deg)로 정면을 향하게
      // 보정한다. 인라인 style의 transform과 클래스 기반 hover:transform은 같은 CSS 프로퍼티를
      // 완전히 덮어써 충돌하므로, 둘 다 [transform:...] 임의값 클래스로 통일해 hover 의사클래스의
      // 더 높은 우선순위로만 전환되게 한다(Feed 카드 호버와 같은 duration-150 ease-out).
      className="relative flex flex-none flex-col items-center justify-start overflow-hidden rounded-t-sm rounded-b-[2px] border border-black/20 pb-2 pt-3 shadow-[2px_0_5px_rgba(0,0,0,.3)] transition-transform duration-150 ease-out [transform:rotate(var(--spine-tilt))] before:pointer-events-none before:absolute before:inset-y-0 before:left-1 before:w-px before:bg-white/20 before:shadow-[2px_0_0_rgba(4,18,38,.13)] before:content-[''] after:pointer-events-none after:absolute after:inset-[8px_4px] after:border-y after:border-t-white/30 after:border-b-[rgba(4,18,38,.3)] after:shadow-[0_2px_0_rgba(4,18,38,.1),0_-2px_0_rgba(255,255,255,.1)] after:content-[''] hover:[transform:translateY(-10px)_rotate(0deg)] hover:shadow-[4px_14px_22px_rgba(0,0,0,.45)]"
    >
      <span
        style={{ maxHeight: height - 24 }}
        className="relative z-[1] [writing-mode:vertical-rl] overflow-hidden whitespace-nowrap text-[10px] font-bold text-white [text-shadow:0_1px_3px_rgba(4,18,38,.5)]"
      >
        {title}
      </span>
    </button>
  );
}

interface ShelfAddSlotProps {
  onClick: () => void;
  width: number;
  height: number;
}

// 251: 이전엔 h-[140px] w-11 고정값이라 형제 스파인(getSpineHeight/getSpineWidth 기반, 최대 168×52)과
// 줄이 안 맞았다. recordCount가 없는 슬롯이라 자체 값을 계산할 수 없으므로, 호출부(MyShelfList)가
// 같은 행 스파인들의 실제 width/height를 계산해 넘긴다.
export function ShelfAddSlot({ onClick, width, height }: ShelfAddSlotProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="새 컬렉션 만들기"
      style={{ width, height }}
      className="flex flex-none flex-col items-center justify-center gap-2 rounded-t-sm rounded-b-[2px] border-2 border-dashed border-log-mint bg-log-mint/10 transition-transform hover:-translate-y-2 hover:bg-log-mint/20"
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
