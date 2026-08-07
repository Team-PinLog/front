import type { MeActivity } from '../api/getMeActivity';
import {
  ACTIVITY_CARD_CLASS,
  ACTIVITY_CARD_HINT_CLASS,
  ACTIVITY_CARD_TITLE_CLASS,
} from './activityCardStyles';

interface ActivityCountsCardProps {
  counts: MeActivity['counts'];
}

/**
 * "이만큼 쌓였어요" — 숫자 셋을 목록으로 적는다. 단일 사실이라 차트로 그리지 않는다(차트 규칙).
 *
 * `recordedMonthCount`는 **기록이 실제로 있는 달 수**다. 위 큰 숫자 3열의 "개월"(months.length,
 * 빈 달까지 채운 기간)과 다른 값이고, 화면이 둘 다 쓴다 — 라벨에서 그 차이가 읽히도록 적는다.
 */
export function ActivityCountsCard({ counts }: ActivityCountsCardProps) {
  return (
    <section className={ACTIVITY_CARD_CLASS}>
      <div className="flex flex-col gap-1">
        <h2 className={ACTIVITY_CARD_TITLE_CLASS}>이만큼 쌓였어요</h2>
        <p className={ACTIVITY_CARD_HINT_CLASS}>지운 기록은 세지 않습니다.</p>
      </div>

      <dl className="flex flex-col divide-y divide-line-subtle">
        <CountRow label="남긴 맥락" value={counts.contextCount} unit="개" />
        <CountRow label="만든 컬렉션" value={counts.collectionCount} unit="개" />
        <CountRow label="기록을 남긴 달" value={counts.recordedMonthCount} unit="개월" />
      </dl>
    </section>
  );
}

function CountRow({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <dt className="text-sm text-ink-gray">{label}</dt>
      <dd className="flex items-baseline gap-1">
        <span className="text-xl font-bold tabular-nums text-pin-navy">{value}</span>
        <span className="text-xs text-ink-gray">{unit}</span>
      </dd>
    </div>
  );
}
