import type { MeActivity } from '../api/getMeActivity';

interface ActivityStatTilesProps {
  totals: MeActivity['totals'];
  /** 첫 기록 달부터 이번 달까지의 **기간** 길이. months 배열 길이 그 자체다(아래 주석). */
  periodMonthCount: number;
}

/**
 * 큰 숫자 3열. 단일 사실 셋이라 차트로 그리지 않는다(이슈의 차트 규칙 — "차트는 월별 막대 하나뿐").
 *
 * 세 번째 칸의 개월 수는 `totals.firstRecordedOn`으로 다시 계산하지 않고 `months.length`를 쓴다.
 * 08_API_명세 3.7이 months를 "첫 기록이 있는 달부터 이번 달까지 빠짐없이" 정의하므로 그 길이가 곧
 * 기간이고, 무엇보다 그 경계는 **KST 벽시계 기준**이다 — 브라우저 로컬 타임존으로 개월 수를 다시
 * 세면 KST 자정 언저리·해외 타임존에서 서버와 1개월 어긋난다. 서버 값을 재가공하지 않는다는
 * 이 화면의 원칙과도 같은 방향이다.
 */
export function ActivityStatTiles({ totals, periodMonthCount }: ActivityStatTilesProps) {
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatTile label="기록한 장소" value={totals.placeCount} unit="곳" />
      <StatTile label="발자국이 닿은 지역" value={totals.districtCount} unit="개 구" />
      <StatTile
        label="기록을 남긴 기간"
        value={periodMonthCount}
        unit="개월"
        hint={totals.firstRecordedOn ? `첫 기록 ${totals.firstRecordedOn}` : undefined}
      />
    </dl>
  );
}

interface StatTileProps {
  label: string;
  value: number;
  unit: string;
  hint?: string;
}

function StatTile({ label, value, unit, hint }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-line-card bg-snow-white px-5 py-4">
      <dt className="text-xs text-ink-gray">{label}</dt>
      <dd className="flex items-baseline gap-1">
        <span className="text-3xl font-bold tabular-nums text-pin-navy">{value}</span>
        <span className="text-sm text-ink-gray">{unit}</span>
      </dd>
      {/* hint가 없어도 자리를 비워 세 칸의 높이를 맞춘다 — 첫 칸만 낮으면 3열이 어긋나 보인다. */}
      <p className="min-h-4 text-[11px] text-ink-gray-light">{hint ?? ''}</p>
    </div>
  );
}
