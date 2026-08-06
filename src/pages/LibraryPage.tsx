import { useEffect, useState } from 'react';
import { MyShelfColumn } from '@/features/collections/components/MyShelfList';
import { FollowedShelfCard } from '@/features/follows/components/FollowedShelfCard';
import { useFollowsQuery } from '@/features/follows/hooks/useFollowsQuery';
import type { FollowListItem } from '@/features/follows/api/getFollows';
import {
  getLibraryVisibleRowCount,
  getPageContentBudgetPx,
  getShelfScale,
  libraryPinsMyShelf,
  LIBRARY_COLUMNS_BY_TIER,
  PAGE_CONTAINER_CLASS,
  PAGE_MIN_HEIGHT_CLASS,
  PAGE_TITLE_GAP_CLASS,
  PAGE_VERTICAL_PADDING_CLASS,
} from '@/shared/lib/shelfCabinetLayout';
import { useLayoutMetrics } from '@/shared/lib/LayoutMetricsContext';
import { useShelfWidthTier, useViewportSize } from '@/shared/lib/useShelfBreakpoint';
import { PageTitle } from '@/shared/ui/PageTitle';
import { ShelfCabinet, ShelfColumn, ShelfColumnGrid } from '@/shared/ui/Shelf';

interface LibraryPageSlots {
  showMyShelf: boolean;
  follows: FollowListItem[];
  // allFollows 안에서 이 페이지의 follows가 시작하는 인덱스 — "다음 페이지에 필요한 만큼 데이터가
  // 이미 로드됐는지"(needsMoreData) 판단에 쓴다.
  followStartIndex: number;
}

// 295 반응형 재설계(요구사항 B) 핵심 로직: "내 책장 + 팔로우한 책장"을 열 수에 따라 다르게 자른다.
// 3열 이상(pinsMyShelf): 내 책장은 시퀀스 밖에서 항상 고정(showMyShelf=true 불변) — 팔로우만
// (columns-1)개씩 넘어간다 (기존 250 동작 그대로).
// 1·2열: 사용자 확인("화면 크기에 따라 책장이 1,2열일 때는 나의 책장도 팔로우한 책장들과 한 줄로
// 묶여 좌우 버튼으로 넘어가야 한다. 그치만 시작은 항상 나의 책장이 시작이다")에 따라, [내 책장,
// 팔로우1, 팔로우2, ...] 하나의 가상 시퀀스를 columns개씩 자른다 — virtualPageIndex 0은 항상 내
// 책장으로 시작하고(팔로우 (columns-1)개와 함께), 그 이후 페이지는 팔로우한 책장만으로 채워진다.
function getLibraryPageSlots(
  virtualPageIndex: number,
  columns: number,
  pinsMyShelf: boolean,
  allFollows: FollowListItem[],
): LibraryPageSlots {
  if (pinsMyShelf) {
    const followsPerPage = columns - 1;
    const start = virtualPageIndex * followsPerPage;
    return {
      showMyShelf: true,
      follows: allFollows.slice(start, start + followsPerPage),
      followStartIndex: start,
    };
  }
  if (virtualPageIndex === 0) {
    const followsNeeded = columns - 1;
    return { showMyShelf: true, follows: allFollows.slice(0, followsNeeded), followStartIndex: 0 };
  }
  const firstPageFollowCount = columns - 1;
  const start = firstPageFollowCount + (virtualPageIndex - 1) * columns;
  return {
    showMyShelf: false,
    follows: allFollows.slice(start, start + columns),
    followStartIndex: start,
  };
}

