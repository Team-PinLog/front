import { useEffect, useState } from 'react';
import { MyShelfColumn } from '@/features/collections/components/MyShelfList';
import { FollowedShelfCard } from '@/features/follows/components/FollowedShelfCard';
import { useFollowsQuery } from '@/features/follows/hooks/useFollowsQuery';
import type { FollowListItem } from '@/features/follows/api/getFollows';
import {
  LIBRARY_COLUMNS_BY_TIER,
  PAGE_CONTAINER_CLASS,
  PAGE_TITLE_GAP_CLASS,
  PAGE_VERTICAL_PADDING_CLASS,
} from '@/shared/lib/shelfCabinetLayout';
import { useShelfWidthTier } from '@/shared/lib/useShelfBreakpoint';
import { PageTitle } from '@/shared/ui/PageTitle';
import { ShelfCabinet, ShelfColumn, ShelfColumnGrid } from '@/shared/ui/Shelf';

interface LibraryPageSlots {
  showMyShelf: boolean;
  follows: FollowListItem[];
  // allFollows 안에서 이 페이지의 follows가 시작하는 인덱스 — "다음 페이지에 필요한 만큼 데이터가
  // 이미 로드됐는지"(needsMoreData) 판단에 쓴다.
  followStartIndex: number;
}

// 295 반응형 재설계(요구사항 B) 핵심 로직: "내 책장 + 팔로우한 책장"을 breakpoint별로 다르게 자른다.
// xl: 내 책장은 시퀀스 밖에서 항상 고정(showMyShelf=true 불변) — 팔로우만 (columns-1)개씩 넘어간다
// (기존 250 동작 그대로).
// mdlg·sm: 사용자 확인("화면 크기에 따라 책장이 1,2열일 때는 나의 책장도 팔로우한 책장들과 한 줄로
// 묶여 좌우 버튼으로 넘어가야 한다. 그치만 시작은 항상 나의 책장이 시작이다")에 따라, [내 책장,
// 팔로우1, 팔로우2, ...] 하나의 가상 시퀀스를 columns개씩 자른다 — virtualPageIndex 0은 항상 내
// 책장으로 시작하고(팔로우 (columns-1)개와 함께), 그 이후 페이지는 팔로우한 책장만으로 채워진다.
function getLibraryPageSlots(
  virtualPageIndex: number,
  columns: number,
  isXl: boolean,
  allFollows: FollowListItem[],
): LibraryPageSlots {
  if (isXl) {
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
 * (ShelfColumnGrid/ShelfColumn)는 건드리지 않고, 같은 gap-x-5/여백(28px = 캐비닛 border-[8px] + body
 * px-5, 둘 다 --shelf-scale 스케일 대상이 아닌 고정값이라 오버레이도 고정값으로 맞춘다)을 쓰는 투명
 * 오버레이를 ShelfCabinet의 형제로 하나 더 둬서 경계 위치만 그대로 재사용한다 — ShelfCabinet엔
 * overflow-hidden이 걸려 있어 버튼을 그 안(자손)에 두면 바깥으로 걸치는 부분이 잘리고, 세로 중앙
 * 기준도 캐비닛 전체 높이가 아니라 그리드 높이로 바뀌어 버리기 때문에 형제 오버레이 방식을 쓴다.
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
  const isXl = tier === 'xl';

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

  const pageSlots = getLibraryPageSlots(virtualPageIndex, columns, isXl, allFollows);
  const expectedFollowCount = isXl ? columns - 1 : virtualPageIndex === 0 ? columns - 1 : columns;
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
        <MyShelfColumn />
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
        />
      </ShelfColumn>,
    );
  });
  let statusMessageShown = false;
  while (slotNodes.length < columns) {
    slotNodes.push(
      <ShelfColumn key={`empty-${slotNodes.length}`}>
        {!statusMessageShown && followStatusMessage && (
          <p className={followsQuery.isError ? 'text-sm text-red-400' : 'text-sm text-white/50'}>
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
    // 295 추가 수정(요구사항 2.2): sm·mdlg는 3.5rem(56px)을 뺀다 — AppLayout의 헤더 padding
    // 축소(FeedPage.tsx와 동일 근거)와 반드시 함께 맞춘다. 페이지 상하 padding도
    // PAGE_VERTICAL_PADDING_CLASS로 바뀌었다.
    // 304: xl은 상단 헤더가 좌측 사이드바로 바뀌어 세로로 뺄 헤더 높이가 없다 — AppLayout main이
    // xl:pl-60(가로 오프셋)만 쓰므로 xl:min-h-[100dvh]로 뷰포트 높이 전체를 그대로 쓴다
    // (FeedPage.tsx와 동일 근거).
    <main
      className={`${PAGE_CONTAINER_CLASS} flex min-h-[calc(100dvh-3.5rem)] flex-col ${PAGE_TITLE_GAP_CLASS} ${PAGE_VERTICAL_PADDING_CLASS} xl:min-h-[100dvh]`}
    >
      <PageTitle
        className="text-[27px] font-bold tracking-tight text-pin-navy"
        description="저장한 장소를 책처럼 꺼내보고 컬렉션으로 정리해 보세요."
      >
        나의 책장
      </PageTitle>

      <div className="relative min-h-0 flex-1">
        <ShelfCabinet headerTitle="나의 책장">
          <ShelfColumnGrid columns={columns}>{slotNodes}</ShelfColumnGrid>
        </ShelfCabinet>

        {isXl ? (
          // xl: 기존(250) 그대로 — "1열|2열" 내부 경계에 이전 버튼, 그리드 오른쪽 바깥 끝에 다음
          // 버튼. 실제 콘텐츠 그리드와 동일한 grid-cols-3/gap-x-5/여백(28px)을 쓰는 투명 오버레이.
          <div className="pointer-events-none absolute inset-0 grid grid-cols-3 gap-x-5 px-[28px]">
            <div className="relative">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={!canGoPrevious}
                aria-label="이전 팔로우 책장"
                className="pointer-events-auto absolute right-0 top-1/2 grid h-8 w-8 translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[#172742] text-[#d8e0ed] shadow-[0_4px_10px_rgba(4,18,38,.35)] transition hover:border-log-mint hover:bg-log-mint hover:text-pin-navy disabled:opacity-40"
              >
                <ChevronIcon direction="left" />
              </button>
            </div>
            <div className="relative col-span-2">
              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext}
                aria-label="다음 팔로우 책장"
                className="pointer-events-auto absolute right-0 top-1/2 grid h-8 w-8 translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[#172742] text-[#d8e0ed] shadow-[0_4px_10px_rgba(4,18,38,.35)] transition hover:border-log-mint hover:bg-log-mint hover:text-pin-navy disabled:opacity-40"
              >
                <ChevronIcon direction="right" />
              </button>
            </div>
          </div>
        ) : (
          // mdlg·sm: "내 책장"도 시퀀스에 포함돼 함께 페이징되므로, 버튼은 특정 열 경계가 아니라
          // 그리드 전체의 좌우 바깥 끝에 둔다(같은 28px 여백 기준으로 안쪽 콘텐츠 경계에 맞춘다).
          <div className="pointer-events-none absolute inset-0 px-[28px]">
            <div className="relative h-full">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={!canGoPrevious}
                aria-label="이전 책장"
                className="pointer-events-auto absolute left-0 top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[#172742] text-[#d8e0ed] shadow-[0_4px_10px_rgba(4,18,38,.35)] transition hover:border-log-mint hover:bg-log-mint hover:text-pin-navy disabled:opacity-40"
              >
                <ChevronIcon direction="left" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext}
                aria-label="다음 책장"
                className="pointer-events-auto absolute right-0 top-1/2 grid h-8 w-8 translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[#172742] text-[#d8e0ed] shadow-[0_4px_10px_rgba(4,18,38,.35)] transition hover:border-log-mint hover:bg-log-mint hover:text-pin-navy disabled:opacity-40"
              >
                <ChevronIcon direction="right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
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
