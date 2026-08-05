import { useState, type ReactNode } from 'react';
import { formatDate } from '@/shared/lib/formatDate';
import { pastelizeHex } from '@/shared/lib/pastelizeHex';

/**
 * 316: 표지 판형 5종이 공유하는 파츠. **판형은 "배치"만 결정하고 글자·괘선·도판의 생김새는 전부
 * 여기서 온다.**
 *
 * 이유: 315가 세운 조판 규칙(표지 루트에 fontSize 하나 → 내부는 전부 em, em 중첩 금지)이 5개 파일로
 * 흩어지면 가장 먼저 깨진다. 각 판형이 제 나름의 text-[…em]을 직접 쓰기 시작하면 어떤 표지는 글자가
 * 크고 어떤 표지는 작아지고, 축약 모드 규칙도 파일마다 달라진다. 그래서 텍스트 슬롯을 컴포넌트로
 * 고정하고, 판형은 위치 클래스(absolute/mt-auto/self-center 등)만 className으로 얹는다.
 *
 * ⚠️ className으로 text-*·tracking-*·font-* 를 덮어쓰지 말 것 — 같은 요소에 text-[1em]과
 * text-[0.88em]이 함께 붙으면 클래스 나열 순서가 아니라 CSS 규칙 순서로 승자가 정해져 예측이
 * 어긋난다. 크기·정렬·자간·굵기는 전부 prop이다.
 *
 * --- 시안(Book Covers.dc.html)에서 가져온 조형 언어 ---
 * 1. **금색 얇은 괘선.** 제목 아래 짧은 선, 표지 가장자리 1px 프레임, 제목을 위아래로 감싸는 괘선.
 *    시안이 rgba(182,130,53,.55)로 쓰는 그 선이다(cover-gold 토큰). 서체가 아니라 이 선들이 "인쇄물"
 *    인상의 대부분을 만든다.
 * 2. **자간 넓은 작은 라벨.** 카테고리·출판사 자리는 항상 아주 작고 자간이 .2~.3em이다.
 * 3. **큰 제목과 넓은 여백.** 시안 제목은 표지 폭의 9~13%다(456px 판에 42~62px).
 * 4. **굵기 대비.** 시안은 판형마다 다른 서체를 썼는데(나눔명조 Bold ~ 고딕 A1 Light), 우리는
 *    서체가 Pretendard 하나뿐이므로 그 대비를 **웨이트**로 옮긴다 — 4종은 굵고 좁은 자간의 표제,
 *    arch만 가늘고 자간을 크게 벌린 표제(시안 1f가 라이트 고딕을 쓴 그 자리)다.
 *
 * ⚠️ 명조체(Noto Serif KR)를 한 번 도입했다가 걷어냈다(사용자 결정, 2026-08-05). 표지 전용
 * 웹폰트를 다시 들이지 말 것 — 브랜드 서체는 Pretendard 하나다.
 *
 * --- 시안을 그대로 옮길 수 없는 지점(의도적 이탈) ---
 * 시안은 456px 실물 판형이고 우리 카드는 폭 132~229px의 썸네일이다. 크기를 비율대로 옮기면 양쪽
 * 끝이 다 깨진다 — 시안의 11px 라벨(폭의 2.4%)은 4.5px이 되어 안 읽히고, 시안의 표제(폭의 9~13%)는
 * 명조 기준이라 그 크기를 산세리프로 옮기면 글자가 표지를 짓누른다. 그래서 **표제는 폭의 8%(1em),
 * 라벨류는 가독 하한(약 7px)에 두고, 시안의 인상은 크기가 아니라 자간·괘선·여백으로** 가져온다.
 */

// --- 도판(일러스트) 영역 -----------------------------------------------------------------------

/**
 * 316 시점에는 imageUrl이 항상 null이라 사실상 폴백만 그린다. 그래도 <img> 경로를 지금 넣어두는
 * 이유는, 318에서 URL이 생겼을 때 판형 5종을 다시 건드리지 않게 하기 위해서다.
 * 폴백은 accentColor에서 결정론적으로 만든다 — 같은 컬렉션은 언제나 같은 그림이다.
 * 크기는 부모가 정하고(h/w 클래스) 이 컴포넌트는 그 안을 채우기만 한다 — 이미지 로드 전후로
 * 레이아웃이 흔들리지 않아야 한다(318 완료 조건).
 */
