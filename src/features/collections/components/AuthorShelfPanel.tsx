import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { getIsLoggedIn } from '@/features/auth/lib/getIsLoggedIn';
import { savePreLoginPath } from '@/features/auth/lib/preLoginPath';
import { getSpineColor } from '@/shared/lib/shelfSpine';
import { PendingLabel } from '@/shared/ui/PendingLabel';
import { useShelfExploreQuery } from '@/features/feed/hooks/useShelfExploreQuery';
import { useFollowMutation } from '@/features/follows/hooks/useFollowMutation';
import { useUnfollowMutation } from '@/features/follows/hooks/useUnfollowMutation';

/**
 * 한 화면(=한 쪽)에 세우는 책 수. **2열 고정 × 선반 2행**이다(418-34; 원래 3행이었다).
 * 이보다 많으면 선반이 세로로 자라 펼침면 밖으로 나간다 — 그것이 이 컴포넌트가 만들어진 이유다.
 * 넘치는 권수는 세로로 늘리지 않고 쪽 넘김으로 받는다.
 */
const SHELF_COLUMNS = 2;
const SHELF_ROWS = 2;
const ITEMS_PER_PAGE = SHELF_COLUMNS * SHELF_ROWS;

interface AuthorShelfPanelProps {
  collectionId: number;
  /** 좁은 화면의 서랍에서 책을 고르면 서랍을 닫기 위해 호출부가 넘긴다. */
  onSelectCollection?: () => void;
}

/**
 * 418 — 컬렉션 펼침면 왼쪽에 세우는 "이 작성자의 다른 컬렉션".
 *
 * ## 왜 ShelfExploreSection을 그대로 쓰지 않는가
 *
 * 데이터 경로(`useShelfExploreQuery`)·Follow 로직(`useFollowMutation`/`useUnfollowMutation`)·이동
 * 경로(`/collections/$collectionId` + `shelfContext` state, Feed 이벤트 파라미터 **비전달**)는
 * 143/332가 확정한 것을 **그대로 재사용**한다. 다시 만든 것은 배치뿐이다:
 *
 * - `ShelfExploreSection`(features/feed 소유)은 1열 나무 캐비닛 + `overflow-y-auto`라 항목이 늘면
 *   세로로 자라며 스크롤된다. 418이 결함으로 지목한 지점이 정확히 그것이다.
 * - 고쳐야 할 방향(2열 고정·스크롤 없음)이 그 컴포넌트의 다른 사용처(피드 쪽)에도 그대로 강요되면
 *   안 되고, 그 파일은 이 worktree의 담당 범위 밖이다.
 *
 * 그래서 배치만 이 화면 소유로 새로 두되, **책등 색·글자 색은 공용 규약(shelfSpine)을 그대로 쓴다**
 * — 같은 컬렉션이 화면마다 다른 색이면 "그 책"이라는 인식이 깨진다.
 *
 * ## 스크롤 대신 쪽 넘김
 *
 * 항목이 6권을 넘으면 세로로 늘리지 않고 **쪽을 넘긴다**. 다음 쪽이 아직 로드되지 않았으면 그때
 * `fetchNextPage`로 이어 받는다(커서 페이지네이션은 그대로다).
 *
 * ## 공개 범위
 *
 * 표시하는 값은 `title`·`recordCount`뿐이고 진입점은 `collectionId`다 — `member.id`를 쓰지 않는다
 * (privacy-rules.md: "타인 접근의 진입점은 Collection id"). 143이 이 경로를 고른 근거를 그대로 잇는다.
 */
