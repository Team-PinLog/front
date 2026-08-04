import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { markCollectionOverlayIntent } from '@/features/collections/lib/collectionOverlayIntent';
import { handleShelfScrollFetchNext } from '@/shared/lib/handleShelfScrollFetchNext';
import {
  chunkIntoShelfRows,
  getEmptyTierPadding,
  SHELF_SCROLL_SIDE_PADDING_PX,
  SHELF_SCROLL_TOP_PADDING_PX,
} from '@/shared/lib/shelfSpine';
import { ShelfBookSpine, ShelfIconButton, ShelfTier } from '@/shared/ui/Shelf';
import { useFollowShelfCollectionsQuery } from '../hooks/useFollowShelfCollectionsQuery';
import { useUpdateFollowAliasMutation } from '../hooks/useUpdateFollowAliasMutation';
import { useUnfollowMutation } from '../hooks/useUnfollowMutation';

const ALIAS_MAX_LENGTH = 20;

// 287-16: 행별 권수(getRowCapacity) seed의 열 구분용 salt — MyShelfList.tsx의 MY_SHELF_SEED_SALT와
// 절대 겹치지 않는 범위를 쓴다. columnSlot(2열=0, 3열=1)마다 다른 구간을 배정해, 팔로우한 책장을
// 다음 페이지로 넘겨 다른 followId가 같은 열에 들어와도, 그리고 2열과 3열끼리도 seed 공간이 겹치지
// 않게 한다(followId 자체가 달라 이미 대부분 다른 값이 나오지만, 열 구분을 명시적으로 보장한다).
const FOLLOWED_SHELF_SEED_SALT_BASE = 100_000;
const FOLLOWED_SHELF_SEED_SALT_PER_SLOT = 400_000;

interface FollowedShelfCardProps {
  followId: number;
  alias: string | null;
  columnSlot: number;
}

/**
 * 팔로우한 책장 하나를, 목업의 책장(cabinet-shell) 캐비닛 "한 칸"으로 렌더링한다 — 캐비닛 테두리는 이제
 * LibraryPage(250)가 "나의 책장·팔로우한 책장" 3열 캐비닛 레벨에서 공유하므로 여기서는 그리지 않는다.
 * 선반(ShelfBoard)도 캐비닛 레벨에서 한 번만 두지 않고, 컬렉션을 행 단위(권수는 행마다 다름 —
 * 287-14)로 끊어 ShelfTier로 감싸 행마다 반복해서 깐다.
 * 근거: Jira S15P11A705-144/169/250, docs/reference/08_API_명세.md 9.3/8.3/8.4.
 * 이 카드가 쓰는 Collection 목록 커서는 이 followId 전용이다(useFollowShelfCollectionsQuery) — 다른
 * 카드나 팔로우 목록(useFollowsQuery) 커서와 절대 혼용하지 않는다.
 * Library 컨텍스트의 언팔로우이므로 useUnfollowMutation에 sourceCollectionId를 넘기지 않는다.
 * 헤더 연필 아이콘은 목업의 shelf-edit-button/shelf-column-menu를 옮긴 것으로, 기존 별칭 수정·언팔로우
 * 로직을 여는 진입점 역할만 한다 — 두 mutation 자체는 그대로다.
 */
