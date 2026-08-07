import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PaperStage } from '@/features/paper/components/PaperStage';
import { MyShelfColumn } from '@/features/collections/components/MyShelfList';
import { FollowedShelfCard } from '@/features/follows/components/FollowedShelfCard';
import { useFollowsQuery } from '@/features/follows/hooks/useFollowsQuery';
import { useMeSummaryQuery } from '@/features/me/hooks/useMeSummaryQuery';
import {
  getLibraryTierHeightPx,
  getShelfRowsFit,
  getShelfScale,
  LIBRARY_COLUMNS_BY_TIER,
  SHELF_TIER_GAP_PX,
} from '@/shared/lib/shelfCabinetLayout';
import {
  SHELF_SCROLL_BOTTOM_PADDING_PX,
  SHELF_SCROLL_TOP_PADDING_PX,
} from '@/shared/lib/shelfSpine';
import { useShelfWidthTier, useViewportSize } from '@/shared/lib/useShelfBreakpoint';
import { PaperCornerNav } from '@/shared/ui/PaperCornerNav';
import '@/features/library/libraryPaper.css';

/**
 * 책장 — "지면 위의 두 단".
 *
 * 홈("종이에 오려낸 창")·탐색("펼쳐 놓은 종이 위의 책장")과 같은 종이 위에 있다. 시안
 * library-open-shelf.html이 확정해 준 것은 색이 아니라 구조다(그 시안은 네이비 무대 기준이다) —
 * 가구를 걷어내고 판 위에 책만 세우고, 머리 조판은 라벨 → 제목 → 괘선 → 숫자로 간다.
 * 값·근거는 features/library/libraryPaper.css 머리말 참고.
 *
 * 개편에서 바뀐 것:
 *  - 아이보리 캐비닛(ShelfCabinet)과 오목한 칸(ShelfColumn)을 걷어냈다. 남는 것은 판(ShelfPlank)뿐이다.
 *  - "내 책장 + 팔로우한 책장"을 한 캐비닛의 열로 섞지 않고 **지면을 위아래로 나눈다.** 내 것과
 *    남의 것이 같은 칸에 섞이면 구분이 되지 않는다는 판단이고, 그 결과 페이징도 단순해졌다 —
 *    예전에는 열 수에 따라 내 책장이 시퀀스에 섞였다 빠졌다 해서 규칙이 두 갈래였는데, 이제
 *    아래 단이 팔로우만 columns개씩 넘긴다.
 *  - 세로 예산을 뷰포트에서 역산하지 않고 **내 책장 단의 상자를 실측**한다(탐색과 같은 방식).
 *    지면이 조판·아래 단에 내주는 몫이 CSS의 clamp()에서 나와 JS가 알 수 없기 때문이다.
 *
 * 데이터 계약은 그대로다: GET /collections + GET /follows + GET /follows/{followId}/collections
 * (08_API_명세 9장). 팔로우 목록은 무한 쿼리로 누적하고 화면에서 잘라 쓴다 — "한 번에 몇 개를
 * 보여줄지"와 "네트워크에서 얼마나 받아올지"를 분리해 두면 두 경계가 어긋나도 문제없다.
 */
