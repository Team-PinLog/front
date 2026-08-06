import type { CSSProperties, ReactNode } from 'react';
import {
  FEED_PLANK_SHADOW_BLEED_PX,
  scalePx,
  SHELF_BOARD_HEIGHT_PX,
  SHELF_SCALE_CSS,
} from '@/shared/lib/shelfCabinetLayout';
import {
  getSpineColor,
  getSpineHeight,
  getSpineNeighborClearancePx,
  getSpineTextColor,
  getSpineTilt,
  getSpineTiltLiftPx,
  getSpineWidth,
  SPINE_MAX_HEIGHT,
} from '@/shared/lib/shelfSpine';

/**
 * 책장(캐비닛) 비주얼 공통 프리미티브. 근거: Jira S15P11A705-169/250/295/319.
 * MyShelfList·FollowedShelfCard가 공유한다.
 * 250: LibraryPage가 "나의 책장·팔로우한 책장"을 캐비닛 하나 + 3열(ShelfColumnGrid/ShelfColumn)로
 * 합쳤다. ShelfBoard는 더 이상 캐비닛 맨 아래에 한 번만 두지 않는다 — ShelfTier가 행(row)마다 선반을
 * 반복해서 깐다(chunkIntoShelfRows로 행 단위(권수는 행마다 다름 — 287-14)로 자른 뒤 ShelfTier로
 * 감싸는 게 표준 패턴).
 * 319: 짙은 남색 캐비닛(목업 cabinet-shell)을 시안의 아이보리 캐비닛으로 교체했다 — Feed가 314에서
 * 밝은 오픈 책장으로 넘어간 뒤 나의 책장만 다크 톤으로 남아 톤이 어긋났기 때문이다. 색은 전부
 * shelf-frame/shelf-cell/shelf-wood* 토큰과 브랜드 토큰으로 옮겼다(하드코딩 hex 없음).
 */

// 287-8: --shelf-scale을 여기서 한 번만 선언한다 — CSS 커스텀 프로퍼티는 상속되므로 자손(ShelfColumn/
// ShelfBookSpine 등)이 전부 같은 값을 물려받는다. h-full + flex-col로 부모(LibraryPage의 flex-1 래퍼)가
// 내어주는 세로 공간을 그대로 채운다 — 실제로 스크롤이 늘어나는 지점은 ShelfColumn 안의 스크롤
// 박스(MyShelfList 등)다.
// 319: 캐비닛 안쪽 헤더바(짙은 남색 그라디언트 + "나의 책장" 텍스트)를 없앴다. 시안의 캐비닛은
// 사방이 균일한 아이보리 프레임뿐이고, 두 사용처(LibraryPage·MyShelfPage) 모두 캐비닛 바로 위에
// 같은 문구의 페이지 제목을 이미 갖고 있어 헤더바는 같은 말을 두 번 하는 자리였다 — 그래서
// headerTitle/headerRight prop 자체를 없앴다. 헤더바가 쓰던 세로 32px은 그대로 본문(칸)으로 간다.
// 프레임(border)과 본문 배경을 같은 shelf-frame으로 둬 "테두리+칸 사이 기둥"이 하나의 나무틀로
// 보이게 하고, 바깥 윤곽선만 ring 한 겹(shelf-frame-edge)으로 paper-white 배경과 경계를 만든다.
//
// 319 디자인 피드백: heightPx를 받는다. 이전엔 h-full로 부모(LibraryPage의 flex-1 래퍼) 높이를
// 퍼센트로 물려받았는데, 그 체인 끝의 스크롤 박스에 max-h-[590px]가 걸려 있어 높은 화면에서는
// 캐비닛이 래퍼를 다 채우지 못하고 아래가 크게 비었다. 그 결과 래퍼 기준으로 세로 중앙에 놓인
// 좌우 페이지 버튼도 캐비닛 중앙보다 아래로 내려갔다. 이제 호출부가 실측 뷰포트에서 계산한 높이
// (getPageContentBudgetPx)를 직접 넘겨 캐비닛 높이를 확정한다 — 퍼센트 체인 대신 확정값이라
// 안쪽 flex-1들도 늘어날 공간을 정확히 알게 된다. heightPx를 넘기지 않으면(/shelf 단독 화면)
// 기존 h-full 동작 그대로다.
export function ShelfCabinet({ children, heightPx }: { children: ReactNode; heightPx?: number }) {
  return (
    <div
      style={{ '--shelf-scale': SHELF_SCALE_CSS, height: heightPx } as CSSProperties}
      className={`flex flex-col overflow-hidden rounded-2xl border-[10px] border-shelf-frame bg-shelf-frame shadow-[0_18px_40px_rgba(4,33,66,.10)] ring-1 ring-shelf-frame-edge ${
        heightPx === undefined ? 'h-full' : ''
      }`}
    >
      {/* 본문은 flex-1 min-h-0으로 남는 세로 공간을 전부 받는다 — 헤더바가 있던 시절부터 유지해 온
          계약이라, 실제로 스크롤이 늘어나는 지점(ShelfColumn 안의 스크롤 박스)이 기준으로 삼는
          높이가 이 박스다. 헤더바만 빠지고 이 구조 자체는 그대로다. */}
      <div className="flex min-h-0 flex-1 flex-col p-2.5">{children}</div>
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
    <span className="inline-flex h-7 w-fit items-center rounded-full border border-line-card bg-snow-white px-3 text-[11px] font-bold text-pin-navy shadow-[0_1px_2px_rgba(4,33,66,.05)]">
      {children}
    </span>
  );
}

