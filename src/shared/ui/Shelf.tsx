import type { CSSProperties, ReactNode } from 'react';
import { scalePx, SHELF_SCALE_CSS } from '@/shared/lib/shelfCabinetLayout';
import {
  getSpineColor,
  getSpineHeight,
  getSpineNeighborClearancePx,
  getSpineTilt,
  getSpineTiltLiftPx,
  getSpineWidth,
  SPINE_MAX_HEIGHT,
} from '@/shared/lib/shelfSpine';

/**
 * 목업(mockup/PinLog.responsive.dc.html)의 책장(cabinet-shell) 비주얼을 옮긴 공통 프리미티브.
 * 근거: Jira S15P11A705-169/250/295. MyShelfList·FollowedShelfCard가 공유한다.
 * 250: LibraryPage가 "나의 책장·팔로우한 책장"을 캐비닛 하나 + 3열(ShelfColumnGrid/ShelfColumn)로
 * 합쳤다. ShelfBoard는 더 이상 캐비닛 맨 아래에 한 번만 두지 않는다 — ShelfTier가 행(row)마다 선반을
 * 반복해서 깐다(chunkIntoShelfRows로 행 단위(권수는 행마다 다름 — 287-14)로 자른 뒤 ShelfTier로
 * 감싸는 게 표준 패턴).
 */

interface ShelfCabinetProps {
  headerTitle: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
}

