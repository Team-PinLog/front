import type { CollectionCoverProps } from '../../lib/collectionCoverVariant';
import {
  CoverArtwork,
  CoverFooter,
  CoverLabel,
  CoverPaper,
  CoverRule,
  CoverTitle,
} from './coverParts';

/**
 * 316 판형 4 — 세로짜기(시안 1e "세로짜기 · 도판 기둥").
 *
 * 좌측 좁은 단에 세로쓰기 표제, 우측에 세로로 긴 도판 기둥. 좌측 단은 위에서부터 `카테고리(세로) →
 * 표제(세로) → 짧은 괘선 + 푸터` 순으로 space-between 배치다.
 *
 * 도판을 카드 가장자리까지 붙이지 않고 여백을 준다 — 시안이 도판에 34px 여백을 둬 "지면 위에 인쇄된
 * 기둥"으로 보이게 한 부분이다. 여백을 없애면 그냥 반쪽 사진 카드가 된다.
 *
 * Tailwind v3에는 writing-mode 유틸리티가 없어(v4에서 추가) CoverTitle이 인라인 style로 준다.
 */
export function VerticalTitleCover({
  slots,
  recordCount,
  createdAt,
  accentColor,
  imageUrl,
  isCompact,
}: CollectionCoverProps) {
  return (
    <CoverPaper className="flex">
      <div className="flex w-[36%] shrink-0 flex-col items-start justify-between py-[0.7em] pl-[0.6em] pr-[0.3em]">
        {slots.category ? (
          <CoverLabel vertical className="max-h-[28%] shrink-0">
            {slots.category}
          </CoverLabel>
        ) : (
          // 카테고리가 없어도 표제가 맨 위로 올라오지 않게 자리만 남긴다 — 세로짜기는 표제가 위에
          // 딱 붙으면 판형이 무너져 보인다(시안도 표제가 단 중앙에 온다).
          <div aria-hidden="true" className="h-[8%] shrink-0" />
        )}

        <CoverTitle vertical size="sm" className="min-h-0">
          {slots.title}
        </CoverTitle>

        <div className="flex shrink-0 flex-col items-start gap-[0.35em]">
          <CoverRule width="short" className="w-[1.6em]" />
          <CoverFooter
            recordCount={recordCount}
            createdAt={createdAt}
            isCompact={isCompact}
            layout="stack"
          />
        </div>
      </div>

      <CoverArtwork
        imageUrl={imageUrl}
        accentColor={accentColor}
        className="my-[0.7em] mr-[0.7em] flex-1"
      />
    </CoverPaper>
  );
}
