import type { ReactElement } from 'react';
import {
  getCollectionCoverSlots,
  getCollectionCoverVariant,
  type CollectionCoverInput,
  type CollectionCoverProps,
  type CollectionCoverVariant,
} from '../../lib/collectionCoverVariant';
import { ArchCover } from './ArchCover';
import { BandCover } from './BandCover';
import { InsetSquareCover } from './InsetSquareCover';
import { RuledCover } from './RuledCover';
import { VerticalTitleCover } from './VerticalTitleCover';

/**
 * 316: 표지 판형 디스패처. collectionId로 판형을 결정론 배정하고(getCollectionCoverVariant)
 * keywords를 표시 슬롯으로 정리한 뒤(getCollectionCoverSlots) 해당 판형에 넘긴다.
 *
 * 판형 선택 로직이 여기 한 곳에만 있으므로, 카드(CollectionBookCard)는 "표지가 몇 종인지"도
 * "어떤 규칙으로 고르는지"도 알 필요가 없다 — 카드는 책의 껍데기(버튼·크기·글자 크기·책등)만 맡는다.
 */

// Record로 두면 판형을 추가할 때 여기 항목을 빠뜨리는 즉시 타입 오류가 난다(switch의 default로
// 조용히 흘러가지 않는다).
const COVER_BY_VARIANT: Record<
  CollectionCoverVariant,
  (props: CollectionCoverProps) => ReactElement
> = {
  band: BandCover,
  insetSquare: InsetSquareCover,
  ruled: RuledCover,
  verticalTitle: VerticalTitleCover,
  arch: ArchCover,
};

export function CollectionCover({
  collectionId,
  title,
  keywords,
  recordCount,
  createdAt,
  accentColor,
  imageUrl,
  isCompact,
}: CollectionCoverInput) {
  const Cover = COVER_BY_VARIANT[getCollectionCoverVariant(collectionId)];
  const slots = getCollectionCoverSlots(title, keywords, isCompact);

  return (
    <Cover
      slots={slots}
      recordCount={recordCount}
      createdAt={createdAt}
      accentColor={accentColor}
      imageUrl={imageUrl}
      isCompact={isCompact}
    />
  );
}
