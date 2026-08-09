import { useEffect, useState } from 'react';
import { PlaceRecordSheetProvider } from '@/contexts/PlaceRecordSheetProvider';
import { PlaceRecordSheet } from '@/features/records/components/PlaceRecordSheet';
import { MyShelfColumn } from '@/features/collections/components/MyShelfList';
import { FollowedShelfCard } from '@/features/follows/components/FollowedShelfCard';
import { useFollowsQuery } from '@/features/follows/hooks/useFollowsQuery';
import {
  LibraryCornerNav,
  LibraryHeadType,
  LibraryLeftType,
  LibraryRightType,
} from '@/features/library/components/LibrarySpreadPanels';
import { PaperSpreadStage, type ShelfArea } from '@/features/paper/components/PaperSpreadStage';
import {
  getLibraryCabinetHeightPx,
  getLibraryPageCount,
  getLibraryPageSlots,
  getLibraryPagingFirstColumn,
  getPageContentBudgetPx,
  libraryPinsMyShelf,
  LIBRARY_CABINET_SIDE_CHROME_PX,
  LIBRARY_COLUMNS_BY_TIER,
  LIBRARY_ROW_COUNT_BY_TIER,
  SHELF_COLUMN_GAP_PX,
} from '@/shared/lib/shelfCabinetLayout';
import { useLayoutMetrics } from '@/shared/lib/LayoutMetricsContext';
import { useShelfWidthTier, useViewportSize } from '@/shared/lib/useShelfBreakpoint';
import {
  ShelfCabinet,
  ShelfColumn,
  ShelfColumnGrid,
  ShelfColumnHeadSpacer,
  ShelfColumnSkeleton,
} from '@/shared/ui/Shelf';

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
 *
 * 411: 이 화면도 종이 지면 위로 올라갔다(홈·탐색과 같은 무대). 좌측 포스트잇과 우측 이동 표지가
 * 곁열에 서고, 캐비닛은 그 사이에 남은 상자를 실측해 그 안에서 열·행을 정한다 — 페이지가
 * 이 컴포넌트(무대)와 아래 LibraryShelf(캐비닛)로 나뉜 이유가 그것이다.
 */
export function LibraryPage() {
  return (
    <PlaceRecordSheetProvider>
      {/* 홈·탐색과 같은 이유로 PAGE_MIN_HEIGHT_CLASS·PAGE_CONTAINER_CLASS를 쓰지 않는다 — 이 지면은
          여백 없이 화면을 가장자리까지 채운다. 414에서 셸 <main>의 여백이 전부 사라져 content box
          높이가 정확히 100dvh라 h-full이면 된다. */}
      <main className="relative h-full">
        <PaperSpreadStage
          head={<LibraryHeadType />}
          left={<LibraryLeftType />}
          right={<LibraryRightType />}
          corner={<LibraryCornerNav />}
          shelf={(area) => <LibraryShelf area={area.live} layoutArea={area.settled} />}
        />
      </main>
      <PlaceRecordSheet />
    </PlaceRecordSheetProvider>
  );
}

interface LibraryShelfProps {
  /**
   * 캐비닛이 쓸 수 있는 상자(px). 지면이 조판·곁열에 내주는 몫은 CSS의 clamp()/cqw에서 나와
   * JS가 알 수 없으므로 실측한 값을 받는다. 아직 측정 전이면 null이고, 그때는 지금까지의
   * 뷰포트 기반 계산으로 폴백한다(FeedList의 area와 완전히 같은 규약이다).
   */
  area?: ShelfArea | null;
  /** **구성**(몇 열 · 몇 행)을 정할 때만 쓰는 상자. 크기는 area, 구성은 이 값 — ShelfAreaFeed 주석. */
  layoutArea?: ShelfArea | null;
}