// 287-8: --shelf-scale을 여기서 한 번만 선언한다 — CSS 커스텀 프로퍼티는 상속되므로 자손(ShelfColumn/
// ShelfBookSpine 등)이 전부 같은 값을 물려받는다. h-full + flex-col로 부모(LibraryPage의 flex-1 래퍼)가
// 내어주는 세로 공간을 그대로 채우고, 헤더바는 flex-none(고정 높이)으로, 본문은 flex-1 min-h-0으로
// 나머지를 채운다 — 실제로 스크롤이 늘어나는 지점은 ShelfColumn 안의 스크롤 박스(MyShelfList 등)다.
export function ShelfCabinet({ headerTitle, headerRight, children }: ShelfCabinetProps) {
  return (
    <div
      style={{ '--shelf-scale': SHELF_SCALE_CSS } as CSSProperties}
      className="flex h-full flex-col overflow-hidden rounded-[10px] border-[8px] border-[#172742] bg-[#101d35] shadow-[0_18px_38px_rgba(4,18,38,.3)]"
    >
      <div className="relative flex h-8 flex-none items-center justify-center border-b border-[#2b3d5b] bg-gradient-to-b from-[#243757] via-[#142643] to-[#0d1d35] px-6">
        <span className="truncate text-[15px] font-bold text-white">{headerTitle}</span>
        {headerRight && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{headerRight}</div>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 bg-[#111b31] px-5 py-1.5">{children}</div>
    </div>
  );
}

// 295 추가 수정(이슈 4): py-1.5(패딩 기반 높이) 대신 h-7(고정 28px)로 바꿨다 — FollowedShelfCard의
// 헤더 행(h3/버튼)과 정확히 같은 높이(ShelfIconButton도 h-7)여야, 두 열(내 책장/팔로우한 책장)의
// ShelfColumn(flex flex-col)이 헤더 다음에 남기는 flex-1 스크롤 박스 높이가 같아진다 — 헤더 높이가
// 다르면 두 스크롤 박스의 남는 세로 공간이 서로 달라져, 내용(tier 수)이 같아도 "최하단 선반~캐비닛
// 바닥" 여백이 달라 보인다(FollowedShelfCard.tsx 주석 참고).
export function ShelfLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-7 w-fit items-center rounded-full border border-white/10 bg-white/10 px-3 text-[11px] font-bold text-[#d8e0ed]">
      {children}
    </span>
  );
}

export function ShelfBoard() {
  return (
    <div className="h-2.5 flex-none rounded-[1px] bg-gradient-to-b from-[#e0b77d] to-[#b9854f] shadow-[0_7px_10px_rgba(0,0,0,.3)]" />
  );
}

// 250(→295 반응형 재설계 요구사항 B에서 열 수 가변화): 한 캐비닛 안에서 소유자별 책장을 나란히
// 두기 위한 그리드. 칸 사이 세로선(border-l, ShelfColumn)으로 "내 책장"과 "팔로우한 책장"이 같은
// 캐비닛의 다른 칸임을 드러낸다.
// 295: 열 수가 더 이상 항상 3이 아니다(LIBRARY_COLUMNS_BY_TIER — sm=1/mdlg=2/xl=3) — Tailwind는
// grid-cols-{N}을 동적으로 만들 수 없어(리터럴 클래스만 읽는다, shelfCabinetLayout.ts 상단 주석과
// 동일한 이유) gridTemplateColumns를 인라인 style로 준다. gap-x-5(20px)는 그대로 리터럴 클래스로
// 유지한다 — shelfSpine.ts의 책장 폭 계산(287-13 주석)이 이 20px을 전제로 하기 때문이다.
export function ShelfColumnGrid({ columns, children }: { columns: number; children: ReactNode }) {
  // 287-8: h-full + grid의 기본 align-items:stretch 조합으로 각 칸이 전부 ShelfCabinet 본문 높이를
  // 그대로 채운다 — 칸 안의 스크롤 박스(flex-1)가 남는 세로 공간을 계산할 기준이 이 높이다.
  // 287-11: 이 div는 부모(ShelfCabinet 본문, flex flex-col)의 flex item이기도 하다 — min-h-0이
  // 없으면 flex item의 기본 min-height:auto가 적용돼, overflow:visible인 이 요소의 자동 최소
  // 크기가 콘텐츠 기준으로 계산된다(실제로는 하위 스크롤 박스가 overflow-y-auto+명시적 min/max라
  // 그 경계에서 이미 끊기므로 지금 당장 무한정 커지는 버그는 아니지만, 체인의 다른 모든 단계
  // (ShelfCabinet 본문 div, ShelfColumn)에 이미 min-h-0을 준 것과 같은 원칙을 여기도 적용해
  // 향후 구조가 바뀌어도 깨지지 않게 한다).
  return (
    <div
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      className="grid h-full min-h-0 gap-x-5"
    >
      {children}
    </div>
  );
}

// ShelfColumn 안의 세로 gap(라벨→스크롤박스)은 shelfSpine.ts SHELF_VISIBLE_HEIGHT_PX 계산식의
// "컬럼 헤더→스크롤박스 gap" 항목(COLUMN_HEADER_GAP_PX)과 반드시 같은 값이어야 한다 — 여기서 Tailwind
// 리터럴로 따로 고정하면 그 등식이 scale에 따라 깨진다.
// paddingLeft는 CSS 변수(--shelf-column-pl)로 우회한다 — 인라인 style은 first:pl-0 같은 Tailwind
// 의사클래스보다 항상 우선하므로, style에 직접 paddingLeft를 주면 첫 번째 열의 pl-0 리셋이 씹힌다.
export function ShelfColumn({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-3 border-l border-white/10 pl-5 first:border-l-0 first:pl-0">
      {children}
    </div>
  );
}

// 250: 한 행(row)에 들어갈 스파인들. chunkIntoShelfRows(getRowCapacity)로 이미 한 줄 분량으로 잘려
// 들어오므로 줄바꿈·스크롤은 이 레벨에서 다루지 않는다 — ShelfTier/바깥 컨테이너가 담당한다.
// 287-4: 행 높이를 실제 책 높이(getSpineHeight, 112~168 가변)와 무관하게 SPINE_MAX_HEIGHT로
// 고정한다 — 이전엔 flex 컨테이너가 auto 높이라 그 행에서 가장 큰 책 높이를 따라가 3행이 균등하게
// 3등분되지 않았다. items-end(짧은 책도 선반에 발이 붙어 보이게)는 그대로 유지한다.
// 287-6: gap을 다시 거의 0(gap-px=1px)으로 줄였다 — 책이 실제로 선반에 빽빽하게 꽂힌 느낌을 위해서다
// (직전엔 마지막 자리 책의 좌회전 겹침을 막으려고 gap-2.5로 늘렸었는데, 그러면 모든 책 사이가 다
// 벌어져 보였다). 겹침 방지는 이제 ShelfBookSpine이 기울어진 책에만 개별로 주는
// marginLeft/marginRight(getSpineNeighborClearancePx, 287-14)가 맡는다.
export function ShelfRow({ children }: { children: ReactNode }) {
  return (
    <div style={{ height: scalePx(SPINE_MAX_HEIGHT) }} className="flex items-end gap-px">
      {children}
    </div>
  );
}

// 250: 행 하나 + 그 바로 아래 선반 한 조각을 한 단위로 반복한다. 캐비닛 하단에 선반을 한 번만 두던
// 구조 대신, 책이 한 행 분량(getRowCapacity, 행마다 권수가 다르다 — 287-14)을 채울 때마다 선반이
// 깔리는 구조로 바꾼 것이다.
// 287-6: gap을 1.5(6px)에서 0으로 줄였다 — items-end로 책 하단이 이미 ShelfRow 바닥에 붙어 있는데
// 그 아래 6px 틈이 남아 책이 선반 위에 "떠 있는" 것처럼 보였다.
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
  collectionId: number;
  recordCount: number;
  onClick: () => void;
}

