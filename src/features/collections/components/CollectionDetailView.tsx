import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { useEditCollectionTitle } from '@/contexts/useEditCollectionTitle';
import { useCollectionDeleteConfirm } from '@/contexts/useCollectionDeleteConfirm';
import { useCollectionSpread } from '@/contexts/useCollectionSpread';
import { useDeleteConfirm } from '@/contexts/useDeleteConfirm';
import { ErrorState } from '@/shared/ui/ErrorState';
import { ShelfExploreSection } from '@/features/feed/components/ShelfExploreSection';
import { ContextStickyNoteCard } from '@/features/records/components/ContextStickyNoteCard';
// 378: 핀 상세(373)와 같은 손붙임 배치 문법을 쓴다 — 두 화면의 포스트잇 인상이 갈리면 안 된다.
import { contextNoteScatterStyle } from '@/features/records/components/contextNoteScatter';
import { DeleteConfirmDialog } from '@/features/records/components/DeleteConfirmDialog';
import type { CollectionDetail } from '../api/getCollectionDetail';
import { useCollectionDetailQuery } from '../hooks/useCollectionDetailQuery';
import { AddRecordToCollectionDialog } from './AddRecordToCollectionDialog';
import {
  COLLECTION_ACCENT_ACTION_CLASS,
  COLLECTION_ACTION_CLASS,
  COLLECTION_DANGER_ACTION_CLASS,
  COLLECTION_FOCUS_RING_CLASS,
} from './collectionActionStyles';
// 378 바인더 질감 스킨. 이 화면의 질감·테이프·찢은 종이 표현은 전부 이 모듈에 모여 있다(롤백 지점).
import {
  BINDER_PAGE_SURFACE,
  BINDER_PHOTO_FRAME_CLASS,
  BINDER_TAPE_CLASS,
  binderTapeStyle,
} from './collectionBinderSkin';
import { CollectionIndexRail } from './CollectionIndexRail';
import { CollectionRecordPhoto } from './CollectionRecordPhoto';
import { CollectionOverlayCloseButton } from './CollectionOverlayShell';
import { CollectionSpreadMap } from './CollectionSpreadMap';
import { RecordRemoveButton } from './RecordRemoveButton';
import { RecordSaveButton } from './RecordSaveButton';

export type CollectionRecordItem = CollectionDetail['records']['items'][number];

// 332 디자인 피드백(펼친 책 레퍼런스): 책 바깥 모서리에는 낱장 종이의 단면이 촘촘하게 겹쳐 보인다.
// 이전 구현처럼 div를 두세 겹 쌓으면 "종이 두 장"이지 두꺼운 책이 되지 않아서, 2px 주기의
// repeating-linear-gradient로 수십 장의 단면을 한 번에 만든다(Shelf.tsx의 나뭇결 PLANK_GRAIN_IMAGE와
// 같은 판단 — 반복 패턴은 요소를 쌓지 않고 background-image로 그린다).
// ⚠️ 두 값은 브랜드 색이 아니라 레퍼런스 사진에서 뽑은 종이 단면의 밝은 면/그늘이다. 책 프레임
// 밖에서 쓰지 않는다(tailwind.config.js에 토큰으로 올리지 않은 이유이기도 하다).
const PAGE_EDGE_LIGHT = '#F7F2EA';
const PAGE_EDGE_DARK = '#DBD0BF';
// 좌·우 모서리(세로 방향 단면): 선이 페이지 가장자리와 나란히 서도록 가로로 반복한다.
const PAGE_EDGE_VERTICAL = `repeating-linear-gradient(to right, ${PAGE_EDGE_LIGHT} 0 1px, ${PAGE_EDGE_DARK} 1px 2px)`;
// 아래 모서리(가로 방향 단면): 같은 패턴을 90도 돌린 것.
const PAGE_EDGE_HORIZONTAL = `repeating-linear-gradient(to bottom, ${PAGE_EDGE_LIGHT} 0 1px, ${PAGE_EDGE_DARK} 1px 2px)`;
// 가운데 골(gutter): 종이가 제본 쪽으로 휘어 들어가며 지는 그늘. 양쪽 페이지에 대칭으로 깔린다.
const BOOK_GUTTER_SHADE =
  'linear-gradient(to right, rgba(4,33,66,0) 0%, rgba(4,33,66,0.05) 30%, rgba(4,33,66,0.14) 48%, rgba(4,33,66,0.16) 50%, rgba(4,33,66,0.14) 52%, rgba(4,33,66,0.05) 70%, rgba(4,33,66,0) 100%)';

// 332 디자인 피드백("책과 책장이 너무 작다"): 책과 오른쪽 책장은 나란히 서므로 같은 높이를 쓴다.
// xl에서 720px인 이유는 책장 쪽 제약이다 — 캐비닛이 3행(SHELF_DEFAULT_VISIBLE_ROW_COUNT)을 스크롤
// 없이 담으려면 행 높이(SPINE_MAX_HEIGHT 190 × --shelf-scale + 선반 10px)가 3개 + 라벨·패딩이
// 들어가야 하고, xl(--shelf-scale이 1)에서 그 합이 대략 이 값이다.
const BOOK_HEIGHT_CLASS = 'md:h-[600px] xl:h-[720px]';
// 책장은 lg부터 나란히 서므로 브레이크포인트만 다르다. ⚠️ 문자열 조작으로 만들면 Tailwind가
// 스캔하지 못해 클래스 자체가 생성되지 않는다 — 반드시 리터럴로 적는다.
const SHELF_HEIGHT_CLASS = 'lg:h-[600px] xl:h-[720px]';

