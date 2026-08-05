import type { CollectionCoverProps } from '../../lib/collectionCoverVariant';
import {
  CoverArtwork,
  CoverFadeScrim,
  CoverFooter,
  CoverLabel,
  CoverRule,
  CoverTitle,
} from './coverParts';

/**
 * 316 판형 3 — 도판 위 백문자·괘선(시안 1d).
 *
 * 도판이 표지를 가득 채우고 그 위 상단에 `괘선 → 중앙정렬 표제 → 괘선 → 카테고리`가 얹힌다.
 *
 * 글자 뒤에 흰 박스를 깔면 안 된다 — 도판이 잘려 보인다. 시안처럼 **위에서 아래로 사라지는
 * 그라디언트**(CoverFadeScrim)를 덮어 지면이 도판으로 자연스럽게 넘어가게 한다. 그라디언트는
 * 표제 영역(상단 약 70%)까지만 관여하므로 하단 푸터는 도판 위에 그대로 놓인다 — 그 자리는 도판이
 * 가장 진한 곳이라, 푸터만 얇은 크림 판을 깔아 가독을 확보한다.
 */
export function RuledCover({
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
      <CoverFadeScrim className="h-[72%]" />

      <div className="absolute inset-x-[0.9em] top-[9%]">
        <CoverRule />
        <CoverTitle lines={2} align="center" className="my-[0.5em]">
          {slots.title}
        </CoverTitle>
        <CoverRule />
        {slots.category && (
          <CoverLabel tone="muted" className="mt-[0.5em] text-center">
            {slots.category}
          </CoverLabel>
        )}
      </div>

      <div className="absolute inset-x-[0.9em] bottom-[0.75em] rounded-[2px] bg-paper-white/[0.86] px-[0.5em] py-[0.15em]">
        <CoverFooter
          recordCount={recordCount}
          createdAt={createdAt}
          isCompact={isCompact}
          layout="center"
        />
      </div>
    </div>
  );
}
