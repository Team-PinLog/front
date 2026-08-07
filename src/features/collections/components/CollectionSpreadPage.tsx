import type { MouseEvent, ReactNode } from 'react';

/**
 * 418 — 컬렉션 상세의 **책 펼침면**.
 *
 * 415의 `RecordNotebookPage`(노트 한 면)와 같은 종이 문법을 쓰되, 이쪽은 **두 면이 접힌 자국으로
 * 나뉜 펼침면**이다. 그래서 값(뒤에 쌓인 종이 2겹의 오프셋, radius 18px, 도트 4px, 닫기 ✕의 모양과
 * 자리)은 전부 그 파일에서 가져왔다 — 두 화면이 한 권의 다이어리로 읽혀야 한다.
 *
 * ## 높이가 고정이라는 것이 이 컴포넌트의 계약이다
 *
 * 펼침면은 **한 화면에 들어와야 한다**(418 코멘트 1의 1번 — 페이지 스크롤 금지). 그래서 높이를
 * 뷰포트에서 잘라 못박고(`min(760px, 100dvh-88px)`), 안쪽 두 면은 `min-h-0`로 그 높이를 나눠 갖는다.
 * 내용이 늘어난다고 상자가 자라지 않으므로, 넘칠 위험이 있는 쪽(맥락 무리)은 **밀도로** 대응한다
 * (contextNoteScatter의 밀도 사다리). 잘라내거나 말줄임하지 않는다.
 *
 * ## 페이지 넘김
 *
 * 332가 만든 조작을 그대로 잇는다 — 바깥 모서리의 넘김 영역, 페이지 면 클릭, 좌우 방향키.
 * 무엇이 넘김이 **아닌지**는 `isPageTurnClick` 한 곳에서 정의한다(지도·포스트잇·버튼 등).
 */

// 페이지 면 전체가 넘김 클릭 영역이라, 그 위에 놓인 컨트롤을 눌러도 클릭이 페이지까지 버블링해
// 장이 함께 넘어갔다(353). 컨트롤마다 stopPropagation을 흩뿌리면 컨트롤이 하나 늘 때마다 같은
// 버그가 되살아나므로, "무엇이 넘김이 아닌가"를 여기 한 곳에서 정의한다.
//  - 인터랙티브 요소(그 안쪽 텍스트·아이콘에서 시작한 클릭 포함)
//  - 넘김을 원치 않는다고 명시한 영역(data-page-turn="ignore") — 지도·포스트잇 무리처럼 요소 자체는
//    버튼이 아니지만 조작 대상인 곳에 붙인다.
const PAGE_TURN_IGNORE_SELECTOR =
  'a, button, input, select, textarea, label, [role="button"], [contenteditable="true"], [data-page-turn="ignore"]';

function isPageTurnClick(event: MouseEvent<HTMLElement>) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return true;
  }
  const ignored = target.closest(PAGE_TURN_IGNORE_SELECTOR);
  // closest는 currentTarget 위쪽 조상까지 올라갈 수 있다 — 페이지 바깥에서 걸린 요소는 무시한다.
  return ignored === null || !event.currentTarget.contains(ignored);
}

/** 가운데 접힌 자국. 415의 따뜻한 잉크 톤이다(332의 남색 골은 크림 종이를 차갑게 물들였다). */
const BOOK_FOLD_SHADE =
  'linear-gradient(to right, rgba(60,54,48,0) 0%, rgba(60,54,48,0.05) 34%, rgba(60,54,48,0.11) 49%, rgba(60,54,48,0.11) 51%, rgba(60,54,48,0.05) 66%, rgba(60,54,48,0) 100%)';

interface PageTurnZoneProps {
  side: 'left' | 'right';
  label: string;
  onClick: () => void;
}