// 332 디자인 피드백 1번: 왼쪽 페이지는 지도가 거의 다 차지해 "이전으로 가려면 어디를 눌러야 하는지"를
// 알 수 없었다(지도 위 클릭은 지도 조작이라 전파를 끊어 둔 상태다). 지도를 줄이는 대신, 실제 책에서
// 페이지를 넘길 때 잡는 자리인 **바깥 모서리**에 세로 전체 높이의 넘김 영역을 둔다 — 지도 크기를
// 그대로 두면서 클릭 대상이 항상 같은 자리에 있게 하는 방법이다. 평소에는 보이지 않다가 호버하면
// 옅은 음영과 화살표가 떠 눌러도 되는 자리임을 알린다.
// 353: 이 영역은 페이지 내용 위(z-30)에 얹히므로 **페이지의 바깥 여백보다 넓으면 안 된다.** 처음엔
// 양쪽 모두 w-14(56px)였는데, 오른쪽 페이지의 바깥 여백은 md:pr-10(40px)·왼쪽은 md:pl-8(32px)이라
// 나머지 16px·24px이 본문 위를 덮고 있었다 — '저장하기' 버튼과 목차 항목의 오른쪽 끝, 지도의 왼쪽
// 끝이 그 띠 아래에 깔려 눌러도 넘김만 실행됐다. 폭은 각 페이지의 여백 클래스와 짝을 이루므로
// 한쪽을 바꾸면 다른 쪽도 함께 바꾼다(md:pr-10 ↔ w-10, md:pl-8 ↔ w-8).
const PAGE_TURN_ZONE_WIDTH_CLASS = { left: 'w-8', right: 'w-10' } as const;

function PageTurnZone({
  side,
  label,
  onClick,
}: {
  side: 'left' | 'right';
  label: string;
  onClick: () => void;
}) {
  const isLeft = side === 'left';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      // 356: 이 영역도 button이라 Tab 대상이다 — 호버/포커스 시 뜨는 음영·화살표만으로는 브라우저
      // 기본 사각형을 대체하지 못해 함께 그려졌다. 같은 브랜드 아웃라인을 쓴다(음영·화살표는 그대로
      // 남아 "넘길 수 있는 자리"라는 의미를 계속 전한다).
      className={`group absolute inset-y-0 z-30 hidden items-center justify-center md:flex ${COLLECTION_FOCUS_RING_CLASS} ${
        PAGE_TURN_ZONE_WIDTH_CLASS[side]
      } ${isLeft ? 'left-0' : 'right-0'}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 ${
          isLeft
            ? 'bg-gradient-to-r from-pin-navy/10 to-transparent'
            : 'bg-gradient-to-l from-pin-navy/10 to-transparent'
        }`}
      />
      {/* 흰 알약 버튼은 종이 위에 이물질처럼 얹혀 보였다(피드백 3번) — 배경·테두리·라운드를 모두
          빼고 종이보다 조금 짙은 잉크색 홑화살표만 남긴다. 음영 그라디언트가 자리를 알려주는 역할을
          이미 하므로 화살표는 방향만 가리키면 된다. */}
      <span className="relative text-3xl font-light leading-none text-pin-navy/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
        {isLeft ? '‹' : '›'}
      </span>
    </button>
  );
}

// 353: 페이지 면 전체가 넘김 클릭 영역이라(아래 좌·우 페이지 div의 onClick), 그 위에 놓인 컨트롤을
// 눌러도 클릭이 페이지까지 버블링해 장이 함께 넘어갔다 — '저장하기'는 저장되면서 다음 장으로,
// 목차 항목은 해당 스프레드 대신 다음 장으로 갔다. 컨트롤마다 stopPropagation을 흩뿌리면 컨트롤이
// 하나 늘 때마다 같은 버그가 되살아나므로, "무엇이 넘김이 아닌가"를 이 한 곳에서 정의한다.
//  - 인터랙티브 요소(그 안쪽 텍스트·아이콘에서 시작한 클릭 포함)
//  - 넘김을 원치 않는다고 명시한 영역(data-page-turn="ignore") — 지도·포스트잇 스택처럼 요소 자체는
//    버튼이 아니지만 조작 대상인 곳에 붙인다.
// 그 밖의 페이지 여백·본문 클릭은 그대로 다음/이전 장이다(332가 만든 "책장을 넘기듯" 조작 유지).
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

// 시안의 주소 앞 초록 핀. 기존 `📍` 이모지는 OS마다 모양·색이 달라 초록 톤을 맞출 수 없어 SVG로 바꾼다.
function PlacePinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 flex-none fill-log-mint">
      <path d="M12 2c-3.87 0-7 3.13-7 7 0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}

interface CollectionDetailViewProps {
  collectionId: number;
  // Feed(142) 경유 진입일 때만 채워진다 — 그 외 진입(내 책장·직접 URL 등)은 undefined다(하위 호환).
  feedRequestId?: string;
  feedPosition?: number;
  // 332: 오른쪽 책장에서 다른 Collection으로 넘어온 진입인지(router.tsx HistoryState.shelfContext).
  // 그 책장을 계속 세워 두기 위한 값이라 Feed 이벤트와는 무관하다.
  hasShelfContext?: boolean;
  // 오버레이(내부 진입)일 때만 넘어온다 — 책 우상단 닫기 버튼을 그릴지 결정한다.
  onClose?: () => void;
}