// 314(FeedList)에서 만든 선반 판. 시안의 선반은 "탄색 얇은 줄"이 아니라 흰 크림빛의 두꺼운 나무
// 판이다. 네 가지로 만든다.
//  (1) 두께 — 호출부가 heightPx로 정한다(Feed는 레이아웃 계산값, Library는 고정 10px).
//  (2) 색 — 밝은 크림 토큰 3단(shelf-wood-light 윗면 → shelf-wood 몸통 → shelf-wood-dark 앞 모서리).
//      단순 2단이면 여전히 평평해 보여서, 윗면 하이라이트를 25%까지 넓게 잡아 판의 윗면이 빛을 받는
//      것처럼 만든다.
//  (3) 입체감 — 모서리를 굴리고(rounded-[4px]), 안쪽 상단에 흰 하이라이트 선을 넣고, 판 아래로
//      떨어지는 그림자를 밝은 배경용 알파로 둔다(다크 배경 전제의 rgba(0,0,0,.3)에서 완화).
//  (4) 나뭇결 — 레퍼런스(밝은 원목 텍스처)의 결은 직선이 아니라 물결치듯 흐르고, 굵기도 제각각이다.
//      repeating-linear-gradient는 아무리 각도를 비틀어도 결국 평행 직선이라 이 느낌이 안 나온다
//      (실제로 넣어보니 나뭇결이 아니라 빗살무늬로 보였다). 그래서 SVG feTurbulence로 노이즈를
//      만들어 쓴다 — baseFrequency의 x를 아주 낮게(0.006), y를 높게(0.13) 주면 노이즈가 가로로 길게
//      늘어나 나뭇결 방향(판의 길이 방향)과 같아지고, numOctaves 4가 굵은 결·잔결을 함께 만든다.
//      feColorMatrix의 알파 행(1 0 0 0 -0.42)은 "빨강 채널 - 0.42"를 알파로 쓴다는 뜻이라, 노이즈
//      값이 낮은 부분은 완전히 투명해지고 높은 부분만 결로 남는다(반투명 안개가 아니라 선명한 결).
//      색은 판 위에 얹는 웜 브라운(0.55/0.45/0.32) 하나뿐이라 시안의 크림 톤은 그대로 유지된다.
//      판 색(토큰 그라디언트)은 className으로 두고 결만 별도 자식으로 분리했다 — 둘 다
//      background-image라 한 요소에 합치면 Tailwind 그라디언트가 덮여버린다.
// 319: FeedList 안에 있던 이 컴포넌트를 여기로 옮겼다 — Library의 ShelfBoard가 쓰던 짙은 나무색
// 하드코딩(#e0b77d/#b9854f)을 지우면서 두 화면의 선반이 완전히 같은 판이 됐기 때문이다.
const PLANK_GRAIN_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="60">',
  '<filter id="g" x="0" y="0" width="100%" height="100%">',
  '<feTurbulence type="fractalNoise" baseFrequency="0.006 0.13" numOctaves="4" seed="17"/>',
  '<feColorMatrix type="matrix" values="0 0 0 0 0.55 0 0 0 0 0.45 0 0 0 0 0.32 1 0 0 0 -0.42"/>',
  '</filter>',
  '<rect width="800" height="60" filter="url(#g)"/>',
  '</svg>',
].join('');

