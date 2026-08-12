import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SearchResultItem } from '@/features/search/api/searchRecords';
import { ContextStickyNote } from '@/shared/ui/ContextStickyNote';
import { PaperNoteParts } from '@/shared/ui/PaperNoteParts';
import { PinPushMount, PinStanding } from '@/shared/ui/PinSymbols';
import { FOCUSABLE_SELECTOR } from '@/shared/lib/focusableSelector';

interface SearchResultGalleryProps {
  items: SearchResultItem[];
  onSelectRecord: (recordId: number) => void;
}

const SEARCH_RESULT_PAGE_SIZE = 6;
const DRAG_THRESHOLD_PX = 6;
const SEARCH_NOTE_METRICS = {
  bodyFontPx: 18,
  bodyLineHeightPx: 22,
  metaFontPx: 9,
  padXPx: 14,
  padTopPx: 18,
  padBottomPx: 12,
  dividerGapPx: 6,
} as const;

/**
 * 스마트 검색 결과 갤러리: PC 한 쪽에 2행 × 3열로 놓이는 종이 메모 목록.
 * 근거: Jira S15P11A705-165, mockup(PinLog.responsive.dc.html) home-coverflow(1063~1104행).
 * 목업은 3D coverflow(카드 겹침) 효과를 쓰지만, 이번 범위는 가로 스크롤 + 카드 형태로 충분하다고
 * 명시돼 있어 완전한 3D 구현은 하지 않았다.
 * 검색 응답(08_API_명세 6.1)의 matchedContext는 Record당 정확히 1개뿐이라, 카드 하나에
 * 포스트잇은 항상 1개만 그린다(목업의 "최대 3개" 가정과 달리 API가 여러 개를 주지 않는다).
 * 카드 클릭은 라우트 이동(SearchResultItem.tsx의 149 패턴)이 아니라 RecordDetailOverlay를
 * 여는 로컬 상태 콜백으로 연결한다 — 홈에서는 페이지 이동 없이 모달로 상세를 본다.
 *
 * S15P11A705-425: 맥락 표시는 새로 그리지 않고 기존 `ContextStickyNote`(shared/ui)를 그대로
 * 재사용한다 — Record 상세·Collection 상세와 같은 포스트잇 문법을 검색 결과에도 유지한다.
 * `POST /search/records`는 "내 기록의 맥락"만 검색하므로(api-contract.md "Place · 지도 · 검색"
 * 표) matchedContext.body는 항상 본인 Context 원문이라 공개 범위 규칙(타인 Context 원문 비공개)
 * 위반이 아니다. attachment='flat'을 쓴 이유는 lifted보다 회전·그림자가 절제돼 있어 좁은
 * 카드 안에서 다른 항목(이름·위치·키워드)과 부딪히지 않기 때문 — 디자인 시안이 도착하면
 * 이 선택은 다시 확인한다. S15P11A705-438부터 한 페이지는 6장(2행 × 3열)이다. 일곱 번째부터
 * 다음 종이 쪽에 놓고 페이지 단위로 넘긴다. 카드 외곽은 반듯한 노트 한 장과 뒤에 겹친 종이만
 * 남기고, 바깥 노트의 부착 장식은 앱 공용 `PinPushMount`로 통일한다. 안쪽 Context는 다른
 * 화면과 같은 공용 컴포넌트 판형(파스텔 종이·테이프)을 그대로 유지한다.
 * editable을 넘기지 않는다(기본 false) — 검색 결과 카드는 Context를 고치는 자리가 아니다.
 */
