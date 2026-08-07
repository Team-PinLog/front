import { z } from 'zod';
import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면(Component) → Hook → API 함수(여기) → httpClient.
 * API 함수가 요청/응답 타입을 소유하고, 응답을 Zod로 파싱한다.
 * 근거: docs/architecture.md 1장, docs/reference/08_API_명세.md 3.7(나의 활동 기록 집계).
 * 봉투({ success, data })는 httpClient 인터셉터가 벗긴다 — 여기서는 언랩된 data만 파싱한다.
 *
 * 화면 진입 시 1회 호출이고 **파라미터가 없다.** 기간·필터·페이지네이션을 두지 않는 것이 3.7의
 * 명시적 결정이다("화면이 '지금까지'를 보여주는 자리라 범위를 고를 여지가 없다").
 *
 * ⚠️ 서버가 정렬·상한(areas 상위 5)·빈 달 채우기를 모두 끝내서 내려준다. 프론트에서 다시 자르거나
 * 정렬하지 않는다 — 기준이 두 곳으로 갈린다(docs 이슈 #55 "화면 구성").
 * ⚠️ 날짜 경계는 전부 KST다(3.7). 프론트가 월·일을 다시 계산하지 않는 이유이기도 하다 —
 * 브라우저 로컬 타임존으로 재계산하면 서버가 KST로 끊어 둔 경계와 어긋난다.
 */
const monthlyRecordCountSchema = z.object({
  /** "YYYY-MM"(KST). 첫 기록 달부터 이번 달까지 빈칸 없이 이어진다. */
  month: z.string(),
  recordCount: z.number(),
});

export type MonthlyRecordCount = z.infer<typeof monthlyRecordCountSchema>;

const areaRecordCountSchema = z.object({
  /** place.address에서 뽑은 시·구 문자열. 서버가 건수 내림차순 상위 5곳만 내려준다. */
  district: z.string(),
  recordCount: z.number(),
});

export type AreaRecordCount = z.infer<typeof areaRecordCountSchema>;

const busiestDaySchema = z.object({
  /** "YYYY-MM-DD"(KST). */
  date: z.string(),
  recordCount: z.number(),
});

const meActivitySchema = z.object({
  totals: z.object({
    placeCount: z.number(),
    districtCount: z.number(),
    // 기록이 없으면 null이다(정상 응답). 404가 아니다.
    firstRecordedOn: z.string().nullable(),
  }),
  months: z.array(monthlyRecordCountSchema),
  areas: z.array(areaRecordCountSchema),
  counts: z.object({
    contextCount: z.number(),
    collectionCount: z.number(),
    // ⚠️ months.length와 다른 값이다. 이쪽은 "기록이 실제로 있는 달 수"이고 months.length는
    // 빈 달까지 채운 구간 길이(기간)다. 화면이 둘 다 쓴다.
    recordedMonthCount: z.number(),
  }),
  highlights: z.object({
    firstPlaceName: z.string().nullable(),
    lastPlaceName: z.string().nullable(),
    busiestDay: busiestDaySchema.nullable(),
  }),
});

export type MeActivity = z.infer<typeof meActivitySchema>;

export async function getMeActivity(): Promise<MeActivity> {
  const { data } = await httpClient.get('/me/activity');
  return meActivitySchema.parse(data);
}
