import type { AreaRecordCount } from '../api/getMeActivity';
import { getBarLengthPercent, getMaxRecordCount } from '../lib/activityChart';
import { ActivityBlockPlaceholder } from './ActivityBlockPlaceholder';
import {
  ACTIVITY_BAR_COLOR_CLASS,
  ACTIVITY_BAR_TRACK_CLASS,
  ACTIVITY_CARD_CLASS,
  ACTIVITY_CARD_HINT_CLASS,
  ACTIVITY_CARD_TITLE_CLASS,
} from './activityCardStyles';

interface ActivityAreaBarsProps {
  areas: AreaRecordCount[];
}

/**
 * 많이 다닌 지역 — 가로 막대. div의 width 퍼센트다(SVG·차트 라이브러리 금지).
 *
 * 5줄뿐이라 **줄 끝에 값을 다 적는다** — 이게 표 역할을 겸한다(이슈의 차트 규칙). 그래서 여기엔
 * 최고값 값 라벨 강조가 따로 없다. 막대 색은 월별 막대와 같은 한 색이다.
 *
 * 서버가 건수 내림차순 상위 5곳으로 잘라 정렬해 내려준다(08_API_명세 3.7). 여기서 다시 자르거나
 * 정렬하지 않는다 — 동점을 지역명 오름차순으로 끊는 규칙까지 서버에 있다.
 */
export function ActivityAreaBars({ areas }: ActivityAreaBarsProps) {
  const maxCount = getMaxRecordCount(areas);

  return (
    <section className={ACTIVITY_CARD_CLASS}>
      <div className="flex flex-col gap-1">
        <h2 className={ACTIVITY_CARD_TITLE_CLASS}>많이 다닌 지역</h2>
        <p className={ACTIVITY_CARD_HINT_CLASS}>기록이 많은 순으로 다섯 곳입니다.</p>
      </div>

      {areas.length === 0 ? (
        <ActivityBlockPlaceholder>아직 다녀온 지역이 없어요.</ActivityBlockPlaceholder>
      ) : (
        <ul className="flex flex-col gap-3">
          {areas.map((area) => (
            <li key={area.district} className="flex items-center gap-3">
              <span className="w-20 flex-none truncate text-xs text-ink-gray" title={area.district}>
                {area.district}
              </span>
              <span className={`h-2.5 min-w-0 flex-1 rounded-full ${ACTIVITY_BAR_TRACK_CLASS}`}>
                <span
                  aria-hidden="true"
                  className={`block h-full rounded-full ${ACTIVITY_BAR_COLOR_CLASS}`}
                  style={{ width: `${getBarLengthPercent(area.recordCount, maxCount)}%` }}
                />
              </span>
              <span className="w-10 flex-none text-right text-xs font-bold tabular-nums text-pin-navy">
                {area.recordCount}건
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
