import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { MyShelfColumn } from '@/features/collections/components/MyShelfList';
import { FollowedShelfCard } from '@/features/follows/components/FollowedShelfCard';
import { useFollowsQuery } from '@/features/follows/hooks/useFollowsQuery';
import { useMeSummaryQuery } from '@/features/me/hooks/useMeSummaryQuery';
import {
  getLibraryCabinetHeightPx,
  getLibraryPageCount,
  getLibraryPageSlots,
  getLibraryVisibleRowCount,
  getLibraryPagingFirstColumn,
  getPageContentBudgetPx,
  getShelfScale,
  libraryPinsMyShelf,
  LIBRARY_CABINET_SIDE_CHROME_PX,
  LIBRARY_COLUMNS_BY_TIER,
  LIBRARY_PAGE_DOTS_MAX,
  SHELF_COLUMN_GAP_PX,
  PAGE_CONTAINER_CLASS,
  PAGE_MIN_HEIGHT_CLASS,
  PAGE_TITLE_GAP_CLASS,
  PAGE_VERTICAL_PADDING_CLASS,
} from '@/shared/lib/shelfCabinetLayout';
import { useLayoutMetrics } from '@/shared/lib/LayoutMetricsContext';
import { useShelfWidthTier, useViewportSize } from '@/shared/lib/useShelfBreakpoint';
import { PageTitle } from '@/shared/ui/PageTitle';
import { ShelfCabinet, ShelfColumn, ShelfColumnGrid } from '@/shared/ui/Shelf';

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
  // 329: 좌우 버튼과 페이지 인디케이터가 공유하는 "넘어가는 구간"의 시작 열. 둘이 같은 값을 써야
  // 버튼이 감싸는 범위와 인디케이터가 가운데를 잡는 범위가 어긋나지 않는다.
  const pagingFirstColumn = getLibraryPagingFirstColumn(columns);

  // 319 디자인 피드백: 캐비닛 높이를 Feed(314)와 같은 실측 기반 동적 예산으로 정한다 — 이전엔
  // h-full 퍼센트 체인 + 스크롤 박스 max-h-[590px] 조합이라, 높은 화면에서 캐비닛이 래퍼를 다
  // 채우지 못하고 아래가 크게 비었다. 여기서 확정한 높이를 캐비닛에 직접 넘기므로 (a) 캐비닛이
  // 화면을 채우고 (b) 좌우 버튼 오버레이(캐비닛과 같은 박스)의 세로 중앙이 곧 캐비닛 중앙이 된다.
  const { width: viewportWidth, height: viewportHeight } = useViewportSize();
  const { navChromeHeightPx, titleHeightPx } = useLayoutMetrics();
  // 329: 캐비닛 아래에 페이지 인디케이터가 생겼다 — 세로 예산에서 그 높이를 덜어낸 나머지가 캐비닛
  // 높이다. 덜지 않으면 인디케이터만큼 화면 밖으로 밀린다(328에서 맞춘 예산 계약).
  const cabinetHeightPx = getLibraryCabinetHeightPx(
    getPageContentBudgetPx(viewportHeight, { navChromeHeightPx, titleHeightPx }, tier),
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

  // 407: "나의 활동 기록"(/me/activity) 진입점의 노출 여부. docs 이슈 #55는 **기록 0건이면 책장에서
  // 이 진입점을 숨기자**고 제안한다 — 전부 0인 화면을 첫 사용자에게 주는 것은 그 페이지의 목적과
  // 어긋나기 때문이다.
  // 판정에 GET /me/activity가 아니라 3.5(마이페이지 요약)의 recordCount를 쓰는 이유: 집계 응답은
  // 그 화면에 들어가야 받는 것이 맞고(진입 시 1회 호출이 계약이다), 요약 쪽은 설정 패널이 이미 같은
  // 쿼리 키(['me','summary'])로 쓰고 있어 캐시를 그대로 나눠 쓴다. 책장에 새 요청이 늘지 않는다.
  // 로딩 중(data === undefined)에는 숨긴다 — 없다가 생기는 편이, 있다가 사라지는 것보다 낫다.
  const meSummaryQuery = useMeSummaryQuery();
  const hasAnyRecord = (meSummaryQuery.data?.recordCount ?? 0) > 0;

  const followsQuery = useFollowsQuery();
  const pages = followsQuery.data?.pages ?? [];
  const allFollows = pages.flatMap((page) => page.items);
  const hasMoreFromServer = pages.length > 0 ? pages[pages.length - 1].hasNext : true;

  const pageSlots = getLibraryPageSlots(virtualPageIndex, columns, allFollows);
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

  // 329: 인디케이터용. getLibraryPageSlots와 같은 페이징 규칙에서 나온 값이라 둘이 어긋날 수 없다
  // (shelfCabinetLayout.test.ts가 교차 검증한다).
  const pageCount = getLibraryPageCount(allFollows.length, columns);

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
  //
  // 329: 빈 목록 조건이 `!needsMoreData`였는데, 그러면 **팔로우가 0개일 때 이 문구가 영영 뜨지
  // 않았다** — needsMoreData는 "이 페이지를 채우려면 팔로우가 더 필요하다"는 뜻이라 0개면 항상
  // 참이기 때문이다(3열 기준 0 + 2 > 0). 팔로우가 하나도 없는 계정에서 2·3열이 아무 설명 없이
  // 텅 빈 채로 보이던 원인이다.
  // 실제로 문구를 미뤄야 하는 상황은 "모자라다"가 아니라 "모자라는데 서버에서 더 받아올 수 있다"이고,
  // 그건 바로 아래 useEffect가 fetchNextPage를 부르는 조건과 같다 — 그 조건을 그대로 쓴다.
  // 더 받아올 게 없으면(hasMoreFromServer=false) 지금 비어 있는 것이 확정이므로 문구를 보여준다.
  const willFetchMoreFollows = needsMoreData && hasMoreFromServer;
  const followStatusMessage = followsQuery.isPending
    ? '불러오는 중…'
    : followsQuery.isError
      ? '팔로우 목록을 불러오지 못했어요.'
      : pageSlots.follows.length === 0 && !willFetchMoreFollows
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
      {/* 407: 활동 기록 진입점을 **PageTitle의 description 안에** 둔다. 제목 블록 바깥(형제)에 한 줄을
          더 얹으면 그만큼의 높이가 ResizeObserver 측정에서 빠져 titleHeightPx가 실제보다 작게
          보고되고, getPageContentBudgetPx가 세로 예산을 과대 계상해 sm·mdlg에서 책장 마지막 행이
          잘린다(PageTitle 313 주석의 그 함정 그대로다). description은 ReactNode라 노드를 그대로
          넘길 수 있고, 안에 들어가면 링크의 높이·줄바꿈까지 측정에 포함된다.
          링크 스타일은 LoginPage 약관 링크와 같은 문법이다(밑줄 + 네이비) — 본문 안에 섞이는 보조
          링크가 이 앱에서 쓰는 유일한 형태다. */}
      <PageTitle
        className="text-[27px] font-bold tracking-tight text-pin-navy"
        description={
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span>저장한 장소를 책처럼 꺼내보고 컬렉션으로 정리해 보세요.</span>
            {hasAnyRecord && (
              <Link
                to="/me/activity"
                className="font-semibold text-pin-navy underline underline-offset-2"
              >
                나의 활동 기록 보기
              </Link>
            )}
          </span>
        }
      >
        나의 책장
      </PageTitle>

      {/* 328: 바깥에 flex-1 + items-center 래퍼를 한 겹 더 뒀다 — 남는 세로 공간에서 책장이 중앙에
          오도록 FeedPage와 정렬 규칙을 통일한다. 여기서 남는 양은 대개 안전 여백(8px) 정도라 육안
          변화는 거의 없지만, 두 페이지가 같은 규칙을 쓰는 것 자체가 목적이다(예산 상수가 바뀌어
          한쪽만 남는 공간이 생겨도 어긋나지 않는다).
          319 디자인 피드백: 안쪽 박스는 flex-1이 아니라 flex-none을 그대로 유지한다. 래퍼가
          캐비닛보다 크면 그 차이가 전부 캐비닛 아래 빈 여백이 되고, inset-0인 버튼 오버레이도
          캐비닛이 아니라 그 빈 공간까지 포함한 박스의 중앙에 놓인다(피드백의 "버튼 위치가
          별로다"). 이 박스의 높이는 캐비닛 높이 그 자체여야 한다 — 오버레이 inset-0 = 캐비닛
          테두리와 정확히 일치한다. 그래서 중앙 정렬은 바깥 래퍼가 맡는다 — 정렬을 items-center가
          아니라 자식의 my-auto로 주는 이유는 FeedPage 주석 참고(낮은 뷰포트에서 위로 밀지 않는다). */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* 329: 인디케이터가 캐비닛 아래에 붙으면서 한 겹이 더 생겼다 — 좌우 버튼 오버레이의
            기준 박스(inset-0)는 반드시 "캐비닛 그 자체"여야 하므로(319), 인디케이터는 그 relative
            박스 바깥, 이 my-auto 블록 안에 둔다. */}
        <div className="my-auto w-full flex-none">
          <div className="relative">
            <ShelfCabinet heightPx={cabinetHeightPx}>
              <ShelfColumnGrid columns={columns}>{slotNodes}</ShelfColumnGrid>
            </ShelfCabinet>

            {/* 319: 이전엔 오버레이가 두 벌이었다 — xl은 "1열|2열" 내부 경계에 이전 버튼을 두고 다음
              버튼만 바깥에 뒀고(내 책장이 고정이라 이전/다음이 2·3열에만 걸린다는 뜻이었다),
              mdlg·sm은 둘 다 바깥에 뒀다. 두 벌 모두 캐비닛 안쪽 여백(px-[28px])에 버튼을 맞추느라
              테두리+본문 padding 합을 리터럴로 복제하고 있어서, 캐비닛 상자 모델이 바뀌면 조용히
              어긋나는 값이었다. 그래서 오버레이를 하나로 합치고 위치 기준도 캐비닛 바깥
              테두리(inset-0)로 옮겼다.
              329: 그 통합이 리터럴 문제는 없앴지만 **버튼 위치와 페이징 의미의 대응을 끊었다**.
              pinsMyShelf(3열 이상) 구간에서 내 책장은 고정이고 넘어가는 것은 2열부터인데, 이전
              버튼이 그 내 책장 왼쪽 바깥에 걸려 "이걸 누르면 내 책장이 넘어간다"고 말하고 있었다.
              이제 좌우 버튼은 구간과 무관하게 **넘어가는 구간의 양 끝 경계**에 걸친다 —
              고정 구간에서는 2열~마지막 열, 내 책장도 함께 넘어가는 1·2열 구간에서는 첫 열~마지막
              열이다(getLibraryPagingFirstColumn 하나가 그 시작을 정한다).
              단, 319가 지운 리터럴 복제로 돌아가지는 않는다 — 경계 좌표를 직접 계산하는 대신
              캐비닛 본문과 **같은 그리드**를 깔고 버튼을 트랙 경계에 붙인다. 열 수(columns)나
              gap이 바뀌어도 위치가 저절로 따라오고, 캐비닛 chrome도 행 수 역산이 이미 의존하는
              상수(LIBRARY_CABINET_SIDE_CHROME_PX)에서 파생시킨다.
              버튼이 책을 가리지 않는다: 칸 안쪽으로 걸치는 폭은 버튼 반지름(16px)인데, 칸
              padding(10px)과 스크롤 박스 padding(12px)만 해도 22px이라 책이 놓이는 영역 바깥이다.
              페이지 이동 로직(canGoPrevious/canGoNext, getLibraryPageSlots)은 그대로다. */}
            <div
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                columnGap: SHELF_COLUMN_GAP_PX,
                padding: LIBRARY_CABINET_SIDE_CHROME_PX,
              }}
              className="pointer-events-none absolute inset-0 grid"
            >
              {/* 넘어가는 구간의 양 끝 트랙 위에 빈 칸을 얹고, 버튼을 그 바깥 경계에 절반씩 걸친다.
                  세로 중앙도 이 칸 기준이라 캐비닛 중앙과 같다(본문 padding이 상하 대칭이기
                  때문이다). 1열 구간에서는 두 칸이 같은 트랙에 겹치는데, 각 버튼이 그 칸의 left-0 /
                  right-0에 붙으므로 서로 부딪히지 않는다. */}
              <div className="relative" style={{ gridColumnStart: pagingFirstColumn }}>
                <ShelfPageButton
                  direction="left"
                  onClick={handlePrevious}
                  disabled={!canGoPrevious}
                  label={pinsMyShelf ? '이전 팔로우 책장' : '이전 책장'}
                />
              </div>
              <div className="relative" style={{ gridColumnStart: columns }}>
                <ShelfPageButton
                  direction="right"
                  onClick={handleNext}
                  disabled={!canGoNext}
                  label={pinsMyShelf ? '다음 팔로우 책장' : '다음 책장'}
                />
              </div>
            </div>
          </div>

          <LibraryPageIndicator
            currentPageIndex={virtualPageIndex}
            pageCount={pageCount}
            hasMoreFromServer={hasMoreFromServer}
            columns={columns}
            pagingFirstColumn={pagingFirstColumn}
          />
        </div>
      </div>
    </main>
  );
}