export function CoverArtwork({
  imageUrl,
  accentColor,
  className = '',
}: {
  imageUrl: string | null;
  accentColor: string;
  className?: string;
}) {
  const [hasFailed, setHasFailed] = useState(false);
  const showImage = imageUrl !== null && !hasFailed;

  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden ${className}`}
      style={{
        // 위(옅게)→아래(진하게)로 흐르는 accent 그라디언트. 도판이 들어올 자리를 색으로만 채운다.
        backgroundImage: `linear-gradient(160deg, ${pastelizeHex(accentColor)} 0%, ${accentColor} 70%, ${accentColor} 100%)`,
      }}
    >
      {showImage && (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setHasFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}

// --- 괘선·프레임 -------------------------------------------------------------------------------

/**
 * 시안의 금색 괘선. 표제를 끊어주는 이 선 하나가 "인쇄물" 인상의 절반을 만든다.
 * width='short'는 시안 1a의 제목 아래 56px 짧은 선(표지 폭의 12%), 'full'은 1b·1d의 전폭 괘선이다.
 */
export function CoverRule({
  width = 'full',
  className = '',
}: {
  width?: 'full' | 'short';
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`h-px shrink-0 bg-cover-gold/60 ${width === 'short' ? 'w-[3.2em]' : 'w-full'} ${className}`}
    />
  );
}

/**
 * 표지 가장자리에서 살짝 안쪽으로 들어온 1px 프레임(시안 1a의 금색 테두리, 1f의 옅은 테두리).
 * 카드 자체의 ring(CollectionBookCard)과는 다른 것이다 — 저건 카드 경계선이고 이건 인쇄된 괘다.
 */
export function CoverFrame({ tone = 'gold' }: { tone?: 'gold' | 'soft' }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-[0.45em] border ${
        tone === 'gold' ? 'border-cover-gold/55' : 'border-cover-gold-soft/70'
      }`}
    />
  );
}

// --- 텍스트 슬롯 -------------------------------------------------------------------------------

// 시안 제목은 표지 폭의 9~13%(456px 판에 42~62px)이고, 그 비율을 그대로 옮기면 1.25em이다. 처음엔
// 그렇게 잡았다가 되돌렸다 — 시안은 명조체 기준이라 같은 크기라도 획이 가늘어 가벼운데, Pretendard
// 같은 산세리프를 그 크기로 키우면 글자가 표지를 짓누른다(사용자 피드백, 2026-08-05).
// 1em = 폭의 8%가 실제로 보기에 맞는 크기다. 'sm'은 세로짜기(좁은 단)와 아치(자간을 크게 벌려
// 실제 차지하는 폭이 더 넓은 판형)용이다.
const TITLE_SIZE_CLASS = {
  md: 'text-[1em]',
  sm: 'text-[0.88em]',
} as const;

const TITLE_LINES_CLASS = {
  2: 'line-clamp-2',
  3: 'line-clamp-3',
} as const;

const TITLE_ALIGN_CLASS = {
  left: 'text-left',
  center: 'text-center',
} as const;

// 자간도 prop이다 — className으로 tracking-*을 얹으면 기본값과 둘 다 붙어 CSS 규칙 순서가 승자를
// 정한다(파일 상단 ⚠️). 'wide'는 시안 1f의 자간 넓은 고딕 표제(0.14em)다.
const TITLE_TRACKING_CLASS = {
  tight: 'tracking-[-0.01em]',
  wide: 'tracking-[0.14em]',
  vertical: 'tracking-[0.06em]',
} as const;

// 시안은 판형마다 다른 서체로 대비를 줬지만(나눔명조 Bold ~ 고딕 A1 Light) 우리 서체는 Pretendard
// 하나다. 그 대비를 웨이트로 옮긴다 — 'bold'는 4종의 굵은 표제, 'light'는 arch의 가늘고 자간 넓은
// 표제(시안 1f)다. Pretendard Variable이라 300~700이 실제로 다 다르게 그려진다.
const TITLE_WEIGHT_CLASS = {
  bold: 'font-bold',
  light: 'font-light',
} as const;

