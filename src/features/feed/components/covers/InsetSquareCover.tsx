import type { CollectionCoverProps } from '../../lib/collectionCoverVariant';
import {
  CoverArtwork,
  CoverFooter,
  CoverPaper,
  CoverRule,
  CoverSubtitle,
  CoverTitle,
} from './coverParts';

/**
 * 316 판형 2 — 상단 도판 인셋(시안 1b "시리즈 틀 · 상단 도판").
 *
 * 크림 지면 위 상단에 도판을 앉히고, 그 아래를 전폭 괘선으로 끊은 뒤 표제·부제를 놓는다.
 * 푸터는 맨 아래로 밀어 붙인다(mt-auto) — 시안의 총서 판형처럼 판권 줄이 바닥에 정렬돼야 여러 권이
 * 나란히 놓였을 때 줄이 맞는다.
 *
 * 도판 높이(54%)는 시안 비율(64%)보다 낮다 — 시안 판형은 1:1.48이고 우리 카드는 1:1.33이라 세로가
 * 그만큼 짧다. 실제로 계산해보면 카드 186×248에서 텍스트가 96px을 쓰므로(괘선·표제 2줄·부제·푸터
 * + 여백) 도판에 줄 수 있는 몫은 최대 134px = 58%이고, 그건 여유가 1px도 없는 값이다. 54%로 두면
 * 10px이 남아 브라우저 반올림에도 푸터가 밀리지 않는다.
 */
export function InsetSquareCover({
  slots,
  recordCount,
  createdAt,
  accentColor,
  imageUrl,
  isCompact,
}: CollectionCoverProps) {
  return (
    <CoverPaper className="flex flex-col px-[0.55em] pb-[0.6em] pt-[0.55em]">
      <CoverArtwork
        imageUrl={imageUrl}
        accentColor={accentColor}
        className="h-[54%] w-full shrink-0"
      />

      <CoverRule className="mt-[0.6em]" />
      <CoverTitle lines={2} className="mt-[0.5em]">
        {slots.title}
      </CoverTitle>
      {slots.subtitle && <CoverSubtitle className="mt-[0.25em]">{slots.subtitle}</CoverSubtitle>}

      <CoverFooter
        recordCount={recordCount}
        createdAt={createdAt}
        isCompact={isCompact}
        className="mt-auto pt-[0.4em]"
      />
    </CoverPaper>
  );
}