interface LibraryPageIndicatorProps {
  currentPageIndex: number;
  pageCount: number;
  hasMoreFromServer: boolean;
  columns: number;
  pagingFirstColumn: number;
}

/**
 * 329(디자인 피드백): 캐비닛 아래 현재 페이지 표시. 좌우 버튼만으로는 "지금 몇 번째인지, 더 있는지"를
 * 알 수 없었다.
 *
 * pageCount는 "지금까지 로드된 팔로우로 만들어지는 페이지 수"라 확정값이 아니다 — 팔로우 목록은
 * 필요할 때만 더 받아오므로(useFollowsQuery), 서버에 더 있으면 넘길수록 늘어난다. 그래서 그 경우
 * 끝에 "…"를 붙여 "여기가 끝이 아닐 수 있다"를 드러낸다(점 개수를 확정처럼 보여주면 거짓말이 된다).
 *
 * 높이는 LIBRARY_PAGE_INDICATOR_BLOCK_PX로 세로 예산에서 이미 차감돼 있다 — 여기 클래스(mt-3, h-2)를
 * 바꾸면 그 상수도 함께 바꿔야 한다(이 파일의 다른 Tailwind ↔ JS 쌍둥이와 같은 규칙).
 *
 * 329(디자인 피드백 "인디케이터가 사라졌어"): 처음에는 "페이지가 하나뿐이고 더 받을 것도 없으면"
 * 점을 아예 그리지 않았는데, 그게 팔로우 0개인 계정에서 인디케이터를 통째로 없애 버렸다(팔로우가
 * 없어도 내 책장 1페이지는 존재하므로 정확히 그 조건에 걸린다). 조건을 없애고 항상 그린다 —
 * 페이지가 하나면 점 하나가 켜진 채로 보이고, 팔로우가 늘어 페이지가 생겨도 자리가 흔들리지 않는다.
 *
 * 329(디자인 피드백): 가운데 기준이 캐비닛 전체가 아니라 **넘어가는 구간**이다. 내 책장이 고정인
 * 구간에서 캐비닛 전체 가운데에 놓으면, 넘어가지도 않는 1열까지 포함해 중심을 잡는 셈이라 점이
 * 왼쪽으로 치우쳐 보인다. 그래서 좌우 버튼과 똑같은 그리드를 다시 깔고(같은 padding·gap·열 수)
 * pagingFirstColumn부터 마지막 열까지를 한 칸으로 묶어 그 안에서 가운데 정렬한다 — 버튼이 감싸는
 * 범위와 정확히 같은 구간이다.
 */
