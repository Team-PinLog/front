import { useMemo } from 'react';
import type { RecentRecordCardItem } from '@/features/records/api/getRecentRecords';
import { PinOutline } from '@/shared/ui/PinSymbols';
import { getRecentBoardGrainImage, RECENT_BOARD } from '../lib/recentBoard';
import {
  formatRecentRelativeDay,
  getCycledRecentIndex,
  getRecentRowLayout,
  getVisibleRecentIndexes,
} from '../lib/recentRecordStack';
import { RecentRecordCard } from './RecentRecordCard';

/**
 * 카드가 꽂히는 판. 377 추가 지시로 생겼다 — 그 전에는 카드가 지도 위에 그대로 떠 있어 압정이
 * 아무 데도 꽂혀 있지 않았다. 재질값은 lib/recentBoard.ts에 모아 조정할 수 있게 뒀다.
 *
 * 안쪽 그림자를 주는 이유: 판이 배경보다 살짝 눌려 들어가 보여야 그 위의 카드가 떠 보인다.
 * 판 자체가 떠 보이면 카드와 판이 같은 층으로 읽혀 압정의 의미가 사라진다.
 */
const boardStyle = {
  backgroundColor: RECENT_BOARD.baseColor,
  backgroundImage: getRecentBoardGrainImage(),
  backgroundRepeat: 'repeat',
  backgroundSize: `${RECENT_BOARD.grainTileSizePx}px ${RECENT_BOARD.grainTileSizePx}px`,
  borderColor: RECENT_BOARD.edgeColor,
  boxShadow: `inset 0 1px 0 rgba(255,255,255,.5), inset 0 -2px 6px ${RECENT_BOARD.edgeColor}, 0 12px 28px -18px rgba(4,33,66,.45)`,
} as const;

/** 결 이미지는 배경색 위에 곱해져야 색을 먹지 않는다. 배경 자체에 알파를 주면 판이 비쳐 버린다. */
const boardGrainStyle = {
  backgroundImage: getRecentBoardGrainImage(),
  backgroundRepeat: 'repeat',
  backgroundSize: `${RECENT_BOARD.grainTileSizePx}px ${RECENT_BOARD.grainTileSizePx}px`,
  opacity: RECENT_BOARD.grainAlpha,
  mixBlendMode: 'multiply',
} as const;

interface RecentRecordCardStackProps {
  items: RecentRecordCardItem[];
  /** 첫 행의 인덱스. 상태는 HomePage가 들고 있다 — 지도 마커 강조가 같은 값을 봐야 하기 때문이다. */
  activeIndex: number;
  onActiveIndexChange: (nextIndex: number) => void;
  /** 받아온 것보다 더 많은 기록이 있는지(명세 5.9 hasNext). "1 / 20+" 표기에만 쓴다. */
  hasNext: boolean;
  /** 카드를 누르면 상세를 연다. */
  onSelectRecord: (recordId: number) => void;
}

/**
 * "최근의 장소" — 최근 저장한 기록을 대시보드에 압정으로 박아 둔 종이처럼 보여 준다.
 * 근거: Jira S15P11A705-371, 377(핀 목업 v2 + 사용자 지시).
 *
 * 377에서 두 가지가 바뀌었다.
 * ① 제목이 "요즘 붙여둔 것" → **"최근의 장소"**.
 * ② **3장 겹침 스택 폐기 → 3행으로 엇갈려 펼침.** 겹쳐 두면 뒤 장을 읽을 수 없어 "최근에 어디
 *    갔었지"를 한눈에 볼 수 없었다. 좌우 화살표 순환은 유지하되 의미가 바뀐다 — 이제 넘기면 세 행이
 *    한 칸씩 밀려 다음 카드가 올라온다.
 */
