import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { markCollectionOverlayIntent } from '@/features/collections/lib/collectionOverlayIntent';
import { handleShelfScrollFetchNext } from '@/shared/lib/handleShelfScrollFetchNext';
import {
  chunkIntoShelfRows,
  getSpineHeight,
  getSpineWidth,
  SHELF_SCROLL_SIDE_PADDING_PX,
  SHELF_SCROLL_TOP_PADDING_PX,
  SHELF_VISIBLE_ROW_COUNT,
} from '@/shared/lib/shelfSpine';
import type { CollectionSummary } from '@/features/collections/api/getMyCollections';
import {
  ShelfAddSlot,
  ShelfBookSpine,
  ShelfCabinet,
  ShelfLabel,
  ShelfTier,
} from '@/shared/ui/Shelf';
import { useMyCollectionsQuery } from '../hooks/useMyCollectionsQuery';
import { NewCollectionModal } from './NewCollectionModal';

// 287-16: 행별 권수(getRowCapacity) seed의 열 구분용 salt — FollowedShelfCard.tsx의
// FOLLOWED_SHELF_SEED_SALT_BASE와 절대 겹치지 않는 범위를 쓴다.
const MY_SHELF_SEED_SALT = 900_000;

// 250: 2행(ShelfTier 2개) 높이만큼만 스크롤 없이 보여주고, 그 이상은 세로 스크롤로 넘긴다 — 사용자가
// "스크롤 유지"를 택했다(2·3열의 이전/다음 페이지네이션과는 별개로 1열만 이 방식을 쓴다).
// 287-8: 고정 height(SHELF_VISIBLE_HEIGHT_PX) 대신 flex-1 min-h-0으로 바꿨다 — 부모(ShelfColumn→
// ShelfColumnGrid h-full→ShelfCabinet flex-1→LibraryPage flex-1 래퍼)가 내어주는 세로 공간을 그대로
// 채운다. min-h-[360px]/max-h-[590px](shelfCabinetLayout.ts SHELF_SCROLL_MIN_H_PX/MAX_H_PX와 반드시
// 일치해야 한다 — Tailwind는 JS 상수를 클래스에 주입할 수 없어 리터럴로 중복 유지한다)로 너무
// 작아지거나 커지지 않게 막는다. 2·3열(FollowedShelfCollections)도 같은 값을 쓴다.

// 251: ShelfAddSlot은 recordCount가 없어 자체 높이를 계산할 수 없다 — 같은 행에 스파인이 있으면 그
// 행의 평균 높이를 쓰고(형제와 줄을 맞추기 위해), 행이 비어 있으면(꽉 찬 마지막 행 뒤에 새 행으로
// 붙는 경우) getSpineHeight(0, 0)인 바닥값(SPINE_MIN_HEIGHT)을 "아직 기록이 없는 컬렉션"의 기본값으로
// 쓴다(287-14: getSpineHeight가 collectionId 기반 지터도 받게 돼, 실제 정체성이 없는 이 슬롯은 0을
// 고정 시드로 넘긴다 — 지터 폭이 ±3px로 작아 시각적으로 문제되지 않는다).
function averageSpineHeight(row: CollectionSummary[]): number {
  if (row.length === 0) {
    return getSpineHeight(0, 0);
  }
  const total = row.reduce(
    (sum, collection) => sum + getSpineHeight(collection.recordCount, collection.collectionId),
    0,
  );
  return Math.round(total / row.length);
}

/**
 * 내 컬렉션 목록을 책장 칸(레이블+행×선반 반복+스크롤 시 자동 다음 페이지) 하나로 렌더링한다. 근거:
 * Jira S15P11A705-141/169/250.
 * 바깥 ShelfCabinet은 쓰는 쪽이 감싼다 — MyShelfList(아래, /shelf 전용 화면)는 캐비닛 하나를 통째로
 * 감싸고, LibraryPage(250)는 "나의 책장·팔로우한 책장" 3열 캐비닛의 1열로 그대로 끼워 넣는다. 선반은
 * 더 이상 바깥에서 한 번만 두지 않는다 — ShelfTier가 행마다 선반을 반복해서 깐다.
 */