// 스프레드 전환 시 내용이 바로 뒤바뀌지 않고 살짝 페이드인하도록 하는 래퍼. 목업의 모바일 전용
// corner-flip 애니메이션은 가져오지 않고, Tailwind transition 유틸 수준으로만 처리한다(171 지시사항 7).
function SpreadFadeIn({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className={`transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {children}
    </div>
  );
}

interface CollectionTocProps {
  records: CollectionRecordItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

// 목업 book-spread의 "목차(CONTENTS)" 페이지 참고 — 전체 record를 순서대로 나열해 클릭 시 해당
// 스프레드로 바로 이동한다(goToIndex). place·keywords는 공개 정보라 ownedByMe와 무관하게 항상 보여줄 수
// 있다(privacy-rules.md 1장이 막는 건 Context 원문·member.id·keyword code뿐이며, 여기서는 다루지 않는다).
function CollectionToc({ records, activeIndex, onSelect }: CollectionTocProps) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-log-mint">Contents</p>
        <p className="text-2xl font-bold text-pin-navy">목차</p>
      </div>
      {/* 356: 크롬은 스크롤 가능한 영역 자체를 키보드 포커스 대상으로 삼는다(키보드로 스크롤할 수
          있어야 하므로) — 그때도 기본 사각형이 뜨므로 같은 아웃라인을 준다. 아래 오른쪽 페이지·
          인덱스 레일의 스크롤 상자도 같은 이유로 함께 처리했다. */}
      <div className={`flex flex-1 flex-col overflow-y-auto ${COLLECTION_FOCUS_RING_CLASS}`}>
        {records.map((record, index) => (
          <button
            key={record.recordId}
            type="button"
            onClick={() => onSelect(index)}
            aria-current={index === activeIndex}
            className={`flex items-center gap-3 border-b border-line-card px-1 py-3 text-left transition-colors ${COLLECTION_FOCUS_RING_CLASS} ${
              index === activeIndex ? 'bg-log-mint/10' : 'hover:bg-line-subtle'
            }`}
          >
            <span className="text-xs font-bold text-log-mint">{index + 1}</span>
            <span className="text-sm font-semibold text-pin-navy">{record.place.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Collection 상세: 펼친 책(플립북) 스타일. 근거: Jira S15P11A705-171, 목업 book-spread/openBook(UI만 참고).
 * 스프레드 하나 = record 하나. 왼쪽 페이지는 로드된 모든 record 위치를 지도에 고정 표시하고 현재 record만
 * 강조하며(CollectionSpreadMap), 오른쪽 페이지는 그 record의 place·keywords·(ownedByMe면) Context를 보여준다.
 * ownedByMe로 소유자/타인을 구분한다(privacy-rules.md 1장) — 타인 조회는 contexts가 null이라 렌더링하지 않는다.
 */
export function CollectionDetailView({
  collectionId,
  feedRequestId,
  feedPosition,
  hasShelfContext = false,
  onClose,
}: CollectionDetailViewProps) {
  const detailQuery = useCollectionDetailQuery(collectionId);
  const editTitleState = useEditCollectionTitle();
  const collectionDeleteConfirm = useCollectionDeleteConfirm();
  const spreadState = useCollectionSpread();
  // Record의 마지막 Context 삭제 확인(409) 상태. 스프레드 네비게이션과 레이스가 나지 않도록
  // 이 상태가 열려 있는 동안은 다음/이전 이동을 막는다(아래 handleNext/handlePrevious, 203 논의).
  const recordDeleteConfirm = useDeleteConfirm();
  // 217: "내 레코드 추가" 다이얼로그 open 상태. AddToCollectionDialog(216)와 달리 이 화면에서만 열리므로
  // 전역 Context 없이 로컬 state로 둔다(NewCollectionModal과 동일 패턴).
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  // 218: 목차 화면 노출 여부. spreadIndex(CollectionSpreadContext)와 달리 이 화면 안에서만 의미가 있는
  // 토글이라 전역 Context로 올리지 않는다(isAddRecordOpen과 동일한 판단).
  // 332 디자인 피드백: 목차가 "하단 버튼으로 여는 패널"에서 "책을 펼치면 나오는 첫 페이지"가 됐다 —
  // 그래서 초기값이 true다. record 페이지는 그 다음 장부터다(handleNext/handlePrevious 참고).
  const [isTocOpen, setIsTocOpen] = useState(true);
  // 332 디자인 피드백: lg 미만에서는 오른쪽 책장을 나란히 둘 가로 폭이 없어 서랍(오른쪽에서 슬라이드)으로
  // 연다. 책을 고르면 다른 Collection으로 이동하므로 그때 닫는다(ShelfExploreSection.onSelectCollection).
  const [isShelfOpen, setIsShelfOpen] = useState(false);

  // 진입 시 hasNextPage가 false가 될 때까지 자동으로 순차 로드한다 — 왼쪽 지도가 Collection의 모든 record를
  // 한 번에 보여줘야 하기 때문이다(넘길 때마다 핀이 하나씩 느는 방식이 아님). 사용자 조작(다음 버튼)과
  // 무관하게 백그라운드에서 진행되고, 우측 페이지 넘김은 이미 로드된 record 안에서 로컬 인덱스 이동만
  // 한다(아래 handleNext/handlePrevious). isFetchNextPageError면 더 재시도하지 않고 로드된 만큼만 쓴다.
  // detailQuery 전체가 아니라 실제로 쓰는 필드만 분해해 의존성으로 둔다 — detailQuery는 매 렌더 새
  // 객체라 통째로 deps에 넣으면 매번 effect가 도는 것과 다르지 않다(react-hooks/exhaustive-deps 대응).
  const { data, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } =
    detailQuery;
  useEffect(() => {
    if (data && hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [data, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  if (detailQuery.isPending) {
    // 332 피드백 2번(책장에서 새 책을 열 때 화면이 번쩍임): 예전에는 여기서 한 줄짜리 "불러오는 중…"만
    // 반환해 책도 책장도 통째로 사라졌다가 다시 나타났다 — 레이아웃이 붕괴했다 복구되는 그 한 프레임이
    // 번쩍임의 정체였다. 이제 같은 골격(책 크기의 자리 + 오른쪽 책장)을 그대로 유지하고 안쪽 내용만
    // 비운다. 책장은 자기 데이터를 따로 가지므로 여기서 함께 렌더해 두면 자리를 지킨다.
    // ownedByMe를 아직 모르므로 책장 노출 조건은 진입 맥락만으로 판단한다(로드 후 실제 조건으로 정정된다).
    const mayShowShelf = feedRequestId !== undefined || hasShelfContext;
    return (
      <main
        className={`mx-auto flex w-full flex-col gap-6 p-6 md:p-8 ${
          mayShowShelf ? 'max-w-[1560px]' : 'max-w-6xl'
        }`}
      >
        {/* ⚠️ 아래 자리표시자들의 크기는 로드 후 실제 요소와 같아야 한다 — 1차 시도에서 인덱스 레일
            자리(80px)를 비워 두는 걸 빠뜨려, 내용이 도착하는 순간 책이 가로로 80px 밀렸다. 그
            "밀림"이 남아 있던 번쩍임의 정체였다(캐시된 Collection은 이 분기를 아예 거치지 않아
            멀쩡했다). 헤더 높이·하단 페이지 표시 줄도 같은 이유로 자리를 잡아 둔다. */}
        <div className="min-h-11" />
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-4 lg:order-2">
            <div className="flex items-start">
              <div className="relative flex-1">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-2 z-10 rounded-[20px] bg-gradient-to-b from-line-subtle via-line-card to-line-card shadow-[0_45px_80px_-32px_rgba(4,33,66,0.5),0_10px_24px_-12px_rgba(4,33,66,0.25)]"
                />
                <div
                  className={`relative z-10 grid h-[380px] place-items-center overflow-hidden rounded-[14px] bg-snow-white text-sm text-ink-gray ${BOOK_HEIGHT_CLASS}`}
                >
                  불러오는 중…
                </div>
              </div>
              {/* 인덱스 레일 자리. 레일과 같은 폭·같은 브레이크포인트여야 한다. */}
              <div aria-hidden="true" className="hidden w-20 flex-none md:block" />
            </div>
            {/* 하단 페이지 표시 줄 자리 */}
            <p className="flex h-7 items-center justify-center text-sm text-transparent md:pr-20">
              &nbsp;
            </p>
          </div>
          {mayShowShelf && (
            <aside
              className={`hidden w-[360px] flex-none lg:order-1 lg:block xl:w-[420px] ${SHELF_HEIGHT_CLASS}`}
            >
              <ShelfExploreSection collectionId={collectionId} />
            </aside>
          )}
        </div>
      </main>
    );
  }

  if (detailQuery.isError) {
    // 08_API_명세: 존재하지 않거나 비공개인 Collection은 404 RESOURCE_NOT_FOUND로 응답한다(소유 여부 은닉).
    const isNotFound = detailQuery.error.code === 'RESOURCE_NOT_FOUND';
    return (
      <div className="p-8">
        <ErrorState
          title={isNotFound ? '컬렉션을 찾을 수 없어요' : '컬렉션을 불러오지 못했어요'}
          description={
            isNotFound ? '삭제되었거나 접근할 수 없는 컬렉션이에요.' : '잠시 후 다시 시도해 주세요.'
          }
        />
      </div>
    );
  }

  const pages = detailQuery.data.pages;
  const { title, ownedByMe } = pages[0];
  // pages를 flatMap해 하나의 목록으로만 쓰지 않는다(레코드 목록 렌더링 용도가 아니라, 지도 마커 전체 목록과
  // 순서 있는 인덱싱 용도다). 전체 로드는 위 useEffect가 자동으로 끝내므로, 여기서는 로드 완료 여부만
  // 판단한다(isLoadingAllPlaces) — hasNext 기반으로 다음 페이지를 직접 요청하는 로직은 없다.
  const flatRecords = pages.flatMap((page) => page.records.items);
  const isLoadingAllPlaces = detailQuery.hasNextPage && !detailQuery.isFetchNextPageError;
  // 217: 전체 로드가 끝나기 전에는 이 목록이 불완전해 "이미 담김" 필터링을 신뢰할 수 없다 —
  // 그동안은 아래 titleHeader의 "레코드 추가" 버튼 자체를 막는다(isLoadingAllPlaces).
  const excludedRecordIds = new Set(flatRecords.map((record) => record.recordId));

  // 332 디자인 피드백: 오른쪽 책장("이 작성자의 다른 컬렉션")은 **Feed 경유 진입일 때만** 세운다.
  // Library(내 책장·팔로우한 책장)에서 연 Collection은 책만 크게 보여준다는 확정 때문이다.
  // 그 판단 근거는 이미 있는 feedRequestId search param이다 — Feed(142)를 거친 진입에만 채워지고
  // 그 외 진입(내 책장·팔로우한 책장·직접 URL)은 undefined다. 내 Collection은 Feed에 뜨지 않지만,
  // 책장 패널이 Follow/Unfollow를 함께 다루므로 ownedByMe도 함께 막아 자기 책장에 팔로우 버튼이
  // 붙는 상태를 구조적으로 배제한다.
  // 책장 자체를 클릭해 넘어온 진입(hasShelfContext)도 같은 맥락으로 본다 — 그러지 않으면 책장에서
  // 다른 컬렉션을 여는 순간 책장이 사라진다(피드백 3번).
  const showShelfPanel = (feedRequestId !== undefined || hasShelfContext) && !ownedByMe;

  // 하단 네비를 없앴으므로(332 피드백) 좁은 화면의 책장 진입점은 헤더로 올린다.
  const shelfToggleButton = showShelfPanel && (
    <button
      type="button"
      onClick={() => setIsShelfOpen(true)}
      className={`${COLLECTION_ACCENT_ACTION_CLASS} lg:hidden`}
    >
      책장 보기
    </button>
  );

  // 332 시안: 짙은 남색 바를 걷어내고 아이보리 배경 위에 남색 굵은 제목 + 라이트 아웃라인 필 버튼만
  // 남긴다. 바가 사라지면서 제목이 책 프레임과 같은 배경을 공유해 "책 위에 붙은 표제"처럼 읽힌다.
  const titleHeader = (
    <header className="flex min-h-11 flex-wrap items-center justify-between gap-4 px-1">
      <h1 className="text-2xl font-extrabold text-pin-navy md:text-3xl">{title}</h1>

      <div className="flex flex-none items-center gap-2">
        {shelfToggleButton}
        {ownedByMe && (
          <>
            <button
              type="button"
              onClick={() => setIsAddRecordOpen(true)}
              disabled={isLoadingAllPlaces}
              className={COLLECTION_ACTION_CLASS}
            >
              {isLoadingAllPlaces ? '목록 불러오는 중…' : '레코드 추가'}
            </button>
            <button type="button" onClick={editTitleState.open} className={COLLECTION_ACTION_CLASS}>
              제목 수정
            </button>
            <button
              type="button"
              onClick={() => collectionDeleteConfirm.open('direct')}
              className={COLLECTION_DANGER_ACTION_CLASS}
            >
              삭제
            </button>
          </>
        )}
      </div>
    </header>
  );

  const addRecordDialog = ownedByMe && (
    <AddRecordToCollectionDialog
      collectionId={collectionId}
      excludedRecordIds={excludedRecordIds}
      isOpen={isAddRecordOpen}
      onClose={() => setIsAddRecordOpen(false)}
    />
  );

  // 오른쪽 책장을 세우는 두 갈래(lg 이상 고정 열 / lg 미만 서랍). record가 하나도 없는 Collection도
  // 작성자의 다른 컬렉션은 그대로 탐색할 수 있어야 해서 아래 빈 상태에서도 같은 것을 쓴다.
  const shelfAside = showShelfPanel && (
    <aside
      className={`hidden w-[360px] flex-none lg:order-1 lg:block xl:w-[420px] ${SHELF_HEIGHT_CLASS}`}
    >
      <ShelfExploreSection collectionId={collectionId} />
    </aside>
  );

  const shelfDrawer = showShelfPanel && (
    <>
      {/* 서랍이 열려 있을 때만 바깥을 덮는다 — 책 자체에는 딤을 두지 않는다는 확정과 별개로, 서랍은
          화면을 가리는 임시 패널이라 바깥 탭으로 닫을 수단이 필요하다. */}
      {isShelfOpen && (
        <div
          className="fixed inset-0 z-30 bg-pin-navy/25 lg:hidden"
          onClick={() => setIsShelfOpen(false)}
          role="presentation"
        />
      )}
      <div
        aria-hidden={!isShelfOpen}
        className={`fixed inset-y-0 right-0 z-30 flex w-[340px] max-w-[88vw] flex-col gap-3 bg-paper-white p-4 shadow-[-20px_0_50px_-20px_rgba(4,33,66,0.4)] transition-transform duration-300 ease-out lg:hidden ${
          isShelfOpen ? 'translate-x-0' : 'pointer-events-none translate-x-full'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsShelfOpen(false)}
          className={`${COLLECTION_ACTION_CLASS} self-end`}
        >
          닫기
        </button>
        <div className="min-h-0 flex-1">
          <ShelfExploreSection
            collectionId={collectionId}
            onSelectCollection={() => setIsShelfOpen(false)}
          />
        </div>
      </div>
    </>
  );

  if (flatRecords.length === 0) {
    return (
      <main
        className={`mx-auto flex w-full flex-col gap-6 p-6 md:p-8 ${
          showShelfPanel ? 'max-w-[1560px]' : 'max-w-6xl'
        }`}
      >
        {titleHeader}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <p className="rounded-2xl border border-line-card bg-snow-white p-8 text-center text-sm text-ink-gray">
              아직 담긴 기록이 없어요.
            </p>
          </div>
          {shelfAside}
        </div>
        {shelfDrawer}
        {addRecordDialog}
      </main>
    );
  }

  const currentIndex = spreadState.spreadIndex;
  const currentRecord = flatRecords[currentIndex];
  // 전체 자동 로드(위 useEffect)가 서버 페이지네이션을 전담하므로, 여기서는 이미 로드된 record 범위
  // 안에서만 이동한다 — 서버 요청은 발생하지 않는다. 아직 로드 중인 다음 record는 배경에서 도착하는
  // 대로 flatRecords가 늘어나 자동으로 다음 버튼이 활성화된다.
  const canGoNext = currentIndex < flatRecords.length - 1;
  const canGoPrevious = currentIndex > 0;

  // Record 강제 삭제 확인(409) 모달이 열려 있는 동안 스프레드를 넘기면 confirm 상태(targetContextId·impact)는
  // 이전 record 것인데 DeleteConfirmDialog에 넘기는 recordId는 새 record 것이 되는 레이스가 생긴다
  // (203 논의). 확인/취소로 닫히기 전까지 이동 자체를 막아 차단한다.
  const isRecordDeleteConfirmOpen = recordDeleteConfirm.isOpen;

  // 332 디자인 피드백: 하단 이전/다음/목차 버튼을 없애고 "책장을 넘기듯" 페이지를 직접 누르게 했다.
  // 페이지 순서는 [목차] → [record 0] → … → [record n-1]이고, 목차는 되돌아갈 수 있는 첫 장이다.
  //  - 오른쪽 페이지 클릭(handleNext): 목차면 첫 record로, 아니면 다음 record로.
  //  - 왼쪽 페이지 클릭(handlePrevious): 첫 record면 목차로, 아니면 이전 record로. 목차에서는 더
  //    앞이 없으므로 아무 일도 하지 않는다.
  // 삭제 확인(409) 모달이 열려 있는 동안 이동을 막는 기존 가드(203 논의)는 두 경로 모두에 그대로 남는다.
  const handleNext = () => {
    if (isRecordDeleteConfirmOpen) {
      return;
    }
    if (isTocOpen) {
      setIsTocOpen(false);
      spreadState.goToIndex(0);
      return;
    }
    if (canGoNext) {
      spreadState.goToNext();
    }
  };

  const handlePrevious = () => {
    if (isRecordDeleteConfirmOpen || isTocOpen) {
      return;
    }
    if (!canGoPrevious) {
      setIsTocOpen(true);
      return;
    }
    spreadState.goToPrevious();
  };

  const handleSelectFromToc = (index: number) => {
    spreadState.goToIndex(index);
    setIsTocOpen(false);
  };

  // 246: 우측 인덱스 레일 탭 클릭. handlePrevious/handleNext(216-226행)와 같은 이유로 Context 강제
  // 삭제 확인(409) 모달이 열려 있는 동안은 이동을 막는다 — currentRecord가 바뀌면 그 모달이 다루는
  // recordId와 어긋나는 레이스가 생긴다(211-214행 주석 참고).
  const handleSelectFromIndexRail = (index: number) => {
    if (!isRecordDeleteConfirmOpen) {
      // 목차가 첫 페이지가 된 뒤로는 레일 클릭도 "그 record 페이지로 넘긴다"는 뜻이라 목차를 닫는다.
      setIsTocOpen(false);
      spreadState.goToIndex(index);
    }
  };

  // 지도 핀 클릭 → 그 record 장으로 이동. 인덱스 레일(handleSelectFromIndexRail)과 같은 이유로
  // Context 강제 삭제 확인(409) 모달이 열려 있는 동안은 막는다 — currentRecord가 바뀌면 그 모달이
  // 다루는 recordId와 어긋나는 레이스가 생긴다.
  const handleSelectFromMap = (recordId: number) => {
    if (isRecordDeleteConfirmOpen) {
      return;
    }
    const index = flatRecords.findIndex((record) => record.recordId === recordId);
    if (index === -1) {
      return;
    }
    setIsTocOpen(false);
    spreadState.goToIndex(index);
  };

  const mapPlaces = flatRecords.map((record) => ({
    recordId: record.recordId,
    name: record.place.name,
    lat: record.place.lat,
    lng: record.place.lng,
  }));

  return (
    <main
      className={`mx-auto flex w-full flex-col gap-6 p-6 md:p-8 ${
        showShelfPanel ? 'max-w-[1560px]' : 'max-w-6xl'
      }`}
    >
      {titleHeader}

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* 332 디자인 피드백: 책이 오른쪽, 책장이 왼쪽이다 — 인덱스 레일이 책 오른쪽 가장자리에
            붙어 있어서, 책이 왼쪽이면 레일과 책장이 가운데서 맞부딪힌다. lg 미만에서는 책장이
            서랍이라 이 순서 자체가 의미가 없다(order는 lg에서만 적용된다). */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:order-2">
          {/* 332 디자인 피드백(펼친 책 레퍼런스). 세 겹으로 만든다.
              (1) 표지 — 페이지보다 사방으로 8px 크게 물려(-inset-2) 종이를 감싼다. 실제 양장본에서
                  표지가 책배보다 조금 큰 그 턱이 "책 같다"는 인상의 절반이다.
              (2) 종이 단면 — 좌·우·아래 모서리에 1px 간격 줄무늬(PAGE_EDGE_*)로 낱장이 수십 장
                  겹친 두께를 만든다.
              (3) 골(gutter) — 가운데로 갈수록 종이가 휘어 들어가며 지는 그늘(BOOK_GUTTER_SHADE).
              인덱스 레일은 이 책 z-10 아래로 왼쪽 끝이 물려 들어간다(CollectionIndexRail 주석). */}
          {/* 하단 이전/다음 버튼을 없앤 대신(332 피드백) 좌우 방향키로도 넘길 수 있게 한다 —
              페이지 클릭만 남기면 키보드 사용자가 스프레드를 이동할 방법이 사라진다. */}
          {/* 356 피드백: 이 래퍼가 tabIndex={0}이라 Tab 한 번에 포커스를 받는데, 책과 인덱스 레일을
              함께 감싸는 가장 큰 상자라 브라우저 기본 파란 사각형이 화면 절반을 두르고 나타났다
              (스크린샷의 "책/우측 영역 둘레 파란 테두리"의 정체다). 포커스 가능 자체는 유지해야
              한다 — 방향키 페이지 넘김이 여기 걸려 있어 이 요소가 키보드 사용자의 진입점이다.
              표시만 브랜드 아웃라인으로 바꾸고, 큰 상자인 만큼 모서리를 굴려 책 모양과 맞춘다. */}
          <div
            className={`flex items-start rounded-[22px] ${COLLECTION_FOCUS_RING_CLASS}`}
            tabIndex={0}
            role="group"
            aria-label="펼친 책. 왼쪽·오른쪽 방향키로 페이지를 넘길 수 있어요."
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') {
                event.preventDefault();
                handleNext();
              } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                handlePrevious();
              }
            }}
          >
            <div className="relative flex-1">
              {/* 332 피드백: 닫기 버튼은 화면 모서리가 아니라 책 우상단에 붙인다 — 블러 배경 위에서
                  "닫히는 대상이 이 책"이라는 게 위치로 드러나야 한다. 오버레이 진입일 때만 온다. */}
              {onClose && <CollectionOverlayCloseButton onClose={onClose} />}

              {/* 표지. z-10이어야 인덱스 레일 탭의 왼쪽 끝이 "표지 뒤로" 들어간다 — z 없이 두면
                  DOM 순서상 나중에 오는 레일이 표지 위에 얹혀 탭이 책을 덮는 것처럼 보인다. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-2 z-10 rounded-[20px] bg-gradient-to-b from-line-subtle via-line-card to-line-card shadow-[0_45px_80px_-32px_rgba(4,33,66,0.5),0_10px_24px_-12px_rgba(4,33,66,0.25)]"
              />

              <div
                className={`relative z-10 flex flex-col overflow-hidden rounded-[14px] bg-snow-white shadow-[0_2px_6px_rgba(4,33,66,0.12)] md:flex-row ${BOOK_HEIGHT_CLASS}`}
                // 378 롤백 지점 (1/3): 페이지 종이 질감·괘선. 배경색 클래스는 그대로 두고
                // backgroundImage만 얹으므로, 이 style 한 줄을 지우면 원래 면으로 돌아간다.
                style={BINDER_PAGE_SURFACE}
              >
                {/* 좌·우 종이 단면 */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-2 left-0 z-20 w-[7px]"
                  style={{ backgroundImage: PAGE_EDGE_VERTICAL }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-2 right-0 z-20 w-[7px]"
                  style={{ backgroundImage: PAGE_EDGE_VERTICAL }}
                />
                {/* 아래 종이 단면 */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-2 bottom-0 z-20 h-[6px]"
                  style={{ backgroundImage: PAGE_EDGE_HORIZONTAL }}
                />
                {/* 가운데 골 — md 미만은 좌우가 위아래로 쌓여 골 자체가 없다. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-1/2 z-20 hidden w-24 -translate-x-1/2 md:block"
                  style={{ backgroundImage: BOOK_GUTTER_SHADE }}
                />

                {/* 바깥 모서리 페이지 넘김 영역(피드백 1번). 목차는 첫 장이라 더 앞이 없어 왼쪽을
                    숨기고, 마지막 장에서는 오른쪽을 숨긴다 — 눌러도 아무 일 없는 자리를 남기지 않는다. */}
                {!isTocOpen && (
                  <PageTurnZone side="left" label="이전 장" onClick={handlePrevious} />
                )}
                {(isTocOpen || canGoNext) && (
                  <PageTurnZone side="right" label="다음 장" onClick={handleNext} />
                )}

                {/* 왼쪽 페이지 = 이전 장. 여백(페이지 마진)이나 본문을 누르면 넘어가고, 지도·컨트롤
                    위 클릭은 넘김으로 치지 않는다(isPageTurnClick) — 지도를 끌어 옮기려다 페이지가
                    넘어가면 안 된다. */}
                <div
                  role="presentation"
                  onClick={(event) => {
                    if (isPageTurnClick(event)) {
                      handlePrevious();
                    }
                  }}
                  className={`flex flex-none flex-col p-5 md:h-auto md:flex-1 md:py-8 md:pl-8 md:pr-6 ${
                    isTocOpen ? 'h-[380px] items-center gap-3 text-center' : 'h-[380px]'
                  }`}
                >
                  {/* 332 피드백 4번: 책을 펼치자마자 전체 핀 지도가 나오면 "책 내용"이 아니라 도구처럼
                      보였다. 목차 장의 왼쪽을 속표지로 바꿔 제목·기록 수·괘선을 먼저 보여주고, 245가
                      요구하는 "전체 bounds 지도"는 그 아래 작은 액자로 넣어 함께 유지한다. */}
                  {isTocOpen && (
                    <>
                      <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-log-mint">
                        Collection
                      </p>
                      <p className="text-2xl font-extrabold leading-tight text-pin-navy md:text-3xl">
                        {title}
                      </p>
                      <span aria-hidden="true" className="h-px w-14 bg-line-card" />
                      <p className="text-sm text-ink-gray">
                        기록 {flatRecords.length}
                        {isLoadingAllPlaces ? '+' : ''}곳
                      </p>
                    </>
                  )}
                  {/* 지도는 목차/record 장에서 같은 트리 위치를 유지한다 — 분기 안으로 옮기면 장을
                      넘길 때마다 Kakao Map 인스턴스가 재생성된다. 바뀌는 건 감싸는 상자뿐이다. */}
                  <div
                    data-page-turn="ignore"
                    className={`relative cursor-default ${
                      isTocOpen
                        ? // 피드백 1번: 액자가 작아 페이지가 비어 보였다. 남는 세로 공간을 전부
                          // 받도록 flex-1로 바꾸고(min-h는 짧은 화면 하한) 가로도 페이지 폭을 채운다.
                          // 378 롤백 지점 (2/3): 액자 테두리만 폴라로이드(흰 5px)로 바꿨다 —
                          // `border border-line-card`로 되돌리고 아래 테이프 두 조각을 지우면 원상복구다.
                          `mt-1 min-h-[180px] w-full flex-1 rounded-lg bg-paper-white p-1.5 ${BINDER_PHOTO_FRAME_CLASS}`
                        : 'h-full'
                    }`}
                  >
                    {/* 378: 액자를 페이지에 붙인 마스킹 테이프. 지도 조작을 가리지 않도록
                        pointer-events-none이고, 액자 모서리 밖으로 걸치도록 음수 오프셋을 준다.
                        사진이 없어 폴백(지도·안내 문구)이 보이는 경우에도 "페이지에 붙어 있다"는
                        인상은 그대로 유지된다. */}
                    {isTocOpen && (
                      <>
                        <span
                          aria-hidden="true"
                          className={`${BINDER_TAPE_CLASS} -left-5 -top-2`}
                          style={binderTapeStyle('left')}
                        />
                        <span
                          aria-hidden="true"
                          className={`${BINDER_TAPE_CLASS} -right-5 -top-2`}
                          style={binderTapeStyle('right')}
                        />
                      </>
                    )}
                    {/* 전체 로드가 끝나기 전에는 마커를 하나도 그리지 않고 로딩 표시만 한다(가벼운 표시, 화면
                  전체를 막지 않음) — 넘길 때마다 핀이 하나씩 느는 방식을 피하기 위함. */}
                    <CollectionSpreadMap
                      collectionId={collectionId}
                      places={isLoadingAllPlaces ? [] : mapPlaces}
                      activeRecordId={currentRecord.recordId}
                      isLoadingAll={isLoadingAllPlaces}
                      fitAllBounds={isTocOpen}
                      onSelectPlace={handleSelectFromMap}
                    />
                  </div>
                </div>

                {/* 오른쪽 페이지 = 다음 장. 아래 인터랙티브 영역(레코드 버튼·포스트잇·목차 목록)의
                클릭은 isPageTurnClick이 걸러낸다 — 포스트잇을 수정하려다 페이지가 넘어가면 안 된다. */}
                <div
                  role="presentation"
                  onClick={(event) => {
                    if (isPageTurnClick(event)) {
                      handleNext();
                    }
                  }}
                  className={`flex flex-1 flex-col gap-4 overflow-y-auto p-6 md:py-10 md:pl-12 md:pr-10 ${COLLECTION_FOCUS_RING_CLASS} ${
                    isTocOpen || canGoNext ? 'cursor-e-resize' : ''
                  }`}
                >
                  {isTocOpen ? (
                    <CollectionToc
                      records={flatRecords}
                      activeIndex={currentIndex}
                      onSelect={handleSelectFromToc}
                    />
                  ) : (
                    <SpreadFadeIn key={currentRecord.recordId}>
                      <div className="flex flex-col gap-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex flex-col gap-2">
                            <p className="text-3xl font-extrabold leading-tight text-pin-navy">
                              {currentRecord.place.name}
                            </p>
                            <p className="flex items-center gap-1.5 text-sm font-bold text-log-mint">
                              <PlacePinIcon />
                              {currentRecord.place.address}
                            </p>
                          </div>
                          {/* 379: 오른쪽은 "버튼 + 그 아래 사진" 한 열이다. 버튼은 있던 자리(장 우상단)를
                              그대로 지키고, 사진은 제목 옆 빈 오른쪽 여백을 쓴다 — 본문 흐름
                              (제목·주소 → 키워드 → 포스트잇)의 왼쪽 열을 건드리지 않는 자리라
                              Context가 많아져도 포스트잇과 겹치지 않는다(둘 다 일반 흐름이라
                              겹침 자체가 생기지 않고, 넘치는 만큼은 332부터 있던 페이지 스크롤이 받는다). */}
                          <div className="flex flex-none flex-col items-end gap-4">
                            {/* 시안에는 이 버튼이 보이지 않지만 기능은 유지한다(사용자 확정) — 특히 타인
                            Collection의 "저장하기"는 Feed 유입 동선(142)이라 없애면 기능 회귀다. */}
                            {ownedByMe ? (
                              <RecordRemoveButton
                                collectionId={collectionId}
                                recordId={currentRecord.recordId}
                              />
                            ) : (
                              <RecordSaveButton
                                place={currentRecord.place}
                                collectionId={collectionId}
                                feedRequestId={feedRequestId}
                                feedPosition={feedPosition}
                              />
                            )}
                            <CollectionRecordPhoto
                              placeName={currentRecord.place.name}
                              thumbnailUrl={currentRecord.place.thumbnailUrl}
                            />
                          </div>
                        </div>

                        {/* keywords: []는 AI 분석 미완료의 정상 상태다(architecture.md 5장) — 뱃지 영역 자체를
                        생략해 빈 상태를 자연스럽게 처리한다(에러로 취급하지 않는다). */}
                        {currentRecord.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {currentRecord.keywords.map((keyword) => (
                              <span
                                key={keyword}
                                className="rounded-full bg-log-mint/15 px-4 py-1.5 text-sm font-bold text-log-mint"
                              >
                                #{keyword}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* contexts는 ownedByMe일 때만 배열이고 타인 조회는 null이다(privacy-rules.md 1장) — null이면
                        이 영역 자체를 렌더하지 않는다(런타임 접근도 하지 않는다). */}
                        {ownedByMe && currentRecord.contexts && (
                          // 353: 포스트잇 면은 버튼이 아니지만 조작 대상(연필·× 버튼이 그 위에 있고,
                          // 겹쳐 쌓여 빗맞기 쉽다)이라 통째로 넘김에서 제외한다.
                          <div
                            data-page-turn="ignore"
                            className="flex flex-wrap content-start gap-x-7 px-3 pb-4 pt-6"
                          >
                            {/* 387: 여기 있던 "찢어낸 종이 받침"(378 롤백 지점 3/3)을 제거했다 —
                                화면에서 메모지 뒤에 베이지 배경 박스가 붙은 것처럼 읽혀서, 메모지가
                                페이지에 직접 붙어 있다는 인상을 오히려 방해했다. 이제 포스트잇만 남는다. */}
                            {currentRecord.contexts.length === 0 ? (
                              <p className="text-xs text-ink-gray-light">
                                아직 기록된 맥락이 없어요.
                              </p>
                            ) : (
                              /* 378 피드백(사용자가 332의 포스트잇 표현 확정을 직접 해제):
                                 - 페이지 전폭으로 늘어나 "띠"로 보이던 것을 260px 종이 조각 비례로 고정한다.
                                 - 세로로 겹쳐 쌓던 배치(stackIndex=index)를 끄고(=0) 373의 손붙임 스캐터로
                                   어긋나게 놓는다. 겹치면 위 장의 마스킹 테이프가 아래 장 글자를 덮었다.
                                 - 감싸는 div의 pt-6/px-3/pb-4 여백은 테이프(위로 12px)·스캐터·호버 들림이
                                   잘리지 않게 하기 위한 것이다(373과 같은 값). */
                              currentRecord.contexts.map((context, index) => (
                                <div
                                  key={context.contextId}
                                  className="w-[260px] max-w-full"
                                  style={contextNoteScatterStyle(index)}
                                >
                                  <ContextStickyNoteCard
                                    recordId={currentRecord.recordId}
                                    context={context}
                                    ownedByMe={ownedByMe}
                                    stackIndex={0}
                                    attachment="flat"
                                  />
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </SpreadFadeIn>
                  )}
                </div>
              </div>
            </div>

            {/* 246은 목차 패널과 목록이 겹친다는 이유로 목차가 열려 있는 동안 이 레일을 감췄었다.
                332 피드백 2번에서 레일 맨 위에 "목차" 탭이 생기면서 그 판단이 뒤집혔다 — 하단 목차
                버튼이 사라진 지금 목차로 곧장 돌아갈 진입점이 이 레일뿐이라, 항상 세워 둔다.
                (목차 장에서는 오른쪽 페이지의 목록과 나란히 보이지만, 레일은 "지금 어느 장인지"를
                책 옆면에서 보여주는 북마크라 역할이 다르다.) */}
            <CollectionIndexRail
              records={flatRecords}
              activeIndex={currentIndex}
              isTocActive={isTocOpen}
              disabled={isRecordDeleteConfirmOpen}
              onSelect={handleSelectFromIndexRail}
              onSelectToc={() => {
                if (!isRecordDeleteConfirmOpen) {
                  setIsTocOpen(true);
                }
              }}
            />
          </div>

          {/* 332 디자인 피드백: 이전/다음/목차 버튼을 없앴다. 이동은 좌·우 페이지 클릭(또는 방향키)이
              전담하고, 여기에는 지금 몇 번째 장인지 알려주는 표시만 남긴다 — 버튼이 아니다.
              목차는 첫 장이므로 record 번호 대신 "목차"로 적는다. isLoadingAllPlaces의 '+'는 전체
              자동 로드가 끝나기 전이라 총 장수가 더 늘어날 수 있다는 뜻으로 그대로 유지한다. */}
          {/* 332 피드백: ① 표시가 책 정중앙 아래에 오도록 인덱스 레일 폭(w-20)만큼 오른쪽 여백을
              준다 — 레일까지 포함한 열의 중앙은 책의 중앙보다 왼쪽이다. ② 목차도 한 장이므로 1페이지로
              센다: 목차=1, record i번째=i+2, 전체=record 수+1. */}
          <p className="flex h-7 items-center justify-center text-center text-sm text-ink-gray-light md:pr-20">
            <span className="text-base font-extrabold text-pin-navy">
              {isTocOpen ? 1 : currentIndex + 2}
            </span>
            {' / '}
            {flatRecords.length + 1}
            {isLoadingAllPlaces ? '+' : ''}
          </p>
        </div>

        {/* 143의 "이 작성자의 다른 컬렉션"(ShelfExploreSection)은 화면 하단 카드 목록에서 이 오른쪽
            책장으로 자리를 옮겼다 — 데이터 경로·Follow 로직은 그대로고 표현과 위치만 바뀐 것이다.
            showShelfPanel이 false면 아예 렌더하지 않으므로, 그때는 이 flex row에 책 열만 남아
            책이 왼쪽으로 밀린 채 오른쪽이 비는 상태가 되지 않는다(위 max-w도 함께 좁아진다). */}
        {shelfAside}
      </div>

      {shelfDrawer}

      {/* 마지막 Context 삭제(409) 확인 모달. currentRecord는 이 컴포넌트가 관리하는 스프레드 상태의
          파생값이라 여기서 recordId를 직접 넘긴다 — 페이지(CollectionDetailPage)까지 끌어올리려면
          currentRecord를 새 전역 상태로 만들어야 해서(203 지시사항) 하지 않았다. 위 네비게이션 가드가
          열려 있는 동안 currentRecord 자체를 고정하므로 recordId는 항상 confirm 대상과 일치한다. */}
      {ownedByMe && <DeleteConfirmDialog recordId={currentRecord.recordId} />}
      {addRecordDialog}
    </main>
  );
}