export function AuthorShelfPanel({ collectionId, onSelectCollection }: AuthorShelfPanelProps) {
  const navigate = useNavigate();
  const shelfExploreQuery = useShelfExploreQuery(collectionId);
  const followMutation = useFollowMutation();
  const unfollowMutation = useUnfollowMutation();
  const [pageIndex, setPageIndex] = useState(0);

  // 418-35: 패널 위에 붙어 있던 "이 작성자의 다른 컬렉션" 제목을 뺐다 — 책등이 늘어선 모양 자체가
  // 이미 "다른 컬렉션"을 말하고 있어 글자가 한 겹 더 얹히면 종이 위가 라벨투성이가 된다.
  // 화면에서 사라진 만큼 이름은 <section>의 aria-label로 남긴다(스크린리더에는 그대로 들린다).
  const SHELF_LABEL = '이 작성자의 다른 컬렉션';

  if (shelfExploreQuery.isPending || shelfExploreQuery.isError) {
    return (
      <section aria-label={SHELF_LABEL} className="flex h-full min-h-0 flex-col gap-3">
        <p
          className={`text-[13px] ${shelfExploreQuery.isError ? 'text-red-600' : 'text-[#a29d95]'}`}
        >
          {shelfExploreQuery.isError ? '책장을 불러오지 못했어요.' : '책장을 세우는 중…'}
        </p>
      </section>
    );
  }

  const pages = shelfExploreQuery.data.pages;
  // follow(followed/followId/alias)는 페이지네이션 대상이 아니다(08_API_명세 8.1) — 첫 페이지에서만 꺼내 쓴다.
  const { follow } = pages[0];
  const otherCollections = pages.flatMap((page) => page.collections.items);
  const hasNext = pages[pages.length - 1].collections.hasNext;

  const visible = otherCollections.slice(
    pageIndex * ITEMS_PER_PAGE,
    (pageIndex + 1) * ITEMS_PER_PAGE,
  );
  const canGoNext = (pageIndex + 1) * ITEMS_PER_PAGE < otherCollections.length || hasNext;
  const canGoPrevious = pageIndex > 0;
  // 로드된 수로 낸 쪽 수. 더 받을 게 남아 있으면(hasNext) 총 쪽 수는 아직 확정이 아니라 '+'를 붙인다.
  const pageCount = Math.max(1, Math.ceil(otherCollections.length / ITEMS_PER_PAGE));

  const isFollowPending = followMutation.isPending || unfollowMutation.isPending;
  // logged_in 쿠키 기반 UI 힌트(143과 동일) — 실제 인가 판단이 아니라 버튼 문구·동작 분기에만 쓴다.
  const isLoggedIn = getIsLoggedIn();

  const handleLoginRedirect = () => {
    savePreLoginPath();
    void navigate({ to: '/login' });
  };

  const handleFollowToggle = () => {
    if (follow.followed) {
      if (follow.followId === null) {
        return;
      }
      unfollowMutation.mutate({ followId: follow.followId, sourceCollectionId: collectionId });
    } else {
      followMutation.mutate(collectionId);
    }
  };

  const handleNextPage = () => {
    const nextStart = (pageIndex + 1) * ITEMS_PER_PAGE;
    if (nextStart < otherCollections.length) {
      setPageIndex(pageIndex + 1);
      return;
    }
    if (hasNext && !shelfExploreQuery.isFetchingNextPage) {
      // 아직 안 받은 쪽이다 — 받아온 뒤에 넘긴다(빈 쪽을 먼저 보여주지 않는다).
      void shelfExploreQuery.fetchNextPage().then(() => setPageIndex(pageIndex + 1));
    }
  };

  const followError = followMutation.error ?? unfollowMutation.error;

  return (
    <section aria-label={SHELF_LABEL} className="flex h-full min-h-0 flex-col gap-4">
      {/* 제목이 빠져 이 줄에는 팔로우 버튼만 남는다 — 오른쪽에 붙여 둔다. */}
      <div className="flex flex-none items-center justify-end gap-3">
        {isLoggedIn ? (
          <button
            type="button"
            onClick={handleFollowToggle}
            disabled={isFollowPending}
            aria-busy={isFollowPending}
            className={`h-8 flex-none rounded-full px-3.5 text-[12px] font-bold transition-colors disabled:opacity-40 ${
              follow.followed
                ? 'border border-[#ded8cd] bg-white/70 text-[#6f6a63] hover:border-[#c7bda9]'
                : 'bg-[#4f9b78] text-white hover:bg-[#448a6a]'
            }`}
          >
            {/* 396: 라벨을 "처리 중…"으로 교체하면 버튼 폭이 튄다. 라벨은 그대로 두고 스피너만 겹친다. */}
            <PendingLabel pending={isFollowPending}>
              {follow.followed ? '팔로우 해제' : '팔로우'}
            </PendingLabel>
          </button>
        ) : (
          // 비로그인은 API 호출 없이 로그인 화면으로 보낸다 — 401을 받은 뒤 처리하는 게 아니라 애초에 호출하지 않는다.
          <button
            type="button"
            onClick={handleLoginRedirect}
            className="h-8 flex-none rounded-full bg-[#4f9b78] px-3.5 text-[12px] font-bold text-white"
          >
            로그인하고 팔로우
          </button>
        )}
      </div>

      {followError && <p className="flex-none text-[12px] text-red-600">{followError.message}</p>}

      {otherCollections.length === 0 ? (
        <p className="flex-none text-[13px] text-[#a29d95]">아직 다른 컬렉션이 없어요.</p>
      ) : (
        <>
          {/* 2열 고정. 줄 수도 고정이라 항목이 몇이든 이 상자의 높이는 변하지 않는다. */}
          <div className="grid flex-none grid-cols-2 gap-x-3 gap-y-3">
            {visible.map((collection, indexInPage) => {
              const spineColor = getSpineColor(collection.collectionId);
              return (
                <button
                  key={collection.collectionId}
                  type="button"
                  onClick={() => {
                    onSelectCollection?.();
                    void navigate({
                      to: '/collections/$collectionId',
                      params: { collectionId: collection.collectionId },
                      // shelfContext: 책장에서 책장으로 넘어가는 동안 이 패널이 유지되게 하는 마커
                      // (router.tsx HistoryState). Feed 이벤트 값(feedRequestId/feedPosition)은 절대
                      // 물려주지 않는다 — 그 값은 Feed 응답에 귀속돼 있어 재사용하면 SAVE 이벤트가
                      // 엉뚱한 슬롯에 붙는다(143/332의 판단 그대로).
                      state: { collectionOverlay: true, shelfContext: true },
                      // replace: 책을 갈아 끼우는 동작이지 새 화면으로 들어가는 게 아니다. push하면
                      // 닫기(history.back)가 직전에 보던 책으로 되돌아가 안 닫힌 것처럼 보인다(332).
                      replace: true,
                    });
                  }}
                  title={`${collection.title} · 기록 ${collection.recordCount}개`}
                  className="group flex min-w-0 items-stretch gap-2 rounded-[3px] border border-[#e4ded3] bg-white/70 py-2 pl-1.5 pr-2 text-left transition-colors hover:border-[#c7bda9] hover:bg-white focus:outline-none focus-visible:border-[#4f9b78] focus-visible:bg-white"
                  // 종이 위에 놓인 책이므로 한 권씩 조금씩 다르게 눕는다. 순서로 고르는 순수 값이라
                  // 리렌더돼도 흔들리지 않는다.
                  style={{ transform: `rotate(${indexInPage % 2 === 0 ? -0.5 : 0.6}deg)` }}
                >
                  {/* 책등. 색은 공용 규약(shelfSpine)이라 다른 화면의 같은 책과 색이 일치한다. */}
                  <span
                    aria-hidden="true"
                    className="w-[7px] flex-none rounded-[2px]"
                    style={{ backgroundColor: spineColor }}
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[13px] font-bold text-[#2c2a28]">
                      {collection.title}
                    </span>
                    <span className="text-[11px] text-[#a29d95]">
                      기록 {collection.recordCount}개
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* 쪽 넘김. 세로로 자라는 대신 여기서 받는다 — 선반이 화면 밖으로 자라지 않게 하는 장치다. */}
          {(canGoNext || canGoPrevious) && (
            <div className="flex flex-none items-center justify-center gap-3 text-[12px] text-[#a29d95]">
              <button
                type="button"
                onClick={() => setPageIndex(pageIndex - 1)}
                disabled={!canGoPrevious}
                aria-label="이전 책장"
                className="grid h-7 w-7 place-items-center rounded-full text-[15px] text-[#8a857e] transition-colors hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f9b78] disabled:opacity-30"
              >
                ‹
              </button>
              <span>
                {pageIndex + 1} / {pageCount}
                {hasNext ? '+' : ''}
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={!canGoNext || shelfExploreQuery.isFetchingNextPage}
                aria-label="다음 책장"
                className="grid h-7 w-7 place-items-center rounded-full text-[15px] text-[#8a857e] transition-colors hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4f9b78] disabled:opacity-30"
              >
                ›
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