export function MyShelfColumn() {
  const navigate = useNavigate();
  const myCollectionsQuery = useMyCollectionsQuery();
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] = useState(false);

  if (myCollectionsQuery.isPending) {
    return <p className="text-sm text-white/50">불러오는 중…</p>;
  }

  if (myCollectionsQuery.isError) {
    return <p className="text-sm text-red-400">컬렉션을 불러오지 못했어요.</p>;
  }

  const pages = myCollectionsQuery.data.pages;
  const collections = pages.flatMap((page) => page.items);
  const hasNext = pages[pages.length - 1].hasNext;

  // 287-14/287-16: 행별 권수(getRowCapacity)가 이 "책장 하나"에 안정적으로 묶이도록, 첫 컬렉션의
  // id를 seed로 쓴다 — 같은 사용자는 새로고침해도 항상 같은 행 구성을 본다. 컬렉션이 없으면(첫 id가
  // 없으면) 고정값 0으로 대체한다(빈 책장이라 행 자체가 없어 어차피 쓰이지 않는다).
  // MY_SHELF_SEED_SALT를 더해 2·3열(FollowedShelfCard, 다른 salt를 쓴다)과 seed 공간이 절대 겹치지
  // 않게 한다 — collectionId와 followId가 우연히 같은 숫자여도 1열은 항상 다른 행 구성을 보인다.
  const seedId = MY_SHELF_SEED_SALT + (collections[0]?.collectionId ?? 0);
  const collectionRows = chunkIntoShelfRows(collections, seedId);
  const lastRow = collectionRows[collectionRows.length - 1];
  // 새 컬렉션 추가 슬롯은 마지막 행에 자리가 있으면 그 행에 이어 붙이고, 꽉 찼으면 새 행을 만든다.
  const addSlotFitsLastRow = lastRow !== undefined && lastRow.items.length < lastRow.capacity;
  // 287-6: 컬렉션이 적으면(1~2행) 아래쪽 행의 선반 보드 자체가 렌더링되지 않았다 — 컬렉션 개수와
  // 무관하게 항상 SHELF_VISIBLE_ROW_COUNT(3)개의 ShelfTier(빈 행이면 책 없이 선반만)를 채운다.
  const renderedTierCount = collectionRows.length + (addSlotFitsLastRow ? 0 : 1);
  const emptyTierCount = Math.max(0, SHELF_VISIBLE_ROW_COUNT - renderedTierCount);

  return (
    <>
      <ShelfLabel>내 컬렉션</ShelfLabel>

      {collections.length === 0 && (
        <p className="text-xs text-white/50">아직 만든 컬렉션이 없어요.</p>
      )}

      {/* 287-8: flex-1 min-h-0 + min-h-[360px]/max-h-[590px]로 부모가 내어주는 세로 공간을 그대로
          채운다(적으면 아래쪽 여백, 많으면 overflow-y-auto로 스크롤).
          287-2: paddingTop(SHELF_SCROLL_TOP_PADDING_PX)은 맨 윗줄 책 호버 시 translateY(-10px)가
          overflow-y-auto의 clip 경계에 잘리지 않게 하는 여유다(박스 바깥 margin/gap은 이 clip
          경계 자체를 바꾸지 못해 소용없다).
          287-3/287-14: overflow-y가 auto면 overflow-x도 브라우저가 auto로 취급해(CSS Overflow 스펙)
          회전한 책등이 좌우로도 clip 대상이 된다 — paddingLeft/Right(SHELF_SCROLL_SIDE_PADDING_PX)로
          기울기(getSpineTilt) 최대 protrusion만큼 여유를 준다.
          287-18: "더보기" 버튼 대신 onScroll로 바닥 근처에 닿으면 다음 페이지를 자동으로 불러온다 —
          스크롤(이미 불러온 항목 보기)과 더 불러오기가 별개 UI(스크롤바 vs 버튼)로 나뉘어 있던 걸
          스크롤 하나로 합쳤다. */}
      <div
        style={{
          paddingTop: SHELF_SCROLL_TOP_PADDING_PX,
          paddingLeft: SHELF_SCROLL_SIDE_PADDING_PX,
          paddingRight: SHELF_SCROLL_SIDE_PADDING_PX,
        }}
        onScroll={(event) =>
          handleShelfScrollFetchNext(event, {
            hasNext,
            isFetchingNextPage: myCollectionsQuery.isFetchingNextPage,
            fetchNextPage: () => void myCollectionsQuery.fetchNextPage(),
          })
        }
        className="flex min-h-[360px] max-h-[590px] flex-1 flex-col gap-1.5 overflow-y-auto"
      >
        {collectionRows.map((row, rowIndex) => (
          <ShelfTier key={rowIndex}>
            {row.items.map((collection, indexInRow) => (
              <ShelfBookSpine
                key={collection.collectionId}
                index={row.startIndex + indexInRow}
                collectionId={collection.collectionId}
                title={collection.title}
                recordCount={collection.recordCount}
                onClick={() => {
                  markCollectionOverlayIntent();
                  void navigate({
                    to: '/collections/$collectionId',
                    params: { collectionId: collection.collectionId },
                    state: { collectionOverlay: true },
                  });
                }}
              />
            ))}
            {rowIndex === collectionRows.length - 1 && addSlotFitsLastRow && (
              <ShelfAddSlot
                onClick={() => setIsNewCollectionModalOpen(true)}
                width={getSpineWidth(row.startIndex + row.items.length)}
                height={averageSpineHeight(row.items)}
              />
            )}
          </ShelfTier>
        ))}

        {!addSlotFitsLastRow && (
          <ShelfTier>
            <ShelfAddSlot
              onClick={() => setIsNewCollectionModalOpen(true)}
              width={getSpineWidth(0)}
              height={averageSpineHeight([])}
            />
          </ShelfTier>
        )}

        {/* 287-6: 실제 콘텐츠(컬렉션 행 + 추가 슬롯 행)가 SHELF_VISIBLE_ROW_COUNT보다 적을 때, 남는
            만큼 책 없는 빈 ShelfTier를 채운다 — 선반 보드(ShelfBoard)는 ShelfTier가 항상 그리므로
            빈 행도 고정된 위치에 보드가 노출된다. */}
        {Array.from({ length: emptyTierCount }, (_, emptyIndex) => (
          <ShelfTier key={`empty-${emptyIndex}`}>{null}</ShelfTier>
        ))}

        {myCollectionsQuery.isFetchingNextPage && (
          <p className="flex-none py-1 text-center text-xs text-white/50">불러오는 중…</p>
        )}
      </div>

      <NewCollectionModal
        isOpen={isNewCollectionModalOpen}
        onClose={() => setIsNewCollectionModalOpen(false)}
      />
    </>
  );
}

/**
 * 내 책장(Shelf) 단독 화면(/shelf, 149/150과 동일하게 본인 관리 화면)에서 쓰는 캐비닛 한 채짜리 버전.
 * 근거: Jira S15P11A705-141/169. LibraryPage(144/250)는 이 컴포넌트가 아니라 위 MyShelfColumn을
 * 3열 캐비닛의 1열로 직접 쓴다 — 캐비닛 테두리를 페이지 레벨에서 공유하기 때문이다.
 */
export function MyShelfList() {
  return (
    <ShelfCabinet headerTitle="내 책장">
      <MyShelfColumn />
    </ShelfCabinet>
  );
}
