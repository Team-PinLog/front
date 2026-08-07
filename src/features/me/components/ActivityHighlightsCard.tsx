import type { MeActivity } from '../api/getMeActivity';
import {
  ACTIVITY_CARD_CLASS,
  ACTIVITY_CARD_HINT_CLASS,
  ACTIVITY_CARD_TITLE_CLASS,
} from './activityCardStyles';

interface ActivityHighlightsCardProps {
  highlights: MeActivity['highlights'];
}

/**
 * "기억에 남을 만한 것" — 첫 기록 · 가장 바빴던 날 · 최근 기록.
 *
 * 세 값 모두 기록이 없으면 `null`이다(200 응답의 정상 상태). 오류로 처리하지 않고 자리만 비운다 —
 * 카드를 통째로 숨기면 2×2 격자가 무너진다(빈 상태 규칙).
 * `busiestDay.date`는 KST 기준 날짜 문자열이라 그대로 적는다(Date로 파싱해 다시 포맷하면 로컬
 * 타임존으로 하루 밀릴 수 있다).
 */
export function ActivityHighlightsCard({ highlights }: ActivityHighlightsCardProps) {
  const { firstPlaceName, lastPlaceName, busiestDay } = highlights;

  return (
    <section className={ACTIVITY_CARD_CLASS}>
      <div className="flex flex-col gap-1">
        <h2 className={ACTIVITY_CARD_TITLE_CLASS}>기억에 남을 만한 것</h2>
        <p className={ACTIVITY_CARD_HINT_CLASS}>기록을 시작한 자리와 가장 바빴던 하루입니다.</p>
      </div>

      <dl className="flex flex-col divide-y divide-line-subtle">
        <HighlightRow label="첫 기록" value={firstPlaceName} />
        <HighlightRow
          label="가장 많이 기록한 날"
          value={busiestDay ? `${busiestDay.date} · ${busiestDay.recordCount}건` : null}
        />
        <HighlightRow label="가장 최근 기록" value={lastPlaceName} />
      </dl>
    </section>
  );
}

function HighlightRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <dt className="flex-none text-sm text-ink-gray">{label}</dt>
      <dd
        className={`min-w-0 truncate text-right text-sm ${
          value ? 'font-bold text-pin-navy' : 'text-ink-gray-light'
        }`}
        title={value ?? undefined}
      >
        {value ?? '아직 없어요'}
      </dd>
    </div>
  );
}
