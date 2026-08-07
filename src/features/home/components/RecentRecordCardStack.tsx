import { useMemo } from 'react';
import type { RecentRecordCardItem } from '@/features/records/api/getRecentRecords';
import {
  formatRecentRelativeDay,
  getCycledRecentIndex,
  getRecentStackCardLayout,
  getRecentStackOffset,
  RECENT_STACK_VISIBLE_DEPTH,
} from '../lib/recentRecordStack';
import { RecentRecordCard } from './RecentRecordCard';

interface RecentRecordCardStackProps {
  items: RecentRecordCardItem[];
  /** 앞장의 인덱스. 상태는 HomePage가 들고 있다 — 지도 마커 강조가 같은 값을 봐야 하기 때문이다. */
  activeIndex: number;
  onActiveIndexChange: (nextIndex: number) => void;
  /** 받아온 것보다 더 많은 기록이 있는지(명세 5.9 hasNext). "1 / 20+" 표기에만 쓴다. */
  hasNext: boolean;
  /** 앞장을 누르면 상세를 연다. */
  onSelectRecord: (recordId: number) => void;
}

/**
 * 홈 "요즘 붙여둔 것" — 최근 저장한 Record가 폴라로이드처럼 한 자리에 겹쳐 쌓인 스택.
 * 근거: Jira S15P11A705-371.
 *
 * 좌우 화살표로 맨 앞장이 빠지고 다음 장이 올라오는 **순환**이다(끝에서 끊기지 않는다).
 * 배열을 회전시키지 않고 activeIndex만 옮긴다 — 배열을 돌리면 같은 카드가 매 넘김마다 다른 위치의
 * React key를 갖게 되어 DOM이 재생성되고, 그때마다 사진이 다시 로드되며 깜빡인다.
 * 자세한 배치 규칙은 lib/recentRecordStack.ts(순수 함수 + 테스트)에 있다.
 */
export function RecentRecordCardStack({
  items,
  activeIndex,
  onActiveIndexChange,
  hasNext,
  onSelectRecord,
}: RecentRecordCardStackProps) {
  const total = items.length;

  // 모든 장이 같은 "오늘"을 기준으로 상대 날짜를 계산해야 한다. 카드마다 new Date()를 부르면
  // 자정을 걸친 순간 같은 스택 안에서 "오늘"과 "어제"가 섞인다. 렌더당 한 번만 읽는다.
  const now = useMemo(() => new Date(), []);

  if (total === 0) {
    // ⚠️ 오류가 아니다. 7일 안에 기록이 없으면 서버가 200 + items: []를 준다(명세 5.9).
    return (
      <section
        aria-label="요즘 붙여둔 것"
        className="w-full max-w-[17rem] rounded-2xl border border-dashed border-line-card bg-paper-white/85 p-5 text-center backdrop-blur"
      >
        <p className="text-sm font-bold text-pin-navy">요즘 붙여둔 것</p>
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

  const activeItem = items[activeIndex];

  return (
    // max-w는 앞장 폭(13rem)에 뒷장이 밀려 나가는 64px + 여유를 더한 값이다. 이보다 좁으면 맨 뒷장
    // 오른쪽이 화면 밖으로 나가고, 넓으면 카드 오른쪽에 빈 자리가 생겨 스택이 왼쪽으로 치우쳐 보인다.
    <section aria-label="요즘 붙여둔 것" className="w-full max-w-[18.5rem]">
      <p className="mb-2 text-xs font-bold tracking-[0.12em] text-pin-navy/70">요즘 붙여둔 것</p>

      {/* 스택은 카드들이 겹쳐 있어 크기를 내용에서 얻을 수 없다(전부 absolute) — 자리를 잡아 주는
          고정 크기가 필요하다. 폭은 **앞장 한 장** 기준이고, 뒷장은 여기서 오른쪽 위로 밀려 나간다.
          바깥 section이 그만큼 여유(max-w)를 갖고 있어 잘리지 않는다 — overflow를 숨기면 뒷장의
          드러난 부분이 잘려 "세 장"이 성립하지 않으므로 절대 hidden을 걸지 않는다.
          높이는 사진(4:3) + 텍스트 영역에 뒷장이 위로 올라가는 30px을 더한 값이다. */}
      <div className="relative ml-0 h-[17.5rem] w-[13rem]">
        {items.map((item, index) => {
          const offset = getRecentStackOffset(index, activeIndex, total);
          if (offset > RECENT_STACK_VISIBLE_DEPTH) {
            // 이 뒤의 장들은 앞장들에 완전히 가려 보이지 않는다. 20장을 모두 DOM에 두면 사진도 그만큼
            // 붙는다 — 보이는 깊이까지만 그린다.
            return null;
          }
          const layout = getRecentStackCardLayout(offset);
          return (
            <div
              key={item.recordId}
              // origin이 bottom-left인 이유: 회전축이 카드 왼쪽 아래에 있어야 뒷장이 오른쪽 위로
              // 부채처럼 벌어진다. 중앙이 축이면 같은 각도에서 카드 아래쪽이 앞장 밑으로 파고든다.
              className="absolute inset-0 origin-bottom-left transition-transform duration-300 ease-out motion-reduce:transition-none"
              style={{
                transform: `translate(${layout.translateXPx}px, ${layout.translateYPx}px) rotate(${layout.rotateDeg}deg) scale(${layout.scale})`,
                zIndex: layout.zIndex,
              }}
              // 뒷장은 가장자리만 보이는 장식이라 스크린리더가 앞장과 함께 읽으면 같은 내용이 여러 벌
              // 읽힌다. 포커스도 받지 않게 해 Tab이 보이지 않는 카드로 들어가지 않게 한다.
              aria-hidden={layout.isFront ? undefined : true}
              inert={layout.isFront ? undefined : true}
            >
              <RecentRecordCard
                item={item}
                relativeDay={formatRecentRelativeDay(item.createdAt, now)}
                isFront={layout.isFront}
              />
            </div>
          );
        })}

        {/* 앞장 전체를 덮는 클릭 대상. 카드 자체를 <button>으로 만들지 않는 이유는, 카드가 뒷장일
            때도 버튼으로 남아 포커스 순서에 끼어들기 때문이다. 앞장 위에만 이 레이어를 얹는다. */}
        {activeItem && (
          <button
            type="button"
            onClick={() => onSelectRecord(activeItem.recordId)}
            className="absolute inset-0 rounded-[3px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-log-mint"
            style={{ zIndex: RECENT_STACK_VISIBLE_DEPTH + 2 }}
          >
            <span className="sr-only">{activeItem.place.name} 기록 상세 보기</span>
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
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
