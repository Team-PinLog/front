import type { CollectionCoverProps } from '../../lib/collectionCoverVariant';
import {
  CoverArtwork,
  CoverFooter,
  CoverFrame,
  CoverLabel,
  CoverRule,
  CoverTitle,
} from './coverParts';

/**
 * 316 판형 1 — 전면 도판 + 하단 띠(시안 1a "전면 도판 · 종이 명판").
 *
 * 도판이 표지를 가득 채우고, 금색 프레임 안쪽 하단에 크림색 명판이 얹힌다. 명판 안은 시안 순서
 * 그대로 `카테고리 → 표제 → 짧은 금색 괘선 → 좌/우 푸터`다. 이 짧은 괘선(시안의 56px 선)이 표제와
 * 판권을 갈라주는 이 판형의 핵심 장치라, 축약 모드에서도 남긴다.
 *
 * 명판 높이는 px이 아니라 내용(em)이 정한다 — 제목이 1줄이면 명판이 얕아지고 도판이 더 보인다.
 */
export function BandCover({
  slots,
  recordCount,
  createdAt,
  accentColor,
  imageUrl,
  isCompact,
}: CollectionCoverProps) {
  return (
    <div className="relative h-full">
      <CoverArtwork imageUrl={imageUrl} accentColor={accentColor} className="absolute inset-0" />
      <CoverFrame tone="gold" />

      {/* 명판 높이는 내용(em)이 정한다 — 여백을 시안(30/34/26px)보다 조금씩 조인 이유는, 3:4 카드가
          시안 판형(1:1.48)보다 세로가 짧아 같은 여백을 쓰면 명판이 표지의 45%까지 차지하기 때문이다.
          제목이 1줄인 컬렉션에서는 명판이 더 얕아져 도판이 그만큼 넓게 보인다. */}
      <div className="absolute inset-x-[0.45em] bottom-[0.45em] bg-paper-white px-[0.85em] pb-[0.65em] pt-[0.65em]">
        {slots.category && <CoverLabel className="mb-[0.3em]">{slots.category}</CoverLabel>}
        <CoverTitle lines={2}>{slots.title}</CoverTitle>
        <CoverRule width="short" className="my-[0.45em]" />
        <CoverFooter recordCount={recordCount} createdAt={createdAt} isCompact={isCompact} />
      </div>
    </div>
  );
}