/**
 * 표제. 좁은 자간 + 촘촘한 행간(1.2)으로 인쇄물 표제의 밀도를 낸다.
 * weight='light' + tracking='wide'는 시안 1f(아치)만의 조판이다.
 */
export function CoverTitle({
  children,
  size = 'md',
  lines = 2,
  align = 'left',
  weight = 'bold',
  tracking = 'tight',
  vertical = false,
  className = '',
}: {
  children: ReactNode;
  size?: keyof typeof TITLE_SIZE_CLASS;
  lines?: keyof typeof TITLE_LINES_CLASS;
  align?: keyof typeof TITLE_ALIGN_CLASS;
  weight?: keyof typeof TITLE_WEIGHT_CLASS;
  tracking?: keyof typeof TITLE_TRACKING_CLASS;
  /** 세로짜기(verticalTitle 판형). line-clamp는 가로줄 기준이라 세로쓰기에서는 동작하지 않으므로,
   *  줄 수 대신 높이 제한 + overflow로 자른다. */
  vertical?: boolean;
  className?: string;
}) {
  if (vertical) {
    return (
      <p
        style={{ writingMode: 'vertical-rl' }}
        className={`max-h-full overflow-hidden leading-[1.35] text-pin-navy ${TITLE_WEIGHT_CLASS[weight]} ${TITLE_SIZE_CLASS[size]} ${TITLE_TRACKING_CLASS.vertical} ${className}`}
      >
        {children}
      </p>
    );
  }

  return (
    <p
      className={`overflow-hidden leading-[1.2] text-pin-navy ${TITLE_WEIGHT_CLASS[weight]} ${TITLE_SIZE_CLASS[size]} ${TITLE_LINES_CLASS[lines]} ${TITLE_ALIGN_CLASS[align]} ${TITLE_TRACKING_CLASS[tracking]} ${className}`}
    >
      {children}
    </p>
  );
}

/**
 * 북디자인의 "장르/총서" 자리 — keywords[0]이 들어간다.
 * 시안은 11px에 자간 .3em짜리 금색 라벨이다. 크기는 가독 하한(0.46em ≈ 7px)에서 멈추고 자간만
 * 시안대로 가져온다(위 "의도적 이탈" 참고).
 */
export function CoverLabel({
  children,
  tone = 'gold',
  vertical = false,
  className = '',
}: {
  children: ReactNode;
  tone?: 'gold' | 'muted';
  /** 세로짜기 판형의 상단 라벨(시안 1e). 세로쓰기에서도 자간·크기는 가로와 같아야 한 벌로 보인다. */
  vertical?: boolean;
  className?: string;
}) {
  return (
    <p
      style={vertical ? { writingMode: 'vertical-rl' } : undefined}
      className={`truncate text-[0.46em] font-semibold leading-[1.6] tracking-[0.26em] ${
        tone === 'gold' ? 'text-cover-gold' : 'text-ink-gray'
      } ${className}`}
    >
      {children}
    </p>
  );
}

/** 시안 1f의 "선 — 라벨 — 선" 조판. 라벨 하나를 좌우 괘선이 받쳐 중앙에 앉힌다. */
export function CoverLabelBetweenRules({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full items-center gap-[0.5em]">
      <div aria-hidden="true" className="h-px flex-1 bg-cover-gold/40" />
      <CoverLabel className="shrink-0">{children}</CoverLabel>
      <div aria-hidden="true" className="h-px flex-1 bg-cover-gold/40" />
    </div>
  );
}

/** 부제 — keywords[1]이 들어간다. 없으면 판형이 아예 렌더하지 않는다(빈 줄을 남기지 않는다). */
export function CoverSubtitle({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`truncate text-[0.5em] leading-[1.7] text-ink-gray ${className}`}>{children}</p>
  );
}

/**
 * 푸터 — 북디자인의 "저자 / 출판사" 자리를 저장된 장소 수와 생성일이 대신한다.
 * ⚠️ 소유자 정보를 넣지 않는다(docs/privacy-rules.md). 시안의 "유하람 / 청람" 자리가 여기다.
 * 시안처럼 좌측은 본문 크기, 우측은 자간 넓은 작은 라벨로 층을 만든다.
 * 축약 모드에서는 날짜를 버리고 장소 수만, 그것도 "저장된 장소" 수식어를 뗀 채로 남긴다.
 */
