import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { markCollectionOverlayIntent } from '@/features/collections/lib/collectionOverlayIntent';
import {
  chunkIntoShelfRows,
  getSpineHeight,
  getSpineWidth,
  SHELF_ROW_SIZE,
  SHELF_SCROLL_SIDE_PADDING_PX,
  SHELF_SCROLL_TOP_PADDING_PX,
  SHELF_VISIBLE_HEIGHT_PX,
  SHELF_VISIBLE_ROW_COUNT,
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
// 287: 높이 값 자체는 SHELF_VISIBLE_HEIGHT_PX(shelfSpine.ts)로 옮겼다 — 2·3열
// (FollowedShelfCollections)도 같은 값으로 캡을 둬야 캐비닛 전체 높이가 책 개수와 무관하게 고정된다.

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

      {/* 287-3: maxHeight는 "콘텐츠가 이 값을 넘을 때만 스크롤 발동"하는 상한일 뿐이라, 컬렉션이
          적으면 박스 자체가 작아져 588을 올려도 화면에 반영되지 않았다 — Feed가 카드 수와 무관하게
          항상 5×2 고정 그리드인 것과 같은 원칙으로, height를 고정해 몇 권이든 캐비닛 크기가 그대로
          유지되게 한다(적으면 아래쪽 여백, 많으면 overflow-y-auto로 스크롤).
          287-2: paddingTop(SHELF_SCROLL_TOP_PADDING_PX)은 맨 윗줄 책 호버 시 translateY(-10px)가
          overflow-y-auto의 clip 경계에 잘리지 않게 하는 여유다(박스 바깥 margin/gap은 이 clip
          경계 자체를 바꾸지 못해 소용없다).
          287-3: overflow-y가 auto면 overflow-x도 브라우저가 auto로 취급해(CSS Overflow 스펙) 회전한
          책등이 좌우로도 clip 대상이 된다 — paddingLeft/Right(SHELF_SCROLL_SIDE_PADDING_PX)로
          기울기(getSpineTilt) 최대 protrusion만큼 여유를 준다.
          287-5: 타이어 사이 gap을 gap-1.5(6px)로 다시 조정했다 — shelfSpine.ts
          SHELF_VISIBLE_HEIGHT_PX가 Feed의 실제 캐비닛 높이(SHELF_CABINET_TOTAL_HEIGHT_PX)에서 역산한
          값이라, 이 gap도 그 계산식의 전제와 반드시 일치해야 한다. */}
      <div
        style={{
          height: SHELF_VISIBLE_HEIGHT_PX,
          paddingTop: SHELF_SCROLL_TOP_PADDING_PX,
          paddingLeft: SHELF_SCROLL_SIDE_PADDING_PX,
          paddingRight: SHELF_SCROLL_SIDE_PADDING_PX,
        }}
        className="flex flex-col gap-1.5 overflow-y-auto"
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

        {/* 287-6: 실제 콘텐츠(컬렉션 행 + 추가 슬롯 행)가 SHELF_VISIBLE_ROW_COUNT보다 적을 때, 남는
            만큼 책 없는 빈 ShelfTier를 채운다 — 선반 보드(ShelfBoard)는 ShelfTier가 항상 그리므로
            빈 행도 고정된 위치에 보드가 노출된다. */}
        {Array.from({ length: emptyTierCount }, (_, emptyIndex) => (
          <ShelfTier key={`empty-${emptyIndex}`}>{null}</ShelfTier>
        ))}
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
