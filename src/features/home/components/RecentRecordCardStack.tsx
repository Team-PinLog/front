import { useMemo } from 'react';
import type { RecentRecordCardItem } from '@/features/records/api/getRecentRecords';
import { PinOutline } from '@/shared/ui/PinSymbols';
import {
  formatRecentRelativeDay,
  getCycledRecentIndex,
  getRecentRowLayout,
  getVisibleRecentIndexes,
} from '../lib/recentRecordStack';
import { RecentRecordCard } from './RecentRecordCard';

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
      <section aria-label="최근의 장소" className="w-full max-w-[19rem] text-center">
        <p className="text-sm font-bold text-pin-navy">최근의 장소</p>
        <span className="mt-3 flex justify-center text-pin-navy/25">
          <PinOutline height={34} />
        </span>
        <p className="mt-2 text-xs leading-relaxed text-ink-gray">
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
    // 377 정정: 별도 색의 보드 패널을 두지 않는다. 카드는 **페이지 배경(paper-white) 위에 직접**
    // 압정으로 꽂힌 모양이다. 대신 이 영역이 지도와 겹치지 않도록 배경 레이어(지도) 쪽 폭을 줄이고
    // 오른쪽 가장자리를 페이드했다(HomePage) — 판을 깔아 가리는 대신 지도를 비켜 세우는 방식이다.
    <section aria-label="최근의 장소" className="w-full max-w-[19rem]">
      <p className="mb-3 text-xs font-bold tracking-[0.12em] text-pin-navy/70">최근의 장소</p>

      {/* 행 사이 간격이 넉넉해야 위 카드의 압정이 아래 카드에 닿지 않는다(압정이 카드 위로 30px
          가까이 튀어나온다). overflow를 숨기지 않는 것도 같은 이유다. */}
      <div className="flex flex-col gap-6 pt-4">
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

      <div className="mt-4 flex items-center justify-between gap-2">
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