// 800px 주기로 가로 반복한다 — 선반이 그보다 짧으면 반복 자체가 화면에 드러나지 않는다.
const PLANK_GRAIN_IMAGE = `url("data:image/svg+xml,${encodeURIComponent(PLANK_GRAIN_SVG)}")`;

// 328(2차 디자인 피드백 "여전히 뚝 끊기는 느낌"): 낙하 그림자를 box-shadow에서 별도 레이어로
// 분리한다. box-shadow는 요소의 사각형을 그대로 복제해 흐리는 것이라, 판 좌우 끝에서 그림자가
// 세로선처럼 잘려 끝난다 — 스크롤 박스의 가로 클리핑을 없앤 뒤에도 그 단면이 그대로 보였다.
// 클리핑과 이건 서로 다른 문제였다. 레이어로 빼야 좌우 페이드아웃 마스크를 걸 수 있다.
// 판 자체(나무 단면)는 그대로 둔다 — "책보다 넓게 깔린 판"이라는 시안의 인상이 판 끝의 분명한
// 단면에서 나오기 때문이다(사용자 확인).
//
// 세로 프로파일은 기존 box-shadow(0 10px 16px)가 만들던 띠를 그대로 재현한다: 판 바로 아래에서
// 시작해 24px 아래에서 사라지고, 가장 진한 지점이 판에서 조금 떨어져 있다(offset 10px의 효과).
const PLANK_SHADOW_HEIGHT_PX = 24;
const PLANK_SHADOW_GRADIENT =
  'linear-gradient(to bottom, rgba(4,33,66,.10) 0%, rgba(4,33,66,.13) 35%, rgba(4,33,66,0) 100%)';

// 페이드 구간을 px이 아니라 %로 잡는 이유: 판 폭이 구간마다 크게 다르다(sm 약 300px ~ xl 약
// 1450px). 고정 px이면 좁은 화면에서는 판 전체가 흐려지고 넓은 화면에서는 끝이 여전히 끊겨 보인다.
// 328 3차 디자인 피드백("그림자가 선반보다 짧아 보인다"): 양 끝 10%씩 → 5%씩. 10%면 진하게 깔리는
// 구간이 판 폭의 80%뿐이라, 끊기지는 않지만 그림자가 판보다 짧은 것처럼 읽혔다. 5%면 90%가 온전한
// 그림자이고 페이드는 판 끝 근처에서만 일어난다 — 끊김을 없애는 최소한의 길이다.
const PLANK_SHADOW_FADE =
  'linear-gradient(to right, transparent 0%, #000 5%, #000 95%, transparent 100%)';