function PageTurnZone({ side, label, onClick }: PageTurnZoneProps) {
  const isLeft = side === 'left';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`group absolute inset-y-0 z-30 hidden w-9 items-center justify-center focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#4f9b78] md:flex ${
        isLeft ? 'left-0' : 'right-0'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 ${
          isLeft
            ? 'bg-gradient-to-r from-black/[0.06] to-transparent'
            : 'bg-gradient-to-l from-black/[0.06] to-transparent'
        }`}
      />
      {/* 흰 알약 버튼은 종이 위에 이물질처럼 얹혀 보인다(332 피드백 3번) — 배경 없이 잉크색
          홑화살표만 남긴다. 자리를 알려주는 일은 음영이 이미 한다. */}
      <span className="relative text-3xl font-light leading-none text-[#a29d95] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
        {isLeft ? '‹' : '›'}
      </span>
    </button>
  );
}

interface CollectionSpreadPageProps {
  /** 넘기면 펼침면 우상단에 ✕가 생긴다(돌아갈 앱 내 지점이 있을 때만 — CollectionDetailPage가 정한다). */
  onClose?: () => void;
  left: ReactNode;
  right: ReactNode;
  /** 펼침면 하단 가운데 쪽 번호("1 / 4"). */
  footer?: ReactNode;
  onPrevious?: () => void;
  onNext?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  /** 좌우 방향키로도 넘길 수 있게 하는 접근성 안내. */
  ariaLabel?: string;
}

export function CollectionSpreadPage({
  onClose,
  left,
  right,
  footer,
  onPrevious,
  onNext,
  canGoPrevious = false,
  canGoNext = false,
  ariaLabel = '펼친 책. 왼쪽·오른쪽 방향키로 페이지를 넘길 수 있어요.',
}: CollectionSpreadPageProps) {
  return (
    <div className="relative mx-auto w-full max-w-[1160px]">
      {/* 뒤에 쌓인 종이 2겹 — 415 노트 페이지와 같은 오프셋·색이다. */}
      <div className="pointer-events-none absolute inset-0 translate-x-[14px] translate-y-[14px] rounded-[18px] bg-[#f2ece5] shadow-[0_24px_48px_-20px_rgba(60,54,48,0.28)]" />
      <div className="pointer-events-none absolute inset-0 translate-x-[7px] translate-y-[7px] rounded-[18px] bg-[#faf7f6] shadow-[0_18px_36px_-18px_rgba(60,54,48,0.22)]" />

      <div
        role="group"
        tabIndex={0}
        aria-label={ariaLabel}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            onNext?.();
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            onPrevious?.();
          }
        }}
        className="relative z-10 flex h-[min(760px,calc(100dvh-88px))] min-h-[520px] flex-col rounded-[18px] bg-white shadow-[0_30px_60px_-24px_rgba(60,54,48,0.35)] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#4f9b78]"
        style={{
          backgroundImage: 'radial-gradient(rgba(120,110,100,0.025) 1px, transparent 1px)',
          backgroundSize: '4px 4px',
        }}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute right-5 top-5 z-40 grid h-9 w-9 place-items-center rounded-full bg-[#f0ece7] text-[15px] text-[#6f6a63] transition-colors hover:bg-[#e2ddd6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f9b78]"
          >
            ✕
          </button>
        )}

        {canGoPrevious && onPrevious && (
          <PageTurnZone side="left" label="이전 장" onClick={onPrevious} />
        )}
        {canGoNext && onNext && <PageTurnZone side="right" label="다음 장" onClick={onNext} />}

        <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
          {/* 접힌 자국. md 미만에서는 두 면이 위아래로 쌓여 접힘 자체가 없다. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-6 left-1/2 z-20 hidden w-20 -translate-x-1/2 md:block"
            style={{ backgroundImage: BOOK_FOLD_SHADE }}
          />

          <div
            role="presentation"
            onClick={(event) => {
              if (isPageTurnClick(event)) {
                onPrevious?.();
              }
            }}
            className="flex min-h-0 flex-1 flex-col px-9 pb-6 pt-11 md:w-1/2 md:pl-12 md:pr-9"
          >
            {left}
          </div>

          <div
            role="presentation"
            onClick={(event) => {
              if (isPageTurnClick(event)) {
                onNext?.();
              }
            }}
            className="flex min-h-0 flex-1 flex-col px-9 pb-6 pt-11 md:w-1/2 md:pl-9 md:pr-12"
          >
            {right}
          </div>
        </div>

        {footer && (
          <div className="flex-none pb-5 pt-1 text-center text-[12px] tracking-[0.08em] text-[#a29d95]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
