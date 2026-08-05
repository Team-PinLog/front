import type { CollectionCoverProps } from '../../lib/collectionCoverVariant';
import {
  CoverArtwork,
  CoverFooter,
  CoverFrame,
  CoverLabelBetweenRules,
  CoverPaper,
  CoverTitle,
} from './coverParts';

/**
 * 316 판형 5 — 아치 창(시안 1f "아치 창 · 대칭 조판").
 *
 * 크림 지면 위에 아치로 크롭한 도판을 앉히고, 아래로 표제 → `선-카테고리-선` → 푸터를 전부 중앙
 * 정렬한다. 5종 중 유일하게 **가는 웨이트에 자간을 크게 벌린** 표제다(시안 1f가 고딕 A1 Light를 쓴
 * 그 자리) — 굵은 표제 4종 사이에 하나 섞이면 서가에서 확실히 다른 책으로 읽힌다.
 *
 * 아치는 rounded-t-full(위 두 모서리 반경 50%)로 만든다. 시안은 폭 304px에 반경 152px, 즉 정확히
 * 폭의 절반이라 반원이다 — 도판이 세로로 길어 결과는 반원이 아니라 타원 아치가 되고, 그게 시안의
 * 창 모양이다.
 */
export function ArchCover({
  slots,
  recordCount,
  createdAt,
  accentColor,
  imageUrl,
  isCompact,
}: CollectionCoverProps) {
  return (
    <CoverPaper className="flex flex-col items-center px-[0.9em] pb-[0.7em] pt-[0.95em]">
      <CoverFrame tone="soft" />

      <CoverArtwork
        imageUrl={imageUrl}
        accentColor={accentColor}
        className="h-[47%] w-[68%] shrink-0 rounded-t-full"
      />

      <CoverTitle
        size="sm"
        weight="light"
        align="center"
        tracking="wide"
        lines={2}
        className="mt-[0.7em]"
      >
        {slots.title}
      </CoverTitle>

      {slots.category && (
        <div className="mt-[0.5em] w-full">
          <CoverLabelBetweenRules>{slots.category}</CoverLabelBetweenRules>
        </div>
      )}

      <CoverFooter
        recordCount={recordCount}
        createdAt={createdAt}
        isCompact={isCompact}
        layout="center"
        className="mt-auto w-full pt-[0.4em]"
      />
    </CoverPaper>
  );
}
