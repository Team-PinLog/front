import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { ContextStickyNoteCard } from '@/features/records/components/ContextStickyNoteCard';
import {
  COLLAGE_BOTTOM_SLACK_PX,
  placeOverlapStack,
  planOverlapContextCollage,
} from '@/features/records/components/contextNoteScatter';
import type { CollectionRecordItem } from './CollectionDetailView';

type ContextDetail = NonNullable<CollectionRecordItem['contexts']>[number];

/**
 * 418 보완(33) — 컬렉션 펼침면 소유자 배치의 **포개 붙인 맥락 무리**.
 *
 * ## 왜 그리드가 아니라 이 컴포넌트인가
 *
 * 이 화면의 계약은 "맥락은 몇 장이든 한 화면에 담긴다 + 글자를 자르거나 가리지 않는다"이다. 415가
 * 쓰던 2열 그리드는 밀도 사다리(글자·여백을 단계로 조이기)로 버티다가 **가장 조인 단계로도 넘치면
 * 스크롤**을 켰다. 그 예외가 없어졌으므로(418-33) 남는 수단은 겹침뿐이다.
 *
 * 종이를 포개 붙이면 필요한 세로 길이가 실제로 줄고, 덮이는 것은 **되돌릴 수 있다** — 잘라낸 글자는
 * 돌아오지 않지만 덮인 글자는 호버·포커스로 카드를 떠올리면 그대로 다시 읽힌다.
 *
 * ## 어떻게 스크롤이 0임이 보장되는가
 *
 * 카드는 전부 `absolute`다. 상자의 스크롤 높이는 내용과 무관하고(`overflow: visible`이라 스크롤
 * 상자 자체가 없다), 위치는 **실측 높이**로 계산한다:
 *
 * 1. 상자의 실폭·실높이를 ResizeObserver로 잰다.
 * 2. 그 폭·높이로 밀도 단계와 카드 폭을 정한다(`planOverlapContextCollage`).
 * 3. 그린 카드의 **실제 높이**를 다시 재고, 그 값으로 겹침 깊이를 역산한다(`placeOverlapStack`).
 *    마지막 카드의 아랫변이 상자 아랫변을 넘지 않는 것이 그 함수의 계약이다.
 *
 * 어림(글자 폭 비율·줄바꿈 자투리)이 빗나가도 결과는 "겹침이 조금 더 깊어짐"이지 "넘침"이 아니다.
 * 415가 상수 여유(FIT_SAFETY)로 막아야 했던 오차가 구조적으로 사라진다.
 *
 * ## 겹침의 방향과 z 순서
 *
 * 나중 카드가 앞 카드의 **아래쪽**을 덮는다. 카드 머리(테이프·✎/× 칩)는 늘 드러나 있어 조작이
 * 가려지지 않고, 덮이는 것은 먼저 여백과 `created:` 줄이다(사용자가 허용한 범위). 그것으로 모자랄
 * 때만 본문 마지막 줄부터 덮이고, 그 카드는 호버·포커스에서 위로 떠올라 전문을 드러낸다.
 */
interface CollectionContextCollageProps {
  recordId: number;
  contexts: ContextDetail[];
}

interface BoxSize {
  widthPx: number;
  heightPx: number;
}

/** 상자를 아직 재기 전(첫 페인트·jsdom)에 쓰는 값. 1160 펼침면의 오른쪽 면 실측치다. */
const FALLBACK_BOX: BoxSize = { widthPx: 440, heightPx: 340 };