export function FollowedShelfCard({ followId, alias, columnSlot }: FollowedShelfCardProps) {
  const navigate = useNavigate();
  const collectionsQuery = useFollowShelfCollectionsQuery(followId);
  const updateAliasMutation = useUpdateFollowAliasMutation();
  const unfollowMutation = useUnfollowMutation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingAlias, setIsEditingAlias] = useState(false);
  const [aliasInput, setAliasInput] = useState(alias ?? '');

  const handleStartEdit = () => {
    setAliasInput(alias ?? '');
    setIsEditingAlias(true);
    setIsMenuOpen(false);
  };

  const handleCancelEdit = () => {
    setIsEditingAlias(false);
  };

  const handleSaveAlias = () => {
    const trimmed = aliasInput.trim();
    updateAliasMutation.mutate(
      { followId, alias: trimmed === '' ? null : trimmed },
      { onSuccess: () => setIsEditingAlias(false) },
    );
  };

  const handleUnfollow = () => {
    setIsMenuOpen(false);
    unfollowMutation.mutate({ followId });
  };

  return (
    <>
      {isEditingAlias ? (
        // 295(요구사항 D): 편집 모드로 전환해도 상단 여백이 널뛰지 않도록 아래 비편집 상태와 동일한
        // h-7을 준다(295 추가 수정 이슈 4: py-1.5에서 h-7로 바뀐 이유는 아래 비편집 분기 주석 참고).
        <div className="flex h-7 items-center gap-1.5">
          <label htmlFor={`follow-alias-${followId}`} className="sr-only">
            책장 별칭
          </label>
          <input
            id={`follow-alias-${followId}`}
            type="text"
            maxLength={ALIAS_MAX_LENGTH}
            value={aliasInput}
            onChange={(event) => setAliasInput(event.target.value)}
            disabled={updateAliasMutation.isPending}
            placeholder="별칭을 입력해 주세요"
            className="h-8 min-w-0 flex-1 rounded-lg border border-log-mint bg-white/10 px-2 text-xs text-white outline-none placeholder:text-white/40 disabled:opacity-40"
          />
          <button
            type="button"
            onClick={handleSaveAlias}
            disabled={updateAliasMutation.isPending}
            className="h-8 flex-none rounded-lg bg-log-mint px-2 text-xs font-bold text-pin-navy disabled:opacity-40"
          >
            {updateAliasMutation.isPending ? '저장 중…' : '저장'}
          </button>
          <button
            type="button"
            onClick={handleCancelEdit}
            disabled={updateAliasMutation.isPending}
            className="h-8 flex-none rounded-lg border border-white/20 px-2 text-xs font-bold text-white disabled:opacity-40"
          >
            취소
          </button>
        </div>
      ) : (
        // 295 추가 수정: 별칭이 없을 때 "이름 없는 책장" 폴백 텍스트는 물론, 그 자리를 대신하던 점선
        // 박스도 DOM에 아예 렌더링하지 않는다 — 완전히 빈 공간 + 수정 버튼만 남는다. justify-between
        // 대신 버튼 쪽에 ml-auto를 줘서, 왼쪽 형제(h3)가 있든 없든(alias 유무) 버튼이 항상 오른쪽
        // 끝에 고정되게 한다(justify-between은 형제가 1개뿐이면 flex-start로 붙어버려 alias 유무에
        // 따라 버튼 위치가 널뛴다).
        // 295 반응형 재설계(요구사항 D): 캐비닛 상단과 이 헤더 행 사이 gap이 1열("내 컬렉션" pill이
        // 있는 MyShelfColumn)보다 좁아 보여, 처음엔 ShelfLabel(pill)의 py-1.5(6px)를 그대로 복사해
        // 붙였다(변경 전 0 → py-1.5=6px).
        // 295 추가 수정(이슈 4): 그런데 그 py-1.5가 이 행의 "총 높이"를 ShelfIconButton(h-7=28px)
        // 기준 28px+12px(패딩)=40px로 늘려버렸고, ShelfLabel의 원래 높이(패딩+11px 텍스트, 약 27px)
        // 보다 커져 두 열의 헤더 높이가 달라졌다 — ShelfColumn(flex flex-col)에서 헤더 다음에 오는
        // flex-1 스크롤 박스가 그 차이만큼 서로 다른 남는 높이를 갖게 돼, 내용(tier 수)이 같아도
        // "최하단 선반~캐비닛 바닥" 여백이 달라 보였다(이번 이슈 4의 실제 원인). py-1.5 대신 h-7
        // (28px, ShelfIconButton과 정확히 같은 높이이자 ShelfLabel도 이번에 h-7로 맞췄다)로 바꿔
        // 두 열의 헤더 높이를 픽셀 단위로 동일하게 만든다.
        <div className="flex h-7 items-center gap-2">
          {alias && <h3 className="truncate text-sm font-bold text-white">{alias}</h3>}
          <div className="relative ml-auto flex-none">
            <ShelfIconButton label="책장 관리" onClick={() => setIsMenuOpen((open) => !open)}>
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
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </ShelfIconButton>

            {isMenuOpen && (
              <div className="absolute right-0 top-9 z-10 w-36 rounded-lg border border-line-card bg-white p-1.5 shadow-[0_14px_30px_rgba(0,0,0,.28)]">
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="h-9 w-full rounded-md px-2.5 text-left text-xs font-bold text-pin-navy hover:bg-log-mint/10"
                >
                  별칭 수정
                </button>
                <button
                  type="button"
                  onClick={handleUnfollow}
                  disabled={unfollowMutation.isPending}
                  className="h-9 w-full rounded-md px-2.5 text-left text-xs font-bold text-pin-navy hover:bg-log-mint/10 disabled:opacity-40"
                >
                  {unfollowMutation.isPending ? '처리 중…' : '팔로우 해제'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {updateAliasMutation.isError && (
        <p className="text-xs text-red-400">{updateAliasMutation.error.message}</p>
      )}
      {unfollowMutation.isError && (
        <p className="text-xs text-red-400">{unfollowMutation.error.message}</p>
      )}

      {collectionsQuery.isPending ? (
        <p className="text-sm text-white/50">불러오는 중…</p>
      ) : collectionsQuery.isError ? (
        <p className="text-sm text-red-400">책장을 불러오지 못했어요.</p>
      ) : (
        <FollowedShelfCollections
          followId={followId}
          columnSlot={columnSlot}
          collectionsQuery={collectionsQuery}
          onSelectCollection={(collectionId) => {
            markCollectionOverlayIntent();
            void navigate({
              to: '/collections/$collectionId',
              params: { collectionId },
              state: { collectionOverlay: true },
            });
          }}
        />
      )}
    </>
  );
}

interface FollowedShelfCollectionsProps {
  followId: number;
  columnSlot: number;
  collectionsQuery: ReturnType<typeof useFollowShelfCollectionsQuery>;
  onSelectCollection: (collectionId: number) => void;
}

function FollowedShelfCollections({
  followId,
  columnSlot,
  collectionsQuery,
  onSelectCollection,
}: FollowedShelfCollectionsProps) {
  const pages = collectionsQuery.data?.pages ?? [];
  const collections = pages.flatMap((page) => page.items);
  const hasNext = pages.length > 0 && pages[pages.length - 1].hasNext;

  // 287-14/287-16: seed로 followId를 쓴다 — 이 팔로우한 책장 하나를 안정적으로 식별하는 값이라,
  // 컬렉션 목록 순서가 바뀌어도 행별 권수(getRowCapacity) 패턴은 followId가 같은 한 그대로 유지된다.
  // columnSlot(2열=0, 3열=1)별로 다른 salt 구간을 더해, 다음 페이지에서 다른 followId가 들어와도(이미
  // followId 자체가 달라 대부분 다르지만) 그리고 2열·3열끼리도 seed 공간이 겹치지 않게 한다.
  const seedId =
    FOLLOWED_SHELF_SEED_SALT_BASE + columnSlot * FOLLOWED_SHELF_SEED_SALT_PER_SLOT + followId;
  const rows = chunkIntoShelfRows(collections, seedId);
  // 287-6: MyShelfColumn과 동일하게, 컬렉션이 적어 3행 미만이면 남는 행만큼 책 없는 빈 ShelfTier로
  // 채운다 — 선반 보드가 항상 고정 위치에 보이게 한다.
  // 295 추가 수정(이슈 4): collections.length===0일 때 예전엔 이 함수가 여기서 바로 <p>만 반환하고
  // 스크롤 박스·ShelfTier·ShelfBoard를 아예 그리지 않았다 — 팔로우한 책장이 0개인 열만 선반 보드
  // 자체가 안 보이는 원인이었다. MyShelfColumn(컬렉션 0개여도 추가 슬롯 tier + 빈 tier로 항상 3개
  // 선반을 그린다)과 똑같이, collections가 비어 있어도 rows=[]로 아래 스크롤 박스·ShelfTier 렌더링을
  // 그대로 통과시킨다 — getEmptyTierPadding(0)=3이라 빈 선반 3개가 그려진다. 안내 문구는 스크롤 박스
  // "위"의 별도 텍스트로만 남긴다(MyShelfColumn의 "아직 만든 컬렉션이 없어요."와 동일한 패턴).
  const emptyTierCount = getEmptyTierPadding(rows.length);

  return (
    <>
      {collections.length === 0 && (
        <p className="text-xs text-white/50">공개된 컬렉션이 없습니다</p>
      )}

      {/* 287-8: MyShelfColumn과 동일하게 flex-1 min-h-0 + min-h-[360px]/max-h-[590px]로 바꿨다 —
          팔로우한 책장의 책 수와 무관하게, 부모(ShelfColumn)가 내어주는 세로 공간을 그대로 채운다
          (shelfCabinetLayout.ts SHELF_SCROLL_MIN_H_PX/MAX_H_PX와 반드시 일치해야 한다). paddingTop/
          paddingLeft/paddingRight는 MyShelfColumn과 동일 이유(호버 리프트·기울기 clip 방지)로 맞춘다 —
          자세한 근거는 shelfSpine.ts의 SHELF_SCROLL_TOP_PADDING_PX·SHELF_SCROLL_SIDE_PADDING_PX 주석
          참고. 타이어 사이 gap도 MyShelfColumn과 동일하게 gap-1.5로 맞춘다.
          287-18: "더보기" 버튼 대신 onScroll로 바닥 근처에 닿으면 다음 페이지를 자동으로 불러온다 —
          MyShelfColumn과 동일한 handleShelfScrollFetchNext를 공유한다. */}
      <div
        style={{
          paddingTop: SHELF_SCROLL_TOP_PADDING_PX,
          paddingLeft: SHELF_SCROLL_SIDE_PADDING_PX,
          paddingRight: SHELF_SCROLL_SIDE_PADDING_PX,
        }}
        onScroll={(event) =>
          handleShelfScrollFetchNext(event, {
            hasNext,
            isFetchingNextPage: collectionsQuery.isFetchingNextPage,
            fetchNextPage: () => void collectionsQuery.fetchNextPage(),
          })
        }
        className="flex min-h-[360px] max-h-[590px] flex-1 flex-col gap-1.5 overflow-y-auto"
      >
        {rows.map((row, rowIndex) => (
          <ShelfTier key={rowIndex}>
            {row.items.map((collection, indexInRow) => (
              <ShelfBookSpine
                key={collection.collectionId}
                index={row.startIndex + indexInRow}
                collectionId={collection.collectionId}
                title={collection.title}
                recordCount={collection.recordCount}
                onClick={() => onSelectCollection(collection.collectionId)}
              />
            ))}
          </ShelfTier>
        ))}

        {Array.from({ length: emptyTierCount }, (_, emptyIndex) => (
          <ShelfTier key={`empty-${emptyIndex}`}>{null}</ShelfTier>
        ))}

        {collectionsQuery.isFetchingNextPage && (
          <p className="flex-none py-1 text-center text-xs text-white/50">불러오는 중…</p>
        )}
      </div>
    </>
  );
}
