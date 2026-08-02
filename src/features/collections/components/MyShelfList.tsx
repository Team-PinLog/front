import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { markCollectionOverlayIntent } from '@/features/collections/lib/collectionOverlayIntent';
import {
  chunkIntoShelfRows,
  getSpineHeight,
  getSpineWidth,
  SHELF_ROW_SIZE,
} from '@/shared/lib/shelfSpine';
import type { CollectionSummary } from '@/features/collections/api/getMyCollections';
import {
  ShelfAddSlot,
  ShelfBookSpine,
  ShelfCabinet,
  ShelfLabel,
  ShelfMoreButton,
  ShelfTier,
} from '@/shared/ui/Shelf';
import { useMyCollectionsQuery } from '../hooks/useMyCollectionsQuery';
import { NewCollectionModal } from './NewCollectionModal';

// 250: 2행(ShelfTier 2개) 높이만큼만 스크롤 없이 보여주고, 그 이상은 세로 스크롤로 넘긴다 — 사용자가
// "스크롤 유지"를 택했다(2·3열의 이전/다음 페이지네이션과는 별개로 1열만 이 방식을 쓴다).
// 251: 스파인 최대 높이를 SPINE_MAX_HEIGHT 104→168로 되돌리면서 이 값도 같은 계산식으로 다시 뽑았다.
// 380px = ShelfTier 1개 높이(spine 최대 168px + gap-1.5 6px + board 10px = 184px) × 2
//         + 타이어 사이 gap-3 12px = 184*2 + 12 = 380.
// SPINE_MAX_HEIGHT(shelfSpine.ts)가 또 바뀌면 이 계산식을 그대로 다시 적용해서 갱신해야 한다.
const MY_SHELF_VISIBLE_HEIGHT_PX = 380;

// 251: ShelfAddSlot은 recordCount가 없어 자체 높이를 계산할 수 없다 — 같은 행에 스파인이 있으면 그
// 행의 평균 높이를 쓰고(형제와 줄을 맞추기 위해), 행이 비어 있으면(꽉 찬 마지막 행 뒤에 새 행으로
// 붙는 경우) getSpineHeight(0)인 바닥값(SPINE_MIN_HEIGHT)을 "아직 기록이 없는 컬렉션"의 기본값으로 쓴다.
function averageSpineHeight(row: CollectionSummary[]): number {
  if (row.length === 0) {
    return getSpineHeight(0);
  }
  const total = row.reduce((sum, collection) => sum + getSpineHeight(collection.recordCount), 0);
  return Math.round(total / row.length);
}

/**
 * 내 컬렉션 목록을 책장 칸(레이블+행×선반 반복+더보기) 하나로 렌더링한다. 근거: Jira S15P11A705-141/169/250.
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

  const collectionRows = chunkIntoShelfRows(collections);
  const lastRow = collectionRows[collectionRows.length - 1];
  // 새 컬렉션 추가 슬롯은 마지막 행에 자리가 있으면 그 행에 이어 붙이고, 꽉 찼으면 새 행을 만든다.
  const addSlotFitsLastRow = lastRow !== undefined && lastRow.length < SHELF_ROW_SIZE;

  return (
    <>
      <ShelfLabel>내 컬렉션</ShelfLabel>

      {collections.length === 0 && (
        <p className="text-xs text-white/50">아직 만든 컬렉션이 없어요.</p>
      )}

      <div
        style={{ maxHeight: MY_SHELF_VISIBLE_HEIGHT_PX }}
        className="flex flex-col gap-3 overflow-y-auto pr-1"
      >
        {collectionRows.map((row, rowIndex) => (
          <ShelfTier key={rowIndex}>
            {row.map((collection, indexInRow) => (
              <ShelfBookSpine
                key={collection.collectionId}
                index={rowIndex * SHELF_ROW_SIZE + indexInRow}
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
                width={getSpineWidth(rowIndex * SHELF_ROW_SIZE + row.length)}
                height={averageSpineHeight(row)}
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
      </div>

      {hasNext && (
        <ShelfMoreButton
          onClick={() => void myCollectionsQuery.fetchNextPage()}
          disabled={myCollectionsQuery.isFetchingNextPage}
        >
          {myCollectionsQuery.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
        </ShelfMoreButton>
      )}

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
