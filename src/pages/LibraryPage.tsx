import { useState } from 'react';
import { MyShelfColumn } from '@/features/collections/components/MyShelfList';
import { FollowedShelfCard } from '@/features/follows/components/FollowedShelfCard';
import { useFollowsQuery } from '@/features/follows/hooks/useFollowsQuery';
import { ShelfCabinet, ShelfColumn, ShelfColumnGrid } from '@/shared/ui/Shelf';

/**
 * Library: "내 책장"(141)과 "팔로우한 책장"(144)을 한 화면에서 조회한다.
 * 근거: Jira S15P11A705-144/169/250, docs/reference/08_API_명세.md 9장 — 전용 Endpoint 없이 GET /collections +
 * GET /follows + GET /follows/{followId}/collections 조합으로 구성한다.
 * 비주얼은 mockup(PinLog.responsive.dc.html)의 책장(cabinet-shell) 스타일을 따른다 — 제목은 목업의
 * pageHeading('나의 책장')을 그대로 쓴다.
 *
 * 250: "내 책장"과 "팔로우한 책장"을 각자 다른 캐비닛으로 세로로 쌓지 않고, 캐비닛 하나를 3열로 나눠
 * 붙여 쓴다 — 1열은 내 책장(MyShelfColumn, 세로 스크롤만), 2·3열은 팔로우한 책장을 페이지당 2개씩
 * 이전/다음 버튼으로 넘긴다. FeedList(249)와 동일한 cursorHistory 패턴이라 "이전"은 재요청 없이 캐시를
 * 쓰고, "다음"은 항상 직전 페이지의 nextCursor로만 이어받는다. 페이지네이션 상태를 이 페이지 레벨에
 * 두는 이유는 3열 그리드 안의 2·3열 칸과 캐비닛 바깥의 이전/다음 버튼이 같은 상태를 공유해야 해서다.
 * 이전/다음 버튼은 캐비닛 안쪽 텍스트 블록이 아니라 원형 아이콘 버튼이다 — 상태 로직
 * (cursorHistory/pageIndex/canGoPrevious/canGoNext)은 그대로 두고 배치·스타일만 바꿨다.
 * 페이지네이션은 2·3열(팔로우 책장)에만 적용되므로, 버튼은 캐비닛 전체 좌우가 아니라 "1열 | 2·3열"
 * 경계에 겹치도록 둔다. 실제 콘텐츠 그리드(ShelfColumnGrid/ShelfColumn)는 건드리지 않고, 같은
 * grid-cols-3/gap-x-5/여백(28px = 캐비닛 border-[8px] + body px-5)을 쓰는 투명 오버레이 그리드를
 * ShelfCabinet의 형제로 하나 더 둬서 경계 위치만 그대로 재사용한다 — ShelfCabinet엔 overflow-hidden이
 * 걸려 있어 버튼을 그 안(자손)에 두면 바깥으로 걸치는 부분이 잘리고, 세로 중앙 기준도 캐비닛 전체
 * 높이가 아니라 그리드 높이로 바뀌어 버리기 때문에 형제 오버레이 방식을 쓴다.
 */
export function LibraryPage() {
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);

  const cursor = cursorHistory[pageIndex];
  const followsQuery = useFollowsQuery(cursor);

  const canGoPrevious = pageIndex > 0;
  const canGoNext = followsQuery.data?.hasNext ?? false;

  const handlePrevious = () => {
    if (!canGoPrevious) {
      return;
    }
    setPageIndex((index) => index - 1);
  };

  const handleNext = () => {
    const page = followsQuery.data;
    if (!page?.hasNext) {
      return;
    }
    const nextIndex = pageIndex + 1;
    setCursorHistory((history) =>
      nextIndex < history.length ? history : [...history, page.nextCursor ?? undefined],
    );
    setPageIndex(nextIndex);
  };

  const follows = followsQuery.data?.items ?? [];
  // 2·3열 중 채워지지 않은 칸에만 보여줄 안내 문구 — 로딩/에러/빈 목록 모두 1열(follows[0] 자리)에만 둔다.
  const followStatusMessage = followsQuery.isPending
    ? '불러오는 중…'
    : followsQuery.isError
      ? '팔로우 목록을 불러오지 못했어요.'
      : follows.length === 0
        ? '아직 팔로우한 책장이 없어요'
        : null;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <h1 className="text-[27px] font-bold tracking-tight text-pin-navy">나의 책장</h1>

      <div className="relative">
        <ShelfCabinet headerTitle="나의 책장">
          <ShelfColumnGrid>
            <ShelfColumn>
              <MyShelfColumn />
            </ShelfColumn>

            {[0, 1].map((slot) => {
              const follow = follows[slot];
              return (
                <ShelfColumn key={slot}>
                  {follow ? (
                    <FollowedShelfCard followId={follow.followId} alias={follow.alias} />
                  ) : (
                    slot === 0 &&
                    followStatusMessage && (
                      <p
                        className={
                          followsQuery.isError ? 'text-sm text-red-400' : 'text-sm text-white/50'
                        }
                      >
                        {followStatusMessage}
                      </p>
                    )
                  )}
                </ShelfColumn>
              );
            })}
          </ShelfColumnGrid>
        </ShelfCabinet>

        {/* 실제 콘텐츠 그리드와 동일한 grid-cols-3/gap-x-5/여백(28px)을 쓰는 투명 오버레이 — 트랙1
            오른쪽 끝이 "1열|2열" 경계, col-span-2(트랙2~3) 오른쪽 끝이 3열 오른쪽 끝과 정확히 일치한다. */}
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