export function ShelfPlank({ heightPx, className }: { heightPx: number; className?: string }) {
  return (
    <div aria-hidden="true" style={{ height: heightPx }} className={`relative ${className ?? ''}`}>
      {/* 그림자 레이어. 판보다 좌우로 FEED_PLANK_SHADOW_BLEED_PX만큼 넓다 — box-shadow가 번지던
          폭과 같은 값이라, 그 자리를 확보해 둔 행 스크롤 박스의 좌우 padding 계약이 그대로
          유지된다(shelfCabinetLayout.ts). 마스크가 그 끝을 이미 투명하게 만들어 두므로 잘릴 일도
          없고, 그림자가 판 끝을 조금 넘어가며 사라져 실제 그림자에 더 가깝다. */}
      <div
        className="pointer-events-none absolute top-full"
        style={{
          left: -FEED_PLANK_SHADOW_BLEED_PX,
          right: -FEED_PLANK_SHADOW_BLEED_PX,
          height: PLANK_SHADOW_HEIGHT_PX,
          backgroundImage: PLANK_SHADOW_GRADIENT,
          WebkitMaskImage: PLANK_SHADOW_FADE,
          maskImage: PLANK_SHADOW_FADE,
        }}
      />
      {/* 판 본체. overflow-hidden은 나뭇결을 판 모서리에 맞춰 자르기 위한 것이라 여기 남는다 —
          그림자가 이 박스 바깥으로 나갔으므로 더 이상 그 클리핑에 걸리지 않는다. */}
      <div className="relative h-full overflow-hidden rounded-[4px] bg-gradient-to-b from-shelf-wood-light from-25% via-shelf-wood via-70% to-shelf-wood-dark shadow-[inset_0_1px_0_rgba(255,255,255,.9)]">
        <div
          className="absolute inset-0 opacity-60"
          style={{ backgroundImage: PLANK_GRAIN_IMAGE, backgroundSize: '800px 100%' }}
        />
      </div>
    </div>
  );
}