export function CoverFooter({
  recordCount,
  createdAt,
  isCompact,
  layout = 'spread',
  className = '',
}: {
  recordCount: number;
  createdAt: string;
  isCompact: boolean;
  layout?: keyof typeof FOOTER_LAYOUT_CLASS;
  className?: string;
}) {
  // stack은 세로짜기 판형의 좁은 단(카드 폭의 36%)에 들어간다 — 그 폭에서 "저장된 장소 12곳"은
  // 컬럼을 넘친다(폭 53px에 글자 59px). 축약 모드와 같은 짧은 형태를 쓴다.
  const useShortLabel = isCompact || layout === 'stack';

  return (
    <div className={`flex min-w-0 gap-[0.4em] ${FOOTER_LAYOUT_CLASS[layout]} ${className}`}>
      {/* 축약 구간에서는 상대 크기를 오히려 키운다 — 카드 폭 132px이면 루트가 10.6px이라 0.5em은
          5.3px이 되어 읽을 수 없다. 축약 모드는 어차피 카테고리·부제·날짜를 버려 자리가 남으므로,
          남은 한 줄을 키우는 편이 맞다. */}
      <span
        className={`max-w-full shrink-0 truncate leading-[1.6] text-ink-gray ${
          isCompact ? 'text-[0.62em]' : 'text-[0.5em]'
        }`}
      >
        {useShortLabel ? `${recordCount}곳` : `저장된 장소 ${recordCount}곳`}
      </span>
      {!isCompact && (
        <span className="max-w-full shrink-0 truncate text-[0.42em] leading-[1.9] tracking-[0.18em] text-ink-gray-light">
          {formatDate(createdAt)}
        </span>
      )}
    </div>
  );
}

// 정렬도 className이 아니라 prop으로 받는다 — justify-between과 justify-center를 같은 요소에
// 함께 붙이면 클래스 나열 순서가 아니라 CSS 규칙 순서로 승자가 정해진다(위 ⚠️와 같은 이유).
const FOOTER_LAYOUT_CLASS = {
  spread: 'items-baseline justify-between', // 좌: 장소 수 / 우: 날짜 (시안 1a·1b)
  center: 'items-baseline justify-center', // 가운데 모음 (시안 1d·1f)
  stack: 'flex-col items-start', // 세로로 쌓기 (시안 1e의 좁은 단)
} as const;

// --- 지면 ---------------------------------------------------------------------------------------

/**
 * 도판이 표지를 다 덮지 않는 판형(insetSquare/arch/verticalTitle의 좌측 단)이 쓰는 크림 지면.
 * 시안의 --color-bg(밝은 크림)에 해당한다. 완전 불투명이 아니라 카드 배경색(accent)이 아주 옅게
 * 비치게 둔다 — 그래야 판형이 같아도 컬렉션마다 색이 달라 서가가 단조롭지 않다.
 */
export function CoverPaper({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  // relative는 필수다 — CoverFrame이 absolute inset으로 이 지면 안에 괘를 그린다. 빠지면 프레임이
  // 카드 버튼(더 바깥)을 기준으로 잡혀 지면과 어긋난다.
  return <div className={`relative h-full bg-paper-white/[0.93] ${className}`}>{children}</div>;
}

/**
 * 도판 위에 글자를 얹는 판형(band/ruled)이 쓰는 지면.
 * 시안 1d는 흰 박스가 아니라 **위에서 아래로 사라지는 그라디언트**를 썼다 — 박스로 덮으면 도판이
 * 잘린 것처럼 보이지만, 그라디언트는 지면이 도판으로 자연스럽게 넘어간다.
 */
export function CoverFadeScrim({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      // ⚠️ stop 위치(from-0%/via-40%/to-70%)는 **5% 단위만** 존재한다 — Tailwind 기본 스케일에 없는
      // 값(예: via-38%)을 쓰면 클래스가 아예 생성되지 않고, 그러면 위치 지정만 조용히 빠진 채
      // 그라디언트가 균등 분할로 그려진다(빌드도 통과한다). 시안 값 38%/66%는 가장 가까운
      // 40%/70%로 맞췄다.
      className={`pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-paper-white/[0.94] from-0% via-paper-white/[0.72] via-40% to-transparent to-70% ${className}`}
    />
  );
}