function LibraryPageIndicator({
  currentPageIndex,
  pageCount,
  hasMoreFromServer,
  columns,
  pagingFirstColumn,
}: LibraryPageIndicatorProps) {
  // canGoNext는 "서버에 더 있을 수 있으면"까지 포함해 낙관적으로 켜진다 — 넘겼는데 실제로는 더 없는
  // 경우 현재 인덱스가 세어 둔 페이지 수를 넘어설 수 있다. 그때 점이 하나도 안 켜진 채로 보이면
  // 고장처럼 읽히므로, 지금 서 있는 자리까지는 최소한 페이지가 있는 것으로 센다.
  const visiblePageCount = Math.max(pageCount, currentPageIndex + 1);
  const label = `${currentPageIndex + 1} / ${visiblePageCount}${hasMoreFromServer ? '+' : ''} 페이지`;

  return (
    <div
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        columnGap: SHELF_COLUMN_GAP_PX,
        paddingLeft: LIBRARY_CABINET_SIDE_CHROME_PX,
        paddingRight: LIBRARY_CABINET_SIDE_CHROME_PX,
      }}
      className="mt-3 grid h-2"
      aria-live="polite"
    >
      <div
        style={{ gridColumn: `${pagingFirstColumn} / -1` }}
        className="flex items-center justify-center gap-1.5"
      >
        <span className="sr-only">{label}</span>
        {visiblePageCount > LIBRARY_PAGE_DOTS_MAX ? (
          // 점이 너무 많아지면 현재 위치가 오히려 안 읽힌다 — 숫자로 바꾼다.
          <span aria-hidden="true" className="text-[10px] tabular-nums leading-none text-ink-gray">
            {currentPageIndex + 1} / {visiblePageCount}
            {hasMoreFromServer ? '+' : ''}
          </span>
        ) : (
          <>
            {Array.from({ length: visiblePageCount }, (_, index) => (
              <span
                key={index}
                aria-hidden="true"
                className={`h-1.5 w-1.5 flex-none rounded-full transition ${
                  index === currentPageIndex ? 'bg-pin-navy' : 'bg-line-card'
                }`}
              />
            ))}
            {hasMoreFromServer && (
              <span aria-hidden="true" className="text-[10px] leading-none text-ink-gray-light">
                …
              </span>
            )}
          </>
        )}
      </div>
    </div>
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
//
// 329(디자인 피드백): 트랙 경계에 절반씩 걸친다(-translate-x-1/2 / translate-x-1/2). 한 번
// 빼봤다가 되돌린 값이라 근거를 숫자로 남긴다 — 걸치지 않고 칸 안에 온전히 넣으면 버튼(32px)이
// 책 위를 10px 덮는다. 칸에서 책이 놓이지 않는 여백은 칸 padding 10 + 스크롤 박스 padding 12 =
// 22px뿐이기 때문이다. 절반만 걸치면 안쪽으로 들어오는 폭이 16px이라 그 22px 안에 들어가 **책을
// 전혀 가리지 않는다**.
// 바깥쪽으로도 튀어나가지 않는다: 마지막 열의 오른쪽 경계는 캐비닛 바깥 테두리에서 20px(테두리
// 10 + 본문 padding 10) 안쪽이므로, 절반(16px)이 나가도 테두리 안에 4px이 남는다. 결과적으로
// 버튼이 프레임 위에 걸쳐 앉되 가구 밖으로는 나가지 않는다.
// 세로 중앙 정렬(-translate-y-1/2)과 함께 쓰이므로 두 축의 translate가 합성된다.
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