export function CollectionContextCollage({ recordId, contexts }: CollectionContextCollageProps) {
  const [box, setBox] = useState<BoxSize | null>(null);
  const [boxElement, setBoxElement] = useState<HTMLDivElement | null>(null);
  // 카드의 실측 높이(px). 인덱스는 contexts와 같다. 0이면 아직 못 잰 것이라 어림값을 쓴다.
  const [heights, setHeights] = useState<number[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 이 상자는 flex-1 + min-h-0이고 자식이 전부 absolute라, 높이가 **내용과 무관하게** 남는 자리로
  // 정해진다 — 관찰해도 되먹임 고리가 생기지 않는다.
  useEffect(() => {
    if (!boxElement || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(() => {
      setBox({ widthPx: boxElement.clientWidth, heightPx: boxElement.clientHeight });
    });
    observer.observe(boxElement);
    return () => observer.disconnect();
  }, [boxElement]);

  // 기울어진 실루엣 몫을 뺀, 카드가 실제로 앉을 수 있는 세로 길이. 배치기와 위치 계산이 같은 값을 쓴다.
  const targetPx = Math.max(0, (box ?? FALLBACK_BOX).heightPx - COLLAGE_BOTTOM_SLACK_PX);
  const collage = planOverlapContextCollage(
    contexts.map((context) => context.body.length),
    targetPx,
    (box ?? FALLBACK_BOX).widthPx,
  );

  const measure = useCallback(() => {
    setHeights((previous) => {
      const next = cardRefs.current.map((element) => element?.offsetHeight ?? 0);
      const same =
        previous.length === next.length && previous.every((value, index) => value === next[index]);
      return same ? previous : next;
    });
  }, []);

  // 폭·밀도가 바뀌면 카드 높이도 바뀐다. 그리자마자 재고, 이후 변화(웹폰트 도착·본문 수정)는
  // ResizeObserver가 잡는다. 목록·밀도가 같으면 다시 걸지 않도록 서명 문자열로 묶는다.
  const layoutSignature = `${collage.metrics.bodyFontPx}:${collage.cells
    .map((cell) => `${contexts[cell.index].contextId}@${cell.widthPx}`)
    .join(',')}`;
  useLayoutEffect(measure, [measure, layoutSignature]);
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(measure);
    for (const element of cardRefs.current) {
      if (element) {
        observer.observe(element);
      }
    }
    return () => observer.disconnect();
  }, [measure, layoutSignature]);

  // 열별로 실측 높이를 모아 앉힌다(실측 전에는 어림값).
  const placements = new Array<{ topPx: number; raisePx: number }>(collage.cells.length);
  for (let column = 0; column < collage.columnStartTopPx.length; column += 1) {
    const columnCells = collage.cells.filter((cell) => cell.column === column);
    const columnHeights = columnCells.map((cell) => heights[cell.index] || cell.estimatedHeightPx);
    const placed = placeOverlapStack(
      columnHeights,
      collage.rowGapPx,
      collage.columnStartTopPx[column],
      targetPx,
    );
    columnCells.forEach((cell, indexInColumn) => {
      placements[cell.index] = placed[indexInColumn];
    });
  }

  if (contexts.length === 0) {
    return (
      <div
        ref={setBoxElement}
        data-page-turn="ignore"
        className="relative mt-1 min-h-0 flex-1 pt-5"
      >
        <p className="font-hand text-[20px] text-[#a29d95]">이 장소에 적어 둔 맥락이 아직 없어요</p>
      </div>
    );
  }

  return (
    // overflow는 건드리지 않는다(visible). 스크롤 상자를 만들지 않는 것이 이 화면의 계약이고,
    // 위치 계산이 상자 안을 벗어나지 않으므로 잘릴 것도 없다.
    <div
      ref={setBoxElement}
      data-page-turn="ignore"
      className="relative mt-1 min-h-0 flex-1"
      data-collage-deep={collage.deep ? 'true' : 'false'}
    >
      {collage.cells.map((cell) => {
        const context = contexts[cell.index];
        const placement = placements[cell.index] ?? { topPx: 0, raisePx: 0 };
        return (
          <div
            key={context.contextId}
            ref={(element) => {
              cardRefs.current[cell.index] = element;
            }}
            // 나중 카드가 위에 온다. 호버·포커스는 인라인 z-index를 이겨야 해서 !를 붙인다.
            className="absolute transition-transform duration-200 hover:!z-[60] hover:translate-y-[var(--collage-raise)] focus-within:!z-[60] focus-within:translate-y-[var(--collage-raise)]"
            style={
              {
                left: cell.leftPx,
                top: placement.topPx,
                width: cell.widthPx,
                zIndex: cell.index + 1,
                '--collage-raise': `${placement.raisePx}px`,
              } as CSSProperties
            }
          >
            {/* 회전은 안쪽에 건다 — 바깥의 transform은 호버 들어올림 몫이다. */}
            <div style={{ transform: `rotate(${cell.rotateDeg}deg)` }}>
              <ContextStickyNoteCard
                recordId={recordId}
                context={context}
                ownedByMe
                stackIndex={0}
                attachment="flat"
                metrics={collage.metrics}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
