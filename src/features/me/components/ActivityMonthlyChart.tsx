import type { MonthlyRecordCount } from '../api/getMeActivity';
import { ActivityBlockPlaceholder } from './ActivityBlockPlaceholder';
import {
  formatMonthAxisLabel,
  getAxisLabelInterval,
  getBarLengthPercent,
  getMaxRecordCount,
  getPeakIndex,
} from '../lib/activityChart';
import {
  ACTIVITY_BAR_COLOR_CLASS,
  ACTIVITY_CARD_CLASS,
  ACTIVITY_CARD_HINT_CLASS,
  ACTIVITY_CARD_TITLE_CLASS,
} from './activityCardStyles';

interface ActivityMonthlyChartProps {
  months: MonthlyRecordCount[];
}

/**
 * 월별 기록 — 세로 막대. **이 화면의 유일한 차트다.**
 *
 * SVG·캔버스·차트 라이브러리를 쓰지 않는다(docs 이슈 #55의 설계 전제). 막대는 div이고 길이는
 * height 퍼센트다. 규칙은 이슈가 정한 그대로다:
 *   - 윗모서리 4px, 바닥에 붙임, 막대 사이 6px(gap-1.5), 축은 1px 실선 하나.
 *   - 막대 색은 하나(ACTIVITY_BAR_COLOR_CLASS). 강조는 **최고값 막대의 값 라벨** 하나뿐이다.
 *   - 나머지 값은 hover 툴팁(`월 · N건`)으로 읽는다 — title 속성이라 별도 부품이 필요 없고
 *     키보드·스크린리더용으로는 아래 sr-only 표가 같은 값을 갖는다.
 *   - 도넛·이중축·무지개 팔레트·범례를 쓰지 않는다. 단일 계열이라 제목이 곧 계열 이름이다.
 *
 * months는 서버가 첫 기록 달부터 이번 달까지 **빈 달까지 채워** 정렬해 내려준다. 여기서 자르거나
 * 다시 정렬하지 않는다 — 빈 달(0건)은 막대 없이 자리만 차지하는 것이 정상이다.
 */
export function ActivityMonthlyChart({ months }: ActivityMonthlyChartProps) {
  const maxCount = getMaxRecordCount(months);
  const peakIndex = getPeakIndex(months);
  const labelInterval = getAxisLabelInterval(months.length);

  return (
    <section className={ACTIVITY_CARD_CLASS}>
      <div className="flex flex-col gap-1">
        <h2 className={ACTIVITY_CARD_TITLE_CLASS}>월별 기록</h2>
        <p className={ACTIVITY_CARD_HINT_CLASS}>
          첫 기록이 있는 달부터 이번 달까지, 기록이 없는 달도 그대로 둡니다.
        </p>
      </div>

      {months.length === 0 ? (
        <ActivityBlockPlaceholder>아직 그릴 달이 없어요.</ActivityBlockPlaceholder>
      ) : (
        <div className="flex flex-col">
          {/* pt-6: 최고값 막대가 100%까지 찼을 때 그 위 값 라벨이 카드 밖으로 잘리지 않게 비워 두는
              자리다. items-end라 이 padding은 막대 높이(content box 기준 %)에 들어가지 않는다. */}
          <div className="flex h-40 items-end gap-1.5 pt-6 xl:h-52">
            {months.map((item, index) => (
              <div
                key={item.month}
                title={`${item.month} · ${item.recordCount}건`}
                className="relative flex h-full min-w-[4px] flex-1 items-end"
              >
                <div
                  aria-hidden="true"
                  className={`w-full rounded-t-[4px] ${ACTIVITY_BAR_COLOR_CLASS}`}
                  style={{ height: `${getBarLengthPercent(item.recordCount, maxCount)}%` }}
                />
                {index === peakIndex && (
                  <span className="pointer-events-none absolute inset-x-0 -top-5 text-center text-[11px] font-bold tabular-nums text-pin-navy">
                    {item.recordCount}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 축 — 1px 실선 하나. 눈금선·이중축을 두지 않는다. */}
          <div aria-hidden="true" className="h-px w-full bg-line-card" />

          {/* 라벨 행은 막대와 **같은 flex·같은 gap**이라 칸이 1:1로 맞는다. 달 수가 많으면 라벨만
              솎아내고(getAxisLabelInterval) 막대는 그대로 다 그린다. */}
          <div aria-hidden="true" className="mt-1.5 flex gap-1.5">
            {months.map((item, index) => (
              <span
                key={item.month}
                className="min-w-[4px] flex-1 truncate text-center text-[10px] leading-none text-ink-gray-light"
              >
                {index % labelInterval === 0 || index === months.length - 1
                  ? formatMonthAxisLabel(item.month)
                  : ''}
              </span>
            ))}
          </div>

          {/* 툴팁(title)은 마우스에만 열린다. 같은 값을 보조기술이 읽을 수 있게 표로 한 벌 둔다 —
              막대를 SVG로 그리지 않는 덕에 별도 접근성 레이어 없이 이것으로 충분하다. */}
          <table className="sr-only">
            <caption>월별 기록 수</caption>
            <tbody>
              {months.map((item) => (
                <tr key={item.month}>
                  <th scope="row">{item.month}</th>
                  <td>{item.recordCount}건</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