function LibraryShelf({ area, layoutArea }: LibraryShelfProps) {
  // ⚠️ 훅은 분기와 무관하게 항상 부른다(호출 순서 고정). 상자를 받으면 값을 쓰지 않을 뿐이다.
  const viewportTier = useShelfWidthTier();
  const { height: viewportHeight } = useViewportSize();
  const { navChromeHeightPx, titleHeightPx } = useLayoutMetrics();

  // 캐비닛 높이만 상자를 쓴다. 크기는 살아 있는 상자(area)를 따라 지면과 함께 자라고, 멎은
  // 상자(layoutArea)는 첫 프레임의 폴백으로만 남는다 — **구성(열·행)은 상자를 보지 않으므로**
  // 411에서 두 상자를 나누던 이유(pageSize가 흔들려 목록을 다시 요청한다)가 책장에는 없다.
  const heightBox = area ?? layoutArea ?? null;

  // 416/21번: 열 수·행 수는 **오직 뷰포트 구간표**에서 나온다. 데이터 개수·로딩 상태·측정 도착
  // 순서 어느 것도 여기에 섞이지 않는다 — 데스크톱 책장은 언제나 3열 × 2행이고, 그 조형이
  // 팔로우가 0개든 20개든 같아야 "가구"로 읽힌다.
  // ⚠️ 411에서 한때 캐비닛 실측 폭으로 열 수를 정했는데 되돌렸다. 그러면 곁열이 붙고 떨어지는
  // 것만으로 3열 → 1열까지 오르내려, 같은 화면에서 책장 모양이 달라졌다.
  const columns = LIBRARY_COLUMNS_BY_TIER[viewportTier];
  const visibleRowCount = LIBRARY_ROW_COUNT_BY_TIER[viewportTier];
  // 330: 판단 기준이 tier가 아니라 열 수다 — libraryPinsMyShelf 주석 참고.
  const pinsMyShelf = libraryPinsMyShelf(columns);
  // 329: 좌우 버튼과 페이지 인디케이터가 공유하는 "넘어가는 구간"의 시작 열. 둘이 같은 값을 써야
  // 버튼이 감싸는 범위와 인디케이터가 가운데를 잡는 범위가 어긋나지 않는다.
  const pagingFirstColumn = getLibraryPagingFirstColumn(columns);

  // 319 디자인 피드백: 캐비닛 높이를 Feed(314)와 같은 실측 기반 동적 예산으로 정한다 — 이전엔
  // h-full 퍼센트 체인 + 스크롤 박스 max-h-[590px] 조합이라, 높은 화면에서 캐비닛이 래퍼를 다
  // 채우지 못하고 아래가 크게 비었다. 여기서 확정한 높이를 캐비닛에 직접 넘기므로 (a) 캐비닛이
  // 화면을 채우고 (b) 좌우 버튼 오버레이(캐비닛과 같은 박스)의 세로 중앙이 곧 캐비닛 중앙이 된다.
  // 329: 캐비닛 아래에 페이지 인디케이터가 생겼다 — 세로 예산에서 그 높이를 덜어낸 나머지가 캐비닛
  // 높이다. 덜지 않으면 인디케이터만큼 화면 밖으로 밀린다(328에서 맞춘 예산 계약).
  // 411: 상자를 받으면 그 높이가 곧 예산이다. 크기는 살아 있는 상자(scaleBox)를 따라 지면과 함께
  // 자란다 — 구성(열·행)만 멎은 상자로 정한다.
  const cabinetHeightPx = getLibraryCabinetHeightPx(
    heightBox
      ? heightBox.heightPx
      : getPageContentBudgetPx(viewportHeight, { navChromeHeightPx, titleHeightPx }, viewportTier),
  );
  const [virtualPageIndex, setVirtualPageIndex] = useState(0);
  // 열 수가 바뀌면(리사이즈) 가상 페이지 크기 자체가 달라져 이전 인덱스가 더 이상 같은 지점을
  // 가리키지 않는다 — 항상 "내 책장"으로 시작하는 첫 페이지로 되돌린다. "prop이 바뀌면 state를
  // 리셋"하는 리액트 표준 패턴(렌더 중 setState) — useEffect+setState는 커밋 후 리렌더를 한 번 더
  // 유발해(react-hooks/set-state-in-effect) 화면이 잠깐 깜빡일 수 있다.
  // 411: 판단 기준을 tier가 아니라 columns로 둔다 — 리셋이 지키려던 것이 처음부터 "가상 페이지
  // 크기"였고 tier는 그 대리 변수였다(libraryPinsMyShelf가 330에 내린 것과 같은 판단).
  const [prevColumns, setPrevColumns] = useState(columns);
  if (columns !== prevColumns) {
    setPrevColumns(columns);
    setVirtualPageIndex(0);
  }

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
  // 416: 남는 칸도 **선반이 깔린 빈 칸**이다. 이전에는 문구 한 줄만 넣어서, 팔로우한 책장이 0개인
  // 계정은 2·3열이 선반 없이 텅 빈 상자로 보였고("책장이 안 보인다"), 목록이 도착하는 순간에만
  // 선반이 나타나 선반 수가 바뀌는 것처럼 보였다. 빈 책장도 책장으로 보여야 한다(Feed가 314에서
  // 내린 것과 같은 결론 — FeedList의 EmptyShelves).
  // ⚠️ rowCount는 책이 놓인 칸과 **같은 visibleRowCount**다 — 다른 값을 주면 열마다 선반 높이가
  // 어긋난다.
  let statusMessageShown = false;
  while (slotNodes.length < columns) {
    const showsMessage = !statusMessageShown && followStatusMessage !== null;
    slotNodes.push(
      <ShelfColumn key={`empty-${slotNodes.length}`}>
        {/* 416/25번: 머리에 놓을 것이 없어도 자리는 비워 둔다 — 그래야 세 열의 첫 선반이 같은
            높이에 온다(ShelfColumnHeadSpacer 주석). */}
        <ShelfColumnHeadSpacer />
        <ShelfColumnSkeleton
          rowCount={visibleRowCount}
          message={showsMessage ? followStatusMessage : null}
          tone={followsQuery.isError ? 'error' : 'muted'}
        />
      </ShelfColumn>,
    );
    statusMessageShown = true;
  }

  return (
    // 411: 페이지 컨테이너·제목 줄은 지면 조판(LibraryHeadType)과 곁열이 대신하므로 여기서
    // 사라졌다. 남은 것은 캐비닛과 그 아래 인디케이터뿐이고, 이 블록이 놓이는 상자(.pe-shelf)는
    // 이미 flex 열이라 my-auto만으로 세로 중앙이 잡힌다.
    // 328: 남는 세로 공간에서 책장이 중앙에 오도록 탐색과 정렬 규칙을 통일한다. 정렬을
    // items-center가 아니라 자식의 my-auto로 주는 이유는 FeedList 주석 참고(낮은 뷰포트에서
    // 위로 밀지 않는다).
    // 319 디자인 피드백: 안쪽 박스는 flex-1이 아니라 flex-none을 그대로 유지한다. 래퍼가
    // 캐비닛보다 크면 그 차이가 전부 캐비닛 아래 빈 여백이 되고, inset-0인 버튼 오버레이도
    // 캐비닛이 아니라 그 빈 공간까지 포함한 박스의 중앙에 놓인다(피드백의 "버튼 위치가 별로다").
    // 이 박스의 높이는 캐비닛 높이 그 자체여야 한다 — 오버레이 inset-0 = 캐비닛 테두리와 정확히
    // 일치한다.
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
        {/* 416/24·28번: 몇 번째 책장인지 **숫자로만** 보여준다. 점은 뺐다 — 점은 "몇 개 중
            몇 번째"를 세어야 알 수 있고, 팔로우 목록이 더 있을 수 있어 개수가 확정되지도
            않는다(그래서 점 끝에 "…"를 달아야 했다). 숫자 하나가 같은 것을 더 정확히 말한다.
            좌측 곁열의 「지금 펼친 쪽」 메모지와 중복이 아니다 — 그쪽은 지면 문법으로 멀리서
            읽는 표시이고, 이 숫자는 좌우 버튼 바로 옆에서 손이 있는 자리의 즉시 피드백이다. */}
        <span aria-hidden="true" className="text-[10px] tabular-nums leading-none text-ink-gray">
          {currentPageIndex + 1} / {visiblePageCount}
          {hasMoreFromServer ? '+' : ''}
        </span>
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