export function SearchResultGallery({ items, onSelectRecord }: SearchResultGalleryProps) {
  const total = items.length;
  const pageCount = Math.ceil(total / SEARCH_RESULT_PAGE_SIZE);
  const pages = Array.from({ length: pageCount }, (_, pageIndex) =>
    items.slice(pageIndex * SEARCH_RESULT_PAGE_SIZE, (pageIndex + 1) * SEARCH_RESULT_PAGE_SIZE),
  );
  const galleryId = useId();
  const galleryRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);
  const didDragRef = useRef(false);
  const isDraggingRef = useRef(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const scrollToPage = (nextPageIndex: number) => {
    const gallery = galleryRef.current;
    if (gallery === null) {
      return;
    }

    const boundedPageIndex = Math.max(0, Math.min(nextPageIndex, pageCount - 1));
    const targetPage = gallery.querySelectorAll<HTMLElement>('.pl-results__page')[boundedPageIndex];
    if (targetPage === undefined) {
      return;
    }

    setPageIndex(boundedPageIndex);
    gallery.scrollTo({ left: targetPage.offsetLeft, behavior: 'smooth' });
  };

  const handleGalleryScroll = () => {
    const gallery = galleryRef.current;
    if (gallery === null) {
      return;
    }

    const pageStarts = Array.from(gallery.querySelectorAll<HTMLElement>('.pl-results__page')).map(
      (page) => page.offsetLeft,
    );
    const nearestPageIndex = pageStarts.reduce(
      (nearest, start, index) =>
        Math.abs(gallery.scrollLeft - start) < Math.abs(gallery.scrollLeft - pageStarts[nearest])
          ? index
          : nearest,
      0,
    );
    setPageIndex(nearestPageIndex);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    const gallery = galleryRef.current;
    if (gallery === null) {
      return;
    }
    dragStartXRef.current = event.clientX;
    dragStartScrollLeftRef.current = gallery.scrollLeft;
    didDragRef.current = false;
    isDraggingRef.current = true;
    setIsDragging(true);
    gallery.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const gallery = galleryRef.current;
    if (!isDraggingRef.current || gallery === null) {
      return;
    }
    const deltaX = event.clientX - dragStartXRef.current;
    if (Math.abs(deltaX) >= DRAG_THRESHOLD_PX) {
      didDragRef.current = true;
    }
    if (didDragRef.current) {
      gallery.scrollLeft = dragStartScrollLeftRef.current - deltaX;
    }
  };

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const gallery = galleryRef.current;
    if (!isDraggingRef.current || gallery === null) {
      return;
    }
    isDraggingRef.current = false;
    setIsDragging(false);
    if (gallery.hasPointerCapture(event.pointerId)) {
      gallery.releasePointerCapture(event.pointerId);
    }
    if (didDragRef.current) {
      const pages = Array.from(gallery.querySelectorAll<HTMLElement>('.pl-results__page'));
      const nearestPageIndex = pages.reduce(
        (nearest, page, index) =>
          Math.abs(gallery.scrollLeft - page.offsetLeft) <
          Math.abs(gallery.scrollLeft - pages[nearest].offsetLeft)
            ? index
            : nearest,
        0,
      );
      scrollToPage(nearestPageIndex);
    }
  };

  return (
    <div className="pl-results__viewport">
      <div
        ref={galleryRef}
        id={galleryId}
        className={`pl-results__gallery${isDragging ? ' pl-results__gallery--dragging' : ''}`}
        role="region"
        aria-label={`검색 결과 ${total}곳`}
        tabIndex={0}
        onScroll={handleGalleryScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onClickCapture={(event) => {
          if (didDragRef.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        {pages.map((pageItems, pageNumber) => (
          <div
            key={`search-page-${pageNumber}`}
            className="pl-results__page"
            aria-label={`${pageNumber + 1}번째 검색 결과 페이지`}
          >
            {pageItems.map((item, itemIndex) => {
              const resultIndex = pageNumber * SEARCH_RESULT_PAGE_SIZE + itemIndex;
              return (
                <button
                  key={item.recordId}
                  type="button"
                  onClick={() => onSelectRecord(item.recordId)}
                  className="pl-results__card"
                >
                  <PinPushMount
                    height={30}
                    className="-top-3 left-1/2 -translate-x-1/2 text-log-mint"
                  />
                  <p className="pl-results__index">
                    장소 {resultIndex + 1}/{total}
                  </p>

                  <div className="pl-results__place">
                    <p className="pl-results__place-name">{item.place.name}</p>
                    <p className="pl-results__address">{item.place.address}</p>
                  </div>

                  {item.keywords.length > 0 ? (
                    <div className="pl-results__keywords">
                      {item.keywords.map((keyword) => (
                        <span key={keyword} className="pl-results__keyword">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  ) : item.keywordStatus === 'PROCESSING' ? (
                    <p className="pl-results__keyword-status">AI가 키워드를 분석 중이에요</p>
                  ) : (
                    <p className="pl-results__keyword-status">이 기록엔 키워드가 없어요</p>
                  )}

                  <div className="pl-results__context">
                    <ContextStickyNote
                      contextId={item.matchedContext.contextId}
                      body={item.matchedContext.body}
                      createdAt={item.matchedContext.createdAt}
                      attachment="flat"
                      metrics={SEARCH_NOTE_METRICS}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {pageCount > 1 && (
        <nav className="pl-results__controls" aria-label="검색 결과 페이지">
          <button
            type="button"
            className="pl-results__page-button"
            aria-controls={galleryId}
            aria-label="이전 검색 결과 6개"
            disabled={pageIndex === 0}
            onClick={() => scrollToPage(pageIndex - 1)}
          >
            ‹
          </button>
          <span className="pl-results__page-track" aria-hidden="true">
            <span
              className="pl-results__page-thumb"
              style={{
                width: `${100 / pageCount}%`,
                transform: `translateX(${pageIndex * 100}%)`,
              }}
            />
          </span>
          <span className="pl-results__page-status" aria-live="polite">
            {pageIndex + 1}/{pageCount}
          </span>
          <button
            type="button"
            className="pl-results__page-button"
            aria-controls={galleryId}
            aria-label="다음 검색 결과 6개"
            disabled={pageIndex === pageCount - 1}
            onClick={() => scrollToPage(pageIndex + 1)}
          >
            ›
          </button>
        </nav>
      )}
    </div>
  );
}

interface SearchEmptyModalProps {
  isOpen: boolean;
  /** ESC·배경 클릭으로 닫을 때. */
  onClose: () => void;
  /** 하단 CTA. 호출부가 검색 상태를 정리하고 장소 추가 시트를 여는 동작을 책임진다. */
  onAddPlace: () => void;
}

/**
 * S15P11A705-426: 검색 결과가 0건일 때의 안내를 상태 텍스트(`.pl-status`)가 아니라 모달로 띄운다.
 *
 * 종전에는 "그 문장으로는 아직 찾지 못했습니다" 문구가 도크 바로 아래(`.pl-status`)에 얹혔는데,
 * 도크는 창이 열리면 위로 올라가 상단 워드마크(`HomeTopmark` — `.pl-topmark`)와 같은 자리를
 * 지나간다. 그 순간 두 글자가 겹쳐 보이는 것이 이 티켓이 없애려는 문제다. 문구를 지면 위 텍스트가
 * 아니라 화면 중앙의 별도 레이어(모달)로 옮기면 도크·워드마크가 어디에 있든 겹칠 수가 없다.
 *
 * 새로 그리지 않고 재사용한 것:
 * - `PaperNoteParts`(마스킹 테이프 + 접힌 모서리) — 종이 메모지 장식은 여기 것을 그대로 쓴다.
 *   테이프 기울기만 `[&_.pl-note-tape]:-rotate-3`로 살짝 준다(기본값은 회전이 없다 — 그 값은
 *   `.pl-note-list`/`.pl-note-add`처럼 특정 부모 클래스에 걸려 있는데, 이 모달은 그 계열이 아니다).
 * - `PinStanding`(마커 핀 심볼) — 시안의 "민트색 지도 핀 아이콘" 자리에 currentColor로 색만
 *   입혀 쓴다. 새 SVG를 그리지 않는다.
 * - 포커스 트랩·ESC 닫기·포커스 복귀는 `ConfirmDialog`(shared/ui)와 같은 패턴이다. 그쪽의
 *   `FOCUSABLE_SELECTOR`(shared/lib)를 그대로 가져다 쓴다.
 *
 * 새로 만든 것 — **스프링 바인더 구멍**은 재사용할 부품이 없어(grep으로 확인, 아무 데도 없다)
 * 여기서 처음 만든다. 진짜 종이를 오려낸 것처럼 배경까지 뚫는 mask 기법(`.pl-diary-card`가 쓰는
 * 방식)이 더 정확하지만, 이 모달은 배경이 고정된 딤(#042142/45%) 한 색이라 눌린 자국(inset
 * box-shadow)만으로도 같은 인상을 준다 — 마스크만큼 손이 가지 않는 쪽을 택했다.
 *
 * ⚠️ 배경 클릭으로 닫는다. `ConfirmDialog`는 파괴적 확인이라 배경 클릭을 막지만, 이 모달은
 * 잃을 입력이 없는 안내문이라 정책이 다르게 적용된다(같은 파일 안의 두 모달이 서로 다른 배경
 * 클릭 정책을 갖는 게 아니라, 이 결정은 ConfirmDialog의 정책과는 별개로 이 모달 하나에만 해당).
 *
 */
export function SearchEmptyModal({ isOpen, onClose, onAddPlace }: SearchEmptyModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // 열릴 때 CTA로 포커스를 옮기고, 닫히면 열기 전 자리로 복귀한다(ConfirmDialog와 같은 규칙).
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const previouslyFocused = document.activeElement as HTMLElement | null;
    retryButtonRef.current?.focus();
    return () => {
      if (previouslyFocused !== null && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

  // ESC 닫기 + Tab 포커스 트랩.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || panelRef.current === null) {
        return;
      }
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusables.length === 0) {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const isInside = panelRef.current.contains(active);

      if (event.shiftKey && (active === first || !isInside)) {
        event.preventDefault();
        last.focus();
        return;
      }
      if (!event.shiftKey && (active === last || !isInside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-pin-navy/45 p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-xs rounded-md bg-[#faf7f6] px-8 pb-8 pt-10 text-center shadow-[0_24px_50px_rgba(4,33,66,.3)] [&_.pl-note-tape]:-rotate-3"
      >
        <PaperNoteParts />

        {/* 스프링 바인더 구멍 — 왼쪽 가장자리 세로 한 줄. 카드 밖으로 절반 걸치게 진하게. */}
        <div
          className="absolute inset-y-8 -left-2 flex flex-col justify-between"
          aria-hidden="true"
        >
          {Array.from({ length: 8 }).map((_, index) => (
            <span
              key={index}
              className="h-3.5 w-3.5 rounded-full bg-[#e4ddd0] shadow-[inset_0_1.5px_3px_rgba(74,60,36,.4)]"
            />
          ))}
        </div>

        <PinStanding height={40} className="mx-auto mb-4 text-log-mint" />

        <h2 id={titleId} className="text-xl font-bold leading-snug text-pin-navy">
          아직 남긴 기억이 없어요
        </h2>

        <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-ink-gray">
          마음에 드는 장소를 찾아
          <br />첫 기록을 남겨보세요
        </p>

        <button
          ref={retryButtonRef}
          type="button"
          onClick={onAddPlace}
          className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-log-mint px-6 py-2.5 text-sm font-bold text-pin-navy transition-transform hover:-translate-y-0.5"
        >
          장소 추가하기
          <span aria-hidden="true">›</span>
        </button>
      </div>
    </div>,
    document.body,
  );
}