/**
 * Library: "내 책장"(141)과 "팔로우한 책장"(144)을 한 화면에서 조회한다.
 * 근거: Jira S15P11A705-144/169/250/295, docs/reference/08_API_명세.md 9장 — 전용 Endpoint 없이 GET /collections +
 * GET /follows + GET /follows/{followId}/collections 조합으로 구성한다.
 * 비주얼은 mockup(PinLog.responsive.dc.html)의 책장(cabinet-shell) 스타일을 따른다 — 제목은 목업의
 * pageHeading('나의 책장')을 그대로 쓴다.
 *
 * 250: "내 책장"과 "팔로우한 책장"을 각자 다른 캐비닛으로 세로로 쌓지 않고, 캐비닛 하나를 열로 나눠
 * 붙여 쓴다. FeedList(249)와 동일한 cursorHistory 패턴이라 "이전"은 재요청 없이 캐시를 쓰고, "다음"은
 * 항상 직전 페이지의 nextCursor로만 이어받는다. 페이지네이션 상태를 이 페이지 레벨에 두는 이유는 열
 * 그리드 안의 칸과 캐비닛 바깥의 이전/다음 버튼이 같은 상태를 공유해야 해서다.
 * 이전/다음 버튼은 캐비닛 안쪽 텍스트 블록이 아니라 원형 아이콘 버튼이다. 실제 콘텐츠 그리드
 * (ShelfColumnGrid/ShelfColumn)는 건드리지 않고, 투명 오버레이를 ShelfCabinet의 형제로 하나 더 둬서
 * 경계 위치만 재사용한다 — ShelfCabinet엔 overflow-hidden이 걸려 있어 버튼을 그 안(자손)에 두면
 * 바깥으로 걸치는 부분이 잘리고, 세로 중앙 기준도 캐비닛 전체 높이가 아니라 그리드 높이로 바뀌어
 * 버리기 때문에 형제 오버레이 방식을 쓴다.
 *
 * 319: 화면 톤을 시안의 아이보리 캐비닛으로 개편했다. 좌우 버튼은 네 벌의 중복 클래스 문자열에서
 * ShelfPageButton 하나로 합치고, 위치도 캐비닛 안쪽 여백이 아니라 바깥 가장자리로 옮겼다(아래
 * ShelfPageButton 주석). 열 수·스크롤 영역·페이지네이션 로직은 그대로다.
 *
 * 295 반응형 재설계(요구사항 B): 동시 노출 책장 수가 breakpoint별로 3(xl)→2(mdlg)→1(sm)로 줄어든다
 * (LIBRARY_COLUMNS_BY_TIER). xl은 기존 동작(내 책장 고정 + 팔로우 2개씩 페이징) 그대로고, mdlg·sm은
 * "내 책장"도 팔로우한 책장들과 한 시퀀스로 묶여 함께 페이징한다(getLibraryPageSlots 주석 참고).
 * 팔로우 데이터는 useFollowsQuery(무한 누적)로 넉넉히 받아와 로컬에서 슬라이싱한다 — "화면에 몇 개씩
 * 보여줄지"(가상 페이지 크기)와 "네트워크에서 한 번에 얼마나 가져올지"(fetch batch)를 분리해, 가상
 * 페이지 경계가 서버 커서 경계와 어긋나도(xl은 2개씩, mdlg는 1개씩, sm은 페이지0만 0개+이후 1개씩)
 * 문제없이 동작한다.
 */