// 두께(10px)는 이전 h-2.5와 같다. 이 값은 행 수 역산(getLibraryVisibleRowCount)에 직접 들어가므로
// shelfCabinetLayout.ts를 단일 소스로 두고 여기서는 읽어 쓰기만 한다. Feed는 자체 레이아웃
// 계산값(FEED_SCALE_REF.boardHeight)을 넘긴다.
export function ShelfBoard() {
  return <ShelfPlank heightPx={SHELF_BOARD_HEIGHT_PX} className="flex-none" />;
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

// 319: 열 구분이 "얇은 세로선 + 왼쪽 padding"(border-l border-white/10 pl-5, 첫 열만 리셋)에서
// "칸 자체가 오목한 판"으로 바뀌었다. 시안의 캐비닛은 칸 사이가 선이 아니라 프레임과 같은 색의
// 아이보리 기둥이라, 칸마다 밝은 면(shelf-cell)을 깔고 ShelfColumnGrid의 gap(20px) 사이로 캐비닛
// 배경(shelf-frame)이 그대로 비치게 하면 그 기둥이 된다 — 구분선을 따로 그리지 않는다.
// 안쪽 상단 그림자(inset)는 칸이 프레임보다 한 겹 들어가 보이게 하는 최소한의 깊이감이다.
// ⚠️ 좌우 padding(px-2.5=10px)은 이제 모든 열이 동일하다 — 이전엔 첫 열만 0, 2·3열만 21px이라
// 열마다 실제 책 놓임 폭이 달랐다. shelfSpine.ts의 행 수용량(SHELF_ROW_SIZE) 산식이 이 값을
// 전제로 하므로 둘을 함께 바꿔야 한다(shelfSpine.ts 287-13/319 주석의 계산 참고).
export function ShelfColumn({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-3 rounded-lg bg-shelf-cell p-2.5 shadow-[inset_0_1px_4px_rgba(4,33,66,.07)]">
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
// 319: 고정 height → minHeight + grow. 행 수가 정수라 세로 예산이 딱 나눠떨어지는 일은 거의 없는데
// (getLibraryVisibleRowCount는 floor를 쓴다), 행 높이가 고정이면 그 나머지가 통째로 칸 맨 아래
// 빈 여백으로 남는다("하단 여백이 너무 많다" 피드백의 한 축). 이제 행들이 남는 높이를 균등하게
// 나눠 갖고, items-end 덕분에 책은 그대로 선반 판 위에 서 있는다 — 남는 높이는 바닥이 아니라 각
// 선반 칸의 머리 공간이 된다. shrink-0은 스크롤이 생길 만큼 행이 많을 때(내 컬렉션이 많은 계정)
// 행이 서로를 눌러 책이 잘리는 것을 막는다.
export function ShelfRow({ children }: { children: ReactNode }) {
  return (
    <div
      style={{ minHeight: scalePx(SPINE_MAX_HEIGHT) }}
      className="flex shrink-0 grow items-end gap-px"
    >
      {children}
    </div>
  );
}

// 250: 행 하나 + 그 바로 아래 선반 한 조각을 한 단위로 반복한다. 캐비닛 하단에 선반을 한 번만 두던
// 구조 대신, 책이 한 행 분량(getRowCapacity, 행마다 권수가 다르다 — 287-14)을 채울 때마다 선반이
// 깔리는 구조로 바꾼 것이다.
// 287-6: gap을 1.5(6px)에서 0으로 줄였다 — items-end로 책 하단이 이미 ShelfRow 바닥에 붙어 있는데
// 그 아래 6px 틈이 남아 책이 선반 위에 "떠 있는" 것처럼 보였다.
// 319: grow shrink-0 — 스크롤 박스가 내주는 남는 높이를 행들이 균등하게 나눠 갖되(위 ShelfRow
// 주석), 행이 많아 넘칠 때는 서로 눌리지 않고 스크롤로 넘어간다.
export function ShelfTier({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 grow flex-col gap-0">
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
      // 319: 그림자·테두리 알파를 밝은 배경용으로 완화했다(border-black/20 → /10, 낙하 그림자
      // rgba(0,0,0,.3)/.45 → 브랜드 네이비 저알파). 책등 자체의 하이라이트·홈 표현(before/after)은
      // 책등 표면 위 음영이라 배경 톤과 무관해 그대로 둔다.
      className="relative flex flex-none flex-col items-center justify-start overflow-hidden rounded-t-sm rounded-b-[2px] border border-black/10 pb-2 pt-3 shadow-[1px_0_4px_rgba(4,33,66,.18)] transition-transform duration-150 ease-out [transform:translateY(var(--spine-lift))_rotate(var(--spine-tilt))] before:pointer-events-none before:absolute before:inset-y-0 before:left-1 before:w-px before:bg-white/20 before:shadow-[2px_0_0_rgba(4,18,38,.13)] before:content-[''] after:pointer-events-none after:absolute after:inset-[8px_4px] after:border-y after:border-t-white/30 after:border-b-[rgba(4,18,38,.3)] after:shadow-[0_2px_0_rgba(4,18,38,.1),0_-2px_0_rgba(255,255,255,.1)] after:content-[''] hover:[transform:translateY(-10px)_rotate(0deg)] hover:shadow-[3px_12px_20px_rgba(4,33,66,.28)]"
    >
      {/* 319: 글자색을 text-white로 고정하지 않고 책등 색의 상대 휘도로 고른다 — 시안 팔레트에는
          흰 글자가 읽히지 않는 밝은 책등(앰버·연한 청회색)이 섞여 있다(getSpineTextColor).
          같은 이유로 text-shadow도 뺐다 — 대비를 색으로 이미 확보했고, 어두운 글자 아래 깔린 어두운
          그림자는 도움이 되기는커녕 글자를 번져 보이게 한다. */}
      <span
        style={{
          color: getSpineTextColor(collectionId),
          maxHeight: `calc(${scalePx(height)} - 24px)`,
        }}
        className="relative z-[1] [writing-mode:vertical-rl] overflow-hidden whitespace-nowrap text-[10px] font-bold"
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
      className="flex flex-none flex-col items-center justify-center gap-2 rounded-t-sm rounded-b-[2px] border-2 border-dashed border-log-mint bg-log-mint/5 transition-transform hover:-translate-y-2 hover:bg-log-mint/15"
    >
      <span className="text-lg font-bold leading-none text-log-mint">＋</span>
      <span className="[writing-mode:vertical-rl] whitespace-nowrap text-[10px] font-bold text-log-mint">
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
      // 319: FeedList(314)의 페이지 이동 버튼과 같은 밝은 톤 원형 버튼 규격으로 맞춘다.
      className="grid h-7 w-7 flex-none place-items-center rounded-full border border-line-card bg-snow-white text-pin-navy shadow-[0_1px_3px_rgba(4,33,66,.08)] transition hover:border-log-mint hover:bg-log-mint hover:text-white"
    >
      {children}
    </button>
  );
}
