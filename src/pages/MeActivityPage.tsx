import { ActivityAreaBars } from '@/features/me/components/ActivityAreaBars';
import { ActivityCountsCard } from '@/features/me/components/ActivityCountsCard';
import { ActivityHighlightsCard } from '@/features/me/components/ActivityHighlightsCard';
import { ActivityMonthlyChart } from '@/features/me/components/ActivityMonthlyChart';
import { ActivityStatTiles } from '@/features/me/components/ActivityStatTiles';
import { useMeActivityQuery } from '@/features/me/hooks/useMeActivityQuery';
import {
  PAGE_CONTAINER_CLASS,
  PAGE_TITLE_GAP_CLASS,
  PAGE_VERTICAL_PADDING_CLASS,
} from '@/shared/lib/shelfCabinetLayout';
import { ErrorState } from '@/shared/ui/ErrorState';
import { PageTitle } from '@/shared/ui/PageTitle';

/**
 * 나의 활동 기록(/me/activity). 내 기록을 월별·지역별로 집계해 보여주는 한 페이지다.
 * 근거: Jira S15P11A705-407, docs 이슈 Team-PinLog/docs#55, docs/reference/08_API_명세.md 3.7.
 *
 * 진입 시 GET /me/activity를 1회 호출한다 — 페이지네이션·필터·기간 파라미터가 없다.
 *
 * 제목은 목업의 "2026년, 당신의 기록"이 아니라 **"당신의 기록"**이다. 집계가 전체 누적이라
 * 연도를 박으면 어긋난다(이슈 「정해지지 않은 것」 3번의 결론을 그대로 따른다).
 *
 * 세로 배치: PageTitle → 큰 숫자 3열 → 2×2 격자(월별 막대 | 이만큼 쌓였어요 / 지역 막대 |
 * 기억에 남을 만한 것), 좌우 비율 1.45:1.
 * 반응형은 이슈에 목업이 없는 구간(sm·mdlg)이라 여기서 정한다 — 격자는 xl에서만 두 열이고
 * 그 아래에서는 한 열로 쌓는다. 좁은 폭에서 1.45:1을 유지하면 오른쪽 카드의 숫자와 장소 이름이
 * 줄바꿈으로 무너지고, 막대 하나하나의 폭도 hover가 어려울 만큼 얇아진다.
 *
 * 다른 페이지와 달리 PAGE_MIN_HEIGHT_CLASS(뷰포트 높이 고정)를 쓰지 않는다 — 책장·Feed는 캐비닛을
 * 화면에 맞춰 넣는 화면이라 높이가 계약이지만, 이 화면은 내용이 아래로 이어지는 문서라 AppLayout의
 * <main> 스크롤에 그대로 맡긴다.
 */
export function MeActivityPage() {
  const activityQuery = useMeActivityQuery();

  return (
    <main
      className={`${PAGE_CONTAINER_CLASS} flex flex-col ${PAGE_TITLE_GAP_CLASS} ${PAGE_VERTICAL_PADDING_CLASS}`}
    >
      <PageTitle
        className="text-[27px] font-bold tracking-tight text-pin-navy"
        description="지금까지 남긴 장소와 맥락을 모아 봤어요."
      >
        당신의 기록
      </PageTitle>

      {activityQuery.isPending ? (
        <p className="text-sm text-ink-gray">불러오는 중…</p>
      ) : activityQuery.isError ? (
        <ErrorState
          title="활동 기록을 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
        />
      ) : (
        <div className="flex flex-col gap-4 xl:gap-5">
          <ActivityStatTiles
            totals={activityQuery.data.totals}
            periodMonthCount={activityQuery.data.months.length}
          />

          {/* 1.45 : 1 — 이슈가 지정한 비율이다. fr 단위라 두 열의 gap이 비율 계산에서 빠져
              막대 영역이 실제로 1.45배 넓다. */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.45fr_1fr] xl:gap-5">
            <ActivityMonthlyChart months={activityQuery.data.months} />
            <ActivityCountsCard counts={activityQuery.data.counts} />
            <ActivityAreaBars areas={activityQuery.data.areas} />
            <ActivityHighlightsCard highlights={activityQuery.data.highlights} />
          </div>
        </div>
      )}
    </main>
  );
}