export function LibraryPage() {
  const tier = useShelfWidthTier();
  const columns = LIBRARY_COLUMNS_BY_TIER[tier];
  // 330: 판단 기준이 tier가 아니라 열 수다 — libraryPinsMyShelf 주석 참고.
  const pinsMyShelf = libraryPinsMyShelf(columns);

  // 319 디자인 피드백: 캐비닛 높이를 Feed(314)와 같은 실측 기반 동적 예산으로 정한다 — 이전엔
  // h-full 퍼센트 체인 + 스크롤 박스 max-h-[590px] 조합이라, 높은 화면에서 캐비닛이 래퍼를 다
  // 채우지 못하고 아래가 크게 비었다. 여기서 확정한 높이를 캐비닛에 직접 넘기므로 (a) 캐비닛이
  // 화면을 채우고 (b) 좌우 버튼 오버레이(캐비닛과 같은 박스)의 세로 중앙이 곧 캐비닛 중앙이 된다.
  const { width: viewportWidth, height: viewportHeight } = useViewportSize();
  const { navChromeHeightPx, titleHeightPx } = useLayoutMetrics();
  const cabinetHeightPx = getPageContentBudgetPx(
    viewportHeight,
    { navChromeHeightPx, titleHeightPx },
    tier,
  );
  // 행 수는 그 높이에 실제로 몇 행이 들어가는지로 정한다(고정 3행 폐기) — 책이 커진 만큼
  // (SPINE_MAX_HEIGHT 168→190) 짧은 화면에서는 2행, 높은 화면에서는 4행까지 간다.
  const visibleRowCount = getLibraryVisibleRowCount(cabinetHeightPx, getShelfScale(viewportWidth));

  const [virtualPageIndex, setVirtualPageIndex] = useState(0);
  // 구간이 바뀌면(리사이즈로 tier 전환) 가상 페이지 크기 자체가 달라져 이전 인덱스가 더 이상 같은
  // 지점을 가리키지 않는다 — 항상 "내 책장"으로 시작하는 첫 페이지로 되돌린다. "prop이 바뀌면
  // state를 리셋"하는 리액트 표준 패턴(렌더 중 setState) — useEffect+setState는 커밋 후 리렌더를
  // 한 번 더 유발해(react-hooks/set-state-in-effect) 화면이 잠깐 깜빡일 수 있다.
  const [prevTier, setPrevTier] = useState(tier);
  if (tier !== prevTier) {
    setPrevTier(tier);
    setVirtualPageIndex(0);
  }

  const followsQuery = useFollowsQuery();
  const pages = followsQuery.data?.pages ?? [];
  const allFollows = pages.flatMap((page) => page.items);
  const hasMoreFromServer = pages.length > 0 ? pages[pages.length - 1].hasNext : true;

  const pageSlots = getLibraryPageSlots(virtualPageIndex, columns, pinsMyShelf, allFollows);
  const expectedFollowCount = pinsMyShelf
    ? columns - 1
    : virtualPageIndex === 0
      ? columns - 1
      : columns;
  const needsMoreData = pageSlots.followStartIndex + expectedFollowCount > allFollows.length;

  // 295-18과 동일한 "스크롤이 바닥에 닿으면 다음 페이지" 패턴 대신, 여기서는 좌우 버튼으로 넘어갈
  // 때 필요한 만큼 데이터가 없으면 자동으로 더 받아온다 — 사용자는 그냥 다음/이전만 누르면 된다.
  useEffect(() => {
    if (needsMoreData && hasMoreFromServer && !followsQuery.isFetchingNextPage) {
      void followsQuery.fetchNextPage();
    }
  }, [needsMoreData, hasMoreFromServer, followsQuery]);

  const canGoPrevious = virtualPageIndex > 0;
  // 이번 페이지를 채우고도 남는 팔로우가 있거나, 서버에 더 있을 수 있으면(아직 확인 전 포함) 다음이
  // 가능하다고 본다 — 실제로 다음 페이지가 비어 있으면 fetchNextPage 이후 자연히 disabled로 바뀐다.
  const canGoNext =
    allFollows.length > pageSlots.followStartIndex + pageSlots.follows.length || hasMoreFromServer;

  const handlePrevious = () => {
    if (!canGoPrevious) {
      return;
    }
    setVirtualPageIndex((index) => index - 1);
  };

  const handleNext = () => {
    if (!canGoNext) {
      return;
    }
    setVirtualPageIndex((index) => index + 1);
  };

  // 로딩/에러/빈 목록 안내 문구 — 이 페이지에 팔로우한 책장이 하나도 없을 때만(내 책장 유무와 무관)
  // 첫 빈 칸에 보여준다.
  const followStatusMessage = followsQuery.isPending
    ? '불러오는 중…'
    : followsQuery.isError
      ? '팔로우 목록을 불러오지 못했어요.'
      : pageSlots.follows.length === 0 && !needsMoreData
        ? '아직 팔로우한 책장이 없어요'
        : null;

  const slotNodes: React.ReactNode[] = [];
  if (pageSlots.showMyShelf) {
    slotNodes.push(
      <ShelfColumn key="my-shelf">
        <MyShelfColumn visibleRowCount={visibleRowCount} />
      </ShelfColumn>,
    );
  }
  pageSlots.follows.forEach((follow, indexInPage) => {
    slotNodes.push(
      <ShelfColumn key={follow.followId}>
        <FollowedShelfCard
          followId={follow.followId}
          alias={follow.alias}
          columnSlot={indexInPage}
          visibleRowCount={visibleRowCount}
        />
      </ShelfColumn>,
    );
  });
  let statusMessageShown = false;
  while (slotNodes.length < columns) {
    slotNodes.push(
      <ShelfColumn key={`empty-${slotNodes.length}`}>
        {!statusMessageShown && followStatusMessage && (
          <p className={followsQuery.isError ? 'text-sm text-red-600' : 'text-sm text-ink-gray'}>
            {followStatusMessage}
          </p>
        )}
      </ShelfColumn>,
    );
    statusMessageShown = true;
  }

  return (
    // 287-8: min-h(뷰포트 높이 - AppLayout 헤더 높이)와 좌우 컨테이너(PAGE_CONTAINER_CLASS)·타이틀-
    // 캐비닛 gap(PAGE_TITLE_GAP_CLASS)을 FeedPage와 그대로 공유한다. 캐비닛 래퍼(flex-1 min-h-0)가
    // 제목을 제외한 나머지 세로 공간을 전부 채운다.
    // 287-9: 제목도 PageTitle(shared/ui/PageTitle.tsx)로 FeedPage와 같은 고정 height를 공유한다 —
    // 이 페이지 폰트 스타일(text-[27px] font-bold tracking-tight)은 그대로 유지하되, 바깥 박스
    // 높이만 고정해 Feed의 h1(text-2xl)과 자연 높이가 달라도 캐비닛 크기가 어긋나지 않게 한다.
    // 330: min-h는 PAGE_MIN_HEIGHT_CLASS를 FeedPage·HomePage와 공유한다(동일 근거).
    <main
      className={`${PAGE_CONTAINER_CLASS} ${PAGE_MIN_HEIGHT_CLASS} flex flex-col ${PAGE_TITLE_GAP_CLASS} ${PAGE_VERTICAL_PADDING_CLASS}`}
    >
      <PageTitle
        className="text-[27px] font-bold tracking-tight text-pin-navy"
        description="저장한 장소를 책처럼 꺼내보고 컬렉션으로 정리해 보세요."
      >
        나의 책장
      </PageTitle>

      {/* 319 디자인 피드백: flex-1(남는 공간 전부)에서 flex-none으로 바꿨다. 래퍼가 캐비닛보다
          크면 그 차이가 전부 캐비닛 아래 빈 여백이 되고, inset-0인 버튼 오버레이도 캐비닛이 아니라
          그 빈 공간까지 포함한 박스의 중앙에 놓인다(피드백의 "버튼 위치가 별로다"). 이제 래퍼
          높이는 캐비닛 높이 그 자체다 — 오버레이 inset-0 = 캐비닛 테두리와 정확히 일치한다. */}
      <div className="relative min-h-0 flex-none">
        <ShelfCabinet heightPx={cabinetHeightPx}>
          <ShelfColumnGrid columns={columns}>{slotNodes}</ShelfColumnGrid>
        </ShelfCabinet>

        {/* 319: 이전엔 오버레이가 두 벌이었다 — xl은 "1열|2열" 내부 경계에 이전 버튼을 두고 다음
            버튼만 바깥에 뒀고(내 책장이 고정이라 이전/다음이 2·3열에만 걸린다는 뜻이었다),
            mdlg·sm은 둘 다 바깥에 뒀다. 두 벌 모두 캐비닛 안쪽 여백(px-[28px])에 버튼을 맞추느라
            테두리+본문 padding 합을 리터럴로 복제하고 있어서, 캐비닛 상자 모델이 바뀌면 조용히
            어긋나는 값이었다. 시안은 구간과 무관하게 좌우 버튼이 캐비닛 "바깥" 가장자리에 걸쳐
            있으므로, 오버레이를 하나로 합치고 위치 기준도 캐비닛 바깥 테두리(inset-0)로 옮겼다 —
            이제 안쪽 여백 리터럴에 의존하지 않는다. 페이지 이동 로직(canGoPrevious/canGoNext,
            getLibraryPageSlots)은 그대로다. aria-label만 구간에 따라 다르게 유지한다 — xl에서
            넘어가는 대상은 팔로우한 책장뿐이고, mdlg·sm은 내 책장까지 포함한 시퀀스이기 때문이다. */}
        <div className="pointer-events-none absolute inset-0">
          <ShelfPageButton
            direction="left"
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            label={pinsMyShelf ? '이전 팔로우 책장' : '이전 책장'}
          />
          <ShelfPageButton
            direction="right"
            onClick={handleNext}
            disabled={!canGoNext}
            label={pinsMyShelf ? '다음 팔로우 책장' : '다음 책장'}
          />
        </div>
      </div>
    </main>
  );
}

interface ShelfPageButtonProps {
  direction: 'left' | 'right';
  label: string;
  disabled: boolean;
  onClick: () => void;
}

// 319: 이전엔 완전히 동일한 클래스 문자열을 가진 버튼이 네 벌(xl 2 + mdlg·sm 2) 있었다. 톤을 밝게
// 바꾸면서 네 곳을 각각 고치는 대신 하나로 합친다. 색은 FeedList(314)의 페이지 이동 버튼과 같은
// 규격이다 — 두 화면의 좌우 이동 버튼이 같은 부품으로 보여야 한다.
// 캐비닛 바깥 가장자리에 절반만 걸치게(translate-x-±1/2) 둬 시안처럼 가구 밖으로 튀어나오게 한다.
function ShelfPageButton({ direction, label, disabled, onClick }: ShelfPageButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`pointer-events-auto absolute top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-line-card bg-snow-white text-pin-navy shadow-[0_2px_8px_rgba(4,33,66,.12)] transition hover:border-log-mint hover:bg-log-mint hover:text-white disabled:pointer-events-none disabled:opacity-40 ${
        direction === 'left' ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'
      }`}
    >
      <ChevronIcon direction={direction} />
    </button>
  );
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      stroke="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      {direction === 'left' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );
}
