import type { CollectionCoverProps } from '../../lib/collectionCoverVariant';
import {
  CoverArtwork,
  CoverFooter,
  CoverLabel,
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
      {/* 331: 카테고리 줄이 붙으면 텍스트가 한 줄(라벨 0.46em×1.6 + 위 여백 ≈ 1.2em) 늘어난다.
          위 주석대로 이 판형의 세로 여유는 10px 남짓이라, 그 줄이 들어가는 경우에만 도판을 4%
          낮춰 여유를 되돌린다 — 카테고리가 없는 표지는 지금까지와 똑같은 비율로 남는다.
          ⚠️ 두 값 모두 완전한 리터럴이어야 한다(Tailwind는 조립된 클래스 문자열을 못 읽는다). */}
      <CoverArtwork
        imageUrl={imageUrl}
        accentColor={accentColor}
        className={`w-full shrink-0 ${slots.category ? 'h-[50%]' : 'h-[54%]'}`}
      />

      <CoverRule className="mt-[0.6em]" />
      {/* 331: 이 판형만 keywords[0]을 아예 그리지 않아, 5권 중 1권꼴로 표지에 Keyword가 없었다
          (부제=keywords[1]만 있어서 키워드가 하나뿐인 컬렉션은 아무것도 안 나왔다). 시안 1b는
          총서 판형이라 괘선 아래 총서명 자리가 있고, 그 자리가 그대로 카테고리 자리다. */}
      {slots.category && <CoverLabel className="mt-[0.45em]">{slots.category}</CoverLabel>}
      <CoverTitle lines={2} className="mt-[0.45em]">
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
