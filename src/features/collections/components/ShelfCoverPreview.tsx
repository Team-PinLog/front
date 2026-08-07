import { createPortal } from 'react-dom';
import { CollectionCover } from '@/features/feed/components/covers/CollectionCover';
import { getCollectionAccentColor } from '@/shared/lib/getCollectionAccentColor';
import {
  getShelfCoverPreviewPosition,
  PREVIEW_HEIGHT_PX,
  PREVIEW_WIDTH_PX,
} from '../lib/shelfCoverPreviewPosition';
import type { CollectionSummary } from '../api/getMyCollections';
import type { ShelfCoverPreviewAnchor } from '../hooks/useShelfCoverPreview';

/**
 * 362: 책장에서 호버·포커스한 책등 옆에 뜨는 표지 팝오버(티켓의 A안).
 *
 * B안(책이 튀어나오며 표지로 회전)을 택하지 않은 이유: 책등은 이미 기울기(getSpineTilt)와 이웃
 * 겹침 방지 여백(getSpineNeighborClearancePx)이 서로 맞물려 있어서, 그 자리에서 폭을 표지 크기로
 * 키우면 그 계산이 통째로 무너진다 — 이웃 책을 밀거나 겹치고, 행 높이(SPINE_MAX_HEIGHT 기준)도
 * 넘긴다. A안은 책장 레이아웃을 한 픽셀도 건드리지 않는다.
 *
 * **표지는 새로 만들지 않는다.** Feed 탐색 화면의 판형 디스패처(CollectionCover)를 그대로 쓴다 —
 * 같은 컬렉션이면 Feed에서 보던 그 표지가 여기서도 나온다(판형은 collectionId로 결정론 배정).
 * 카드 껍데기(CollectionBookCard)가 아니라 디스패처를 쓰는 이유는, 그쪽이 Feed 응답 타입
 * (FeedCollectionItem)을 받기 때문이다. 여기서 쓰려면 Feed에만 있는 필드(position)를 지어내야
 * 하는데, Feed의 position은 응답 값을 그대로 써야 하는 값이라(AGENTS.md) 가짜 값을 만들어 넣는
 * 모양 자체를 두지 않는다.
 */

// 표지 안 글자 크기는 카드 폭에 비례한다(CollectionBookCard와 같은 계수 0.08 — 표지 내부가 전부
// em이라 루트 font-size 하나로 조판 전체가 정해진다). 폭이 고정이라 여기서는 상수로 접어 둔다.
const PREVIEW_FONT_SIZE_PX = PREVIEW_WIDTH_PX * 0.08;

export function ShelfCoverPreview({
  collection,
  anchor,
}: {
  collection: CollectionSummary;
  anchor: ShelfCoverPreviewAnchor;
}) {
  if (typeof document === 'undefined') {
    return null;
  }

  // 표지 바탕색. 331(탐색 표지 Keyword 노출·표지 색 추출)이 머지되면 Feed 카드 쪽은 표지 이미지에서
  // 뽑은 색을 쓰게 되는데(useCollectionAccentColor), 그 훅은 아직 dev에 없다 — 여기서는 dev에 있는
  // 해시 색을 쓴다. 331 머지 후 같은 훅으로 맞추면 Feed와 이 팝오버의 바탕색이 다시 일치한다.
  const accentColor = getCollectionAccentColor(collection.collectionId);
  const { left, top } = getShelfCoverPreviewPosition(anchor, window.innerWidth, window.innerHeight);

  return createPortal(
    // body로 내보내는 이유: 캐비닛(overflow-hidden)과 책 스크롤 박스(overflow-y-auto는 가로도
    // 클리핑한다) 안에 두면 표지가 그 경계에서 잘린다.
    // aria-hidden + pointer-events-none: 이 표지는 책등이 이미 갖고 있는 제목을 그림으로 한 번 더
    // 보여주는 장식이다. 스크린 리더에 같은 내용을 두 번 읽히지 않고, 마우스 이벤트도 가로채지
    // 않아야 한다(가로채면 책등에서 pointerleave가 떠 표지가 깜빡인다).
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        left,
        top,
        width: PREVIEW_WIDTH_PX,
        height: PREVIEW_HEIGHT_PX,
        backgroundColor: accentColor,
      }}
      className="pointer-events-none z-50 overflow-hidden rounded-l-[3px] rounded-r-lg shadow-[0_14px_30px_rgba(4,33,66,.26)] ring-1 ring-inset ring-line-card"
    >
      <div style={{ fontSize: PREVIEW_FONT_SIZE_PX }} className="h-full">
        <CollectionCover
          collectionId={collection.collectionId}
          title={collection.title}
          // 내 Collection 목록 응답(7.2)에는 keywords가 없다 — Feed 응답에만 있는 필드다. 빈 배열은
          // AI 미완료와 같은 정상 상태라 표지가 카테고리·부제 슬롯을 비우고 그대로 성립한다.
          keywords={[]}
          recordCount={collection.recordCount}
          createdAt={collection.createdAt}
          accentColor={accentColor}
          // 표지를 아직 만들지 않은 컬렉션은 null이다 — 오류가 아니라 정상 상태이고, 공통 파츠가
          // accent 그라디언트 폴백으로 흡수한다(티켓 확인 항목 5).
          imageUrl={collection.coverImageUrl ?? null}
          isCompact={false}
        />
      </div>

      {/* 책등: Feed 카드와 같은 좌측 가장자리 그림자. 팝오버지만 "책 한 권"으로 보여야 한다. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[4%] min-w-[2px] bg-gradient-to-r from-pin-navy/[0.14] to-transparent" />
    </div>,
    document.body,
  );
}