export function RecentRecordCardStack({
  items,
  activeIndex,
  onActiveIndexChange,
  hasNext,
  onSelectRecord,
}: RecentRecordCardStackProps) {
  const total = items.length;

  // 모든 카드가 같은 "오늘"을 기준으로 상대 날짜를 계산해야 한다. 카드마다 new Date()를 부르면
  // 자정을 걸친 순간 같은 목록 안에서 "오늘"과 "어제"가 섞인다. 렌더당 한 번만 읽는다.
  const now = useMemo(() => new Date(), []);
  const visibleIndexes = getVisibleRecentIndexes(activeIndex, total);

  if (total === 0) {
    // ⚠️ 오류가 아니다. 7일 안에 기록이 없으면 서버가 200 + items: []를 준다(명세 5.9).
    // 빈 상태에 점선 핀(pin-outline)을 쓰는 것은 목업의 "아직 꽂힌 핀이 없어요" 규칙이다 —
    // 빈 자리를 회색 상자가 아니라 "꽂을 자리"로 보이게 한다.
    return (
      <section
        aria-label="최근의 장소"
        className="relative w-full max-w-[19rem] overflow-hidden rounded-2xl border p-5 text-center"
        style={boardStyle}
      >
        <span aria-hidden="true" className="absolute inset-0" style={boardGrainStyle} />
        <p className="relative text-sm font-bold text-pin-navy">최근의 장소</p>
        <span className="relative mt-3 flex justify-center text-pin-navy/25">
          <PinOutline height={34} />
        </span>
        <p className="relative mt-2 text-xs leading-relaxed text-ink-gray">
          최근 7일 동안 저장한 장소가 없어요.
          <br />
          마음에 든 곳을 기록해 보세요.
        </p>
      </section>
    );
  }

  const handleStep = (delta: number) => {
    onActiveIndexChange(getCycledRecentIndex(activeIndex, delta, total));
  };

  return (
    // 카드가 판 위로 튀어나오는 압정을 가리지 않도록 overflow를 숨기지 않는다. 결 레이어만
    // 판 크기에 맞춰 따로 깔고, 판 모서리 밖으로 나가지 않게 그 레이어에만 rounded를 준다.
    <section
      aria-label="최근의 장소"
      className="relative w-full max-w-[19rem] rounded-2xl border px-4 pb-4 pt-3"
      style={boardStyle}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={boardGrainStyle}
      />
      <p className="relative mb-3 text-xs font-bold tracking-[0.12em] text-pin-navy/70">
        최근의 장소
      </p>

      {/* 행 사이 간격이 넉넉해야 위 카드의 압정이 아래 카드에 닿지 않는다(압정이 카드 위로 30px
          가까이 튀어나온다). overflow를 숨기지 않는 것도 같은 이유다. */}
      <div className="relative flex flex-col gap-6 pt-4">
        {visibleIndexes.map((itemIndex, rowIndex) => {
          const item = items[itemIndex]!;
          const layout = getRecentRowLayout(rowIndex);
          return (
            <div
              key={item.recordId}
              className="transition-transform duration-300 ease-out motion-reduce:transition-none"
              style={{
                transform: `translateX(${layout.translateXPx}px) rotate(${layout.rotateDeg}deg)`,
                zIndex: layout.zIndex,
              }}
            >
              <RecentRecordCard
                item={item}
                relativeDay={formatRecentRelativeDay(item.createdAt, now)}
                isFront={layout.isFront}
                onSelect={onSelectRecord}
              />
            </div>
          );
        })}
      </div>

      <div className="relative mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => handleStep(-1)}
          disabled={total <= 1}
          aria-label="이전 기록 카드"
          className="grid h-8 w-8 place-items-center rounded-full border border-line-card bg-snow-white text-pin-navy shadow-sm transition-colors enabled:hover:border-log-mint enabled:hover:text-log-mint disabled:opacity-40"
        >
          ‹
        </button>

        {/* hasNext면 받아온 개수가 전부가 아니다. 총 개수를 알 방법이 없어(집계 API 없음) 정확한 N
            대신 "20+"로 적는다 — 틀린 총계를 보여주지 않으면서 "더 있다"는 사실은 전한다. */}
        <p className="text-xs font-bold tabular-nums text-pin-navy/70">
          {activeIndex + 1} / {total}
          {hasNext ? '+' : ''}
        </p>

        <button
          type="button"
          onClick={() => handleStep(1)}
          disabled={total <= 1}
          aria-label="다음 기록 카드"
          className="grid h-8 w-8 place-items-center rounded-full border border-line-card bg-snow-white text-pin-navy shadow-sm transition-colors enabled:hover:border-log-mint enabled:hover:text-log-mint disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </section>
  );
}