// 287-14: index는 여전히 "선반 위 위치"(폭 순환 판단)에만 쓰고, 색·기울기·높이 지터는 collectionId
// (컬렉션 고유 식별자)로 고른다 — 목록 순서가 바뀌어도(새 컬렉션 추가 등) 같은 컬렉션은 항상 같은
// 값을 유지해야 하기 때문이다(shelfSpine.ts 각 함수 주석 참고).
export function ShelfBookSpine({
  title,
  index,
  collectionId,
  recordCount,
  onClick,
}: ShelfBookSpineProps) {
  const height = getSpineHeight(recordCount, collectionId);
  const width = getSpineWidth(index);
  const tilt = getSpineTilt(collectionId);
  const tiltLift = getSpineTiltLiftPx(width, height, tilt);
  // 287-15: 회전은 중심 기준이라 바운딩 박스가 양쪽으로 대칭으로 커진다 — 음수(반시계) 기울기든
  // 양수(시계) 기울기든, 왼쪽·오른쪽 모두 같은 크기만큼 원래 폭보다 튀어나온다(한쪽 모서리가
  // 왼쪽으로 나가면 반대쪽 모서리는 정확히 같은 양만큼 오른쪽으로 나간다 — 회전의 일반적 성질).
  // 기울기 부호에 따라 한쪽에만 여백을 줬던 이전 버전은 반대쪽 이웃과 겹치는 버그가 있었다 — 이제
  // 기울어진 책은 양쪽 모두에 동일한 여백을 준다(고정 TILT_NEIGHBOR_CLEARANCE_PX 대신 이 책의 실제
  // 폭·높이·기울기로 정확히 계산한 값 — shelfSpine.ts getSpineNeighborClearancePx 참고).
  const neighborClearance =
    tilt !== 0 ? scalePx(getSpineNeighborClearancePx(width, height, tilt)) : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={
        {
          width: scalePx(width),
          height: scalePx(height),
          marginLeft: neighborClearance,
          marginRight: neighborClearance,
          backgroundColor: getSpineColor(collectionId),
          '--spine-tilt': `${tilt}deg`,
          // 287-7: getSpineTiltLiftPx가 계산한 만큼(스케일 1 기준) 위로 translateY해 회전 후 하단이
          // 선반 보드 상단에 다시 맞닿게 한다. scalePx로 감싸 --shelf-scale이 줄어들면 보정량도 폭/
          // 높이와 같은 비율로 같이 줄어들게 한다(rotate는 --spine-tilt와 별개 CSS 변수로 둔다).
          '--spine-lift': scalePx(-tiltLift),
        } as CSSProperties
      }
      // 287: 기본 기울기는 --spine-tilt(collectionId 기반, getSpineTilt)로 고정하고, 호버 시에는 책이
      // 살짝 빠져나와 세워지는 느낌을 주도록 translateY(-10px) + rotate(0deg)로 정면을 향하게
      // 보정한다. 인라인 style의 transform과 클래스 기반 hover:transform은 같은 CSS 프로퍼티를
      // 완전히 덮어써 충돌하므로, 둘 다 [transform:...] 임의값 클래스로 통일해 hover 의사클래스의
      // 더 높은 우선순위로만 전환되게 한다(Feed 카드 호버와 같은 duration-150 ease-out).
      // 287-7: translateY(var(--spine-lift))를 rotate보다 먼저(바깥쪽에) 둔다 — CSS transform
      // 목록은 오른쪽 함수부터 적용되므로 rotate로 생긴 바닥 침범을 translate가 그 다음에 상쇄한다.
      className="relative flex flex-none flex-col items-center justify-start overflow-hidden rounded-t-sm rounded-b-[2px] border border-black/20 pb-2 pt-3 shadow-[2px_0_5px_rgba(0,0,0,.3)] transition-transform duration-150 ease-out [transform:translateY(var(--spine-lift))_rotate(var(--spine-tilt))] before:pointer-events-none before:absolute before:inset-y-0 before:left-1 before:w-px before:bg-white/20 before:shadow-[2px_0_0_rgba(4,18,38,.13)] before:content-[''] after:pointer-events-none after:absolute after:inset-[8px_4px] after:border-y after:border-t-white/30 after:border-b-[rgba(4,18,38,.3)] after:shadow-[0_2px_0_rgba(4,18,38,.1),0_-2px_0_rgba(255,255,255,.1)] after:content-[''] hover:[transform:translateY(-10px)_rotate(0deg)] hover:shadow-[4px_14px_22px_rgba(0,0,0,.45)]"
    >
      <span
        style={{ maxHeight: `calc(${scalePx(height)} - 24px)` }}
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

// 251: 이전엔 h-[140px] w-11 고정값이라 형제 스파인(getSpineHeight/getSpineWidth 기반)과 줄이 안
// 맞았다. recordCount가 없는 슬롯이라 자체 값을 계산할 수 없으므로, 호출부(MyShelfList)가 같은 행
// 스파인들의 실제 width/height(이미 scale이 반영된 값)를 계산해 넘긴다.
export function ShelfAddSlot({ onClick, width, height }: ShelfAddSlotProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="새 컬렉션 만들기"
      style={{ width: scalePx(width), height: scalePx(height) }}
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