export function LibraryPage() {
  const tier = useShelfWidthTier();
  // 아래 단(팔로우한 책장)이 한 번에 세우는 칸 수. 위 단은 지면 폭을 통째로 쓰므로 열 개념이 없다.
  const columns = LIBRARY_COLUMNS_BY_TIER[tier];
  const { width: viewportWidth } = useViewportSize();
  const shelfScale = getShelfScale(viewportWidth);

  const summaryQuery = useMeSummaryQuery();

  // 내 책장 단이 실제로 쓸 수 있는 세로. 첫 측정은 페인트 전에 끝낸다 — 한 프레임이라도 폴백
  // 행 수로 그리면 책이 한 줄 더/덜 깔렸다가 바뀌는 것이 눈에 띈다(탐색에서 같은 함정을 겪었다).
  const mineBodyRef = useRef<HTMLDivElement>(null);
  const [mineBodyHeightPx, setMineBodyHeightPx] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = mineBodyRef.current;
    if (element) {
      setMineBodyHeightPx(Math.floor(element.getBoundingClientRect().height));
    }
  }, []);

  useEffect(() => {
    const element = mineBodyRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const box = entry.contentBoxSize?.[0];
        setMineBodyHeightPx(Math.floor(box?.blockSize ?? entry.contentRect.height));
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // 실측 전 한 프레임에만 쓰는 값. getShelfRowsFit이 하한 2행을 보장하므로 0을 넘겨도 안전하다.
  const visibleRowCount = getShelfRowsFit(mineBodyHeightPx ?? 0, shelfScale);

  // 선반이 **정확히 이 높이**를 갖게 못박는다. 그냥 남는 세로를 다 주면 행들이 그 여분을 나눠
  // 가지면서(Shelf.tsx ShelfRow의 grow) 책 위로 빈 머리 공간이 크게 벌어진다 — 가구 안에서는
  // 칸을 채우는 동작이라 맞았지만, 가구를 걷어낸 지면에서는 그 공백이 그대로 드러난다.
  // 남는 세로는 행이 아니라 **단 아래 여백**으로 남는다.
  // ⚠️ 이 높이를 재는 상자(mineBodyRef)와 이 높이를 쓰는 상자는 반드시 달라야 한다. 같은 상자에
  // 걸면 "재고 → 줄이고 → 다시 재고"가 반복돼 행 수가 계속 줄어든다.
  const mineShelfHeightPx =
    visibleRowCount * getLibraryTierHeightPx(shelfScale) +
    (visibleRowCount - 1) * SHELF_TIER_GAP_PX +
    SHELF_SCROLL_TOP_PADDING_PX +
    SHELF_SCROLL_BOTTOM_PADDING_PX;

  // 팔로우 칸 하나의 높이. 위 단과 같은 이유로 못박는다(칸마다 권수가 달라 높이가 제각각이면
  // 판이 서로 다른 높이에 깔려 한 줄로 안 읽힌다). 별칭 머리 행(28px = ShelfLabel/ShelfIconButton의
  // h-7)과 그 아래 간격(.lb-follow-cell의 gap 8px)을 더한다 — 그 둘은 Tailwind·CSS 리터럴이라
  // 여기 값과 수동으로 맞춘다.
  const FOLLOW_HEADER_PX = 28;
  const FOLLOW_HEADER_GAP_PX = 8;
  const followCellHeightPx =
    FOLLOW_HEADER_PX +
    FOLLOW_HEADER_GAP_PX +
    getLibraryTierHeightPx(shelfScale) +
    SHELF_SCROLL_TOP_PADDING_PX +
    SHELF_SCROLL_BOTTOM_PADDING_PX;

  const [followPageIndex, setFollowPageIndex] = useState(0);
  // 구간이 바뀌면(리사이즈로 tier 전환) 한 쪽에 담기는 칸 수가 달라져 이전 인덱스가 더 이상 같은
  // 지점을 가리키지 않는다 — 첫 쪽으로 되돌린다. "prop이 바뀌면 state를 리셋"하는 리액트 표준
  // 패턴(렌더 중 setState)이다. useEffect+setState는 커밋 후 리렌더를 한 번 더 유발해 화면이
  // 잠깐 깜빡인다.
  const [prevColumns, setPrevColumns] = useState(columns);
  if (columns !== prevColumns) {
    setPrevColumns(columns);
    setFollowPageIndex(0);
  }

  const followsQuery = useFollowsQuery();
  const pages = followsQuery.data?.pages ?? [];
  const allFollows = pages.flatMap((page) => page.items);
  const hasMoreFromServer = pages.length > 0 ? pages[pages.length - 1].hasNext : true;

  const followStartIndex = followPageIndex * columns;
  const visibleFollows = allFollows.slice(followStartIndex, followStartIndex + columns);
  const needsMoreData = followStartIndex + columns > allFollows.length;

  // 좌우로 넘길 때 필요한 만큼 데이터가 없으면 자동으로 더 받아온다 — 사용자는 다음만 누르면 된다.
  useEffect(() => {
    if (needsMoreData && hasMoreFromServer && !followsQuery.isFetchingNextPage) {
      void followsQuery.fetchNextPage();
    }
  }, [needsMoreData, hasMoreFromServer, followsQuery]);

  const canGoPrevious = followPageIndex > 0;
  // 이번 쪽을 채우고도 남는 팔로우가 있거나 서버에 더 있을 수 있으면 다음이 가능하다고 본다 —
  // 실제로 비어 있으면 fetchNextPage 이후 자연히 disabled로 바뀐다.
  const canGoNext =
    allFollows.length > followStartIndex + visibleFollows.length || hasMoreFromServer;
  // "지금까지 아는 쪽 수"이지 확정된 전체가 아니다 — 팔로우 목록은 필요할 때만 더 받아오므로
  // 서버에 더 있으면 넘길수록 늘어난다. 그래서 hasNext일 때는 뒤에 +를 붙여 그 사실을 드러낸다.
  const knownPageCount = Math.max(1, Math.ceil(allFollows.length / columns));

  // 팔로우가 하나도 없는 것은 오류가 아니라 정상 상태다. 다만 "모자란데 더 받아올 수 있는" 동안은
  // 아직 확정이 아니므로 문구를 미룬다(그 조건이 곧 위 fetchNextPage 조건이다).
  const willFetchMoreFollows = needsMoreData && hasMoreFromServer;
  let followNote: string | null = null;
  if (followsQuery.isPending) {
    followNote = '불러오는 중…';
  } else if (followsQuery.isError) {
    followNote = '팔로우 목록을 불러오지 못했어요.';
  } else if (visibleFollows.length === 0 && !willFetchMoreFollows) {
    followNote = '아직 팔로우한 책장이 없어요.';
  }

  return (
    // 홈·탐색과 같은 이유로 페이지 여백 상수(PAGE_INSET_CLASS/PAGE_MIN_HEIGHT_CLASS)를 쓰지 않는다 —
    // 지면이 화면을 가장자리까지 채우고, 여백은 지면 안에서 --lb-pad가 준다. 셸 <main>의 content
    // box 높이가 정확히 100dvh라 h-full이면 그대로 들어맞는다.
    <main className="relative h-full">
      <PaperStage className="lb-stage">
        <header className="lb-head">
          <p className="lb-eyebrow">PINLOG · 나의 서가</p>
          <h1 className="pl-display lb-title">나의 책장</h1>
          {/* 두 수는 서버 값 그대로다(GET /me/summary) — 화면에서 세지 않는다. 목록은 쪽 단위로만
              받아오므로 프론트가 세면 "지금 보이는 것"만 세게 된다. 아직 받기 전에는 자리만 잡아
              둔다(자릿수가 들어오며 조판이 흔들리지 않게 대체 문자를 세운다). */}
          <div className="lb-tally">
            <div>
              <b>{summaryQuery.data?.collectionCount ?? '—'}</b>
              <span>권</span>
            </div>
            <div>
              <b>{summaryQuery.data?.recordCount ?? '—'}</b>
              <span>곳</span>
            </div>
          </div>
        </header>

        <PaperCornerNav
          className="lb-cornernav"
          items={[
            { to: '/', label: '홈' },
            { to: '/feed', label: '탐색' },
          ]}
        />

        {/* ── 위 단: 내 책장 ─────────────────────────────────────────────
            단 머리가 이미 "내 컬렉션"이라고 말하므로 MyShelfColumn의 알약 라벨은 끈다. */}
        <section className="lb-tier lb-tier-mine">
          <h2 className="lb-tier-h">내 컬렉션</h2>
          <div ref={mineBodyRef} className="lb-tier-body">
            <div className="lb-shelf-box" style={{ height: mineShelfHeightPx }}>
              <MyShelfColumn visibleRowCount={visibleRowCount} showLabel={false} />
            </div>
          </div>
        </section>

        {/* ── 아래 단: 팔로우한 책장 ─────────────────────────────────────
            한 줄 고정이다. 남는 세로는 전부 위 단이 갖는다 — 내 책장이 이 화면의 주인공이다. */}
        <section className="lb-tier lb-tier-follows">
          <h2 className="lb-tier-h">
            팔로우한 책장
            <span className="lb-tier-tools">
              <LibraryArrowButton
                direction="left"
                disabled={!canGoPrevious}
                onClick={() => setFollowPageIndex((index) => index - 1)}
              />
              <span className="lb-folio">
                {followPageIndex + 1} / {knownPageCount}
                {hasMoreFromServer ? '+' : ''}
              </span>
              <LibraryArrowButton
                direction="right"
                disabled={!canGoNext}
                onClick={() => setFollowPageIndex((index) => index + 1)}
              />
            </span>
          </h2>

          <div className="lb-tier-body">
            {followNote ? (
              <p className={followsQuery.isError ? 'lb-note lb-note-error' : 'lb-note'}>
                {followNote}
              </p>
            ) : (
              <div
                className="lb-follow-grid"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              >
                {visibleFollows.map((follow, indexInPage) => (
                  <div
                    key={follow.followId}
                    className="lb-follow-cell"
                    style={{ height: followCellHeightPx }}
                  >
                    <FollowedShelfCard
                      followId={follow.followId}
                      alias={follow.alias}
                      columnSlot={indexInPage}
                      // 아래 단은 한 줄이다 — 팔로우한 책장은 "누가 무엇을 모았는지" 훑어보는
                      // 자리이지 그 안을 파고드는 자리가 아니다(파고들기는 그 책장으로 들어간다).
                      visibleRowCount={1}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </PaperStage>
    </main>
  );
}

/**
 * 쪽 넘김 화살표. 탐색의 것(FeedList FeedArrowButton)과 같은 규격·같은 색이다 — 두 화면이 같은
 * 지면 위에 있으므로 같은 물건으로 보여야 한다.
 */
function LibraryArrowButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'left' | 'right';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'left' ? '이전 쪽' : '다음 쪽'}
      className="grid h-7 w-7 place-items-center rounded-full border border-pin-navy/25 bg-[#faf7f6] text-pin-navy shadow-[0_2px_10px_rgba(4,33,66,.14)] transition hover:border-log-mint hover:bg-log-mint hover:text-pin-navy disabled:pointer-events-none disabled:opacity-35"
    >
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
    </button>
  );
}
