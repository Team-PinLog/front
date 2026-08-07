import { z } from 'zod';
import { httpClient } from '@/shared/http/client';
import type { ApiError } from '@/shared/http/types';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: 08_API_명세 5.9 최근 Record 목록 / 11.5 RecentRecordCard.
 * ⚠️ 이 절 번호는 **Team-PinLog/docs PR #50 기준이며 아직 머지 전**이다 — 지금 docs/reference/에
 * 받아둔 사본에는 이 절이 없다. 머지되면 doc-syncer가 reference와 api-contract.md를 갱신하고,
 * 그때 절 번호가 밀리면 이 주석도 함께 맞춘다(직접 고치지 않는다).
 * 봉투({ success, data })는 httpClient 인터셉터가 벗긴다. 여기서는 언랩된 data만 파싱한다.
 *
 * 기간(7일)·정렬(createdAt 내림차순)은 **서버가 고정**한다 — 파라미터가 없으므로 프론트가 넘기지 않는다.
 */
// thumbnailUrl은 4:3 장소 대표 이미지다. 없으면 null이며 서버가 필드를 생략하지 않는다(11.1).
// getRecordDetail.ts와 같은 이유로 optional까지 허용한다(배포 시점 차이). 명세에 "당분간 대부분
// null"이라고 못박혀 있어 표시 측은 폴백을 기본 경로로 취급한다(RecentRecordCard).
const placeSummarySchema = z.object({
  placeId: z.number(),
  name: z.string(),
  address: z.string(),
  thumbnailUrl: z.string().nullable().optional(),
  lat: z.number(),
  lng: z.number(),
});

// ⚠️ RecordDetail(11.1)과 달리 `contexts` 필드 **자체가 없다**(11.5). 손글씨 메모가 필요하면
// recordId로 5.2를 따로 부른다 — 이 스키마에 body를 끼워 넣으려 하지 않는다.
// keywords: []는 정상이다. 여기에는 keywordStatus가 없어 "AI 판정 전"과 "키워드 0건"을 구분할 수
// 없다(명세 5.9 명시) — 따라서 화면도 두 경우를 구분해 안내하지 않는다.
const recentRecordCardSchema = z.object({
  recordId: z.number(),
  place: placeSummarySchema,
  keywords: z.array(z.string()),
  createdAt: z.string(),
});

export type RecentRecordCardItem = z.infer<typeof recentRecordCardSchema>;

const recentRecordsPageSchema = z.object({
  items: z.array(recentRecordCardSchema),
  nextCursor: z.string().nullable(),
  hasNext: z.boolean(),
});

export type RecentRecordsPage = z.infer<typeof recentRecordsPageSchema>;

export interface GetRecentRecordsParams {
  cursor?: string;
  size?: number;
}

/**
 * 백엔드가 아직 이 엔드포인트를 배포하지 않았을 때의 응답. 명세상 "7일 내 기록 없음"은 `items: []`인
 * **200**이므로(404가 아니다), 지금은 404가 곧 "엔드포인트가 아직 없다"만 뜻한다.
 *
 * TODO(371 후속): **백엔드가 GET /records/recent를 배포하면 이 폴백을 제거한다.**
 * 임시 조치라는 점이 중요하다 — 엔드포인트가 살아 있는 상태에서도 이 코드가 남아 있으면, 그때의
 * 404(라우팅이 바뀌었거나 프록시가 잘못 물린 진짜 장애)가 조용히 "영역 비노출"로 접혀 화면에서
 * 최근 기록만 사라진 채 아무 신호도 남지 않는다.
 *
 * 501은 일부러 넣지 않았다. 계약에 없는 상태 코드까지 미리 접어 두면 폴백이 덮는 범위가 명세보다
 * 넓어지고, 위험은 그대로 커진다(추측으로 구현하지 않는다 — AGENTS.md 규칙).
 */
function isEndpointUnavailable(error: unknown): boolean {
  return (error as Partial<ApiError> | null | undefined)?.status === 404;
}

/**
 * 최근 7일 내 내 Record 목록. 엔드포인트가 아직 없으면 **에러를 던지지 않고 null**을 돌려준다.
 *
 * null을 쓰는 이유 — 이 영역은 홈의 부가 정보라, 아직 없는 API 때문에 홈 전체가 에러 화면이 되거나
 * react-query 재시도가 도는 것이 사용자에게 아무 이득이 없다. 호출부는 `null`을 "영역을 그리지
 * 않는다"로 읽는다(빈 배열과 의미가 다르다 — 빈 배열은 안내 문구를 띄운다).
 *
 * parse를 try 밖에 두는 것이 중요하다. 안에 넣으면 스키마 불일치(zod 에러)까지 "엔드포인트 없음"으로
 * 삼켜져, 계약이 어긋난 사실이 조용히 숨는다.
 */
export async function getRecentRecords(
  params?: GetRecentRecordsParams,
): Promise<RecentRecordsPage | null> {
  let payload: unknown;
  try {
    const { data } = await httpClient.get('/records/recent', { params });
    payload = data;
  } catch (error) {
    if (isEndpointUnavailable(error)) {
      return null;
    }
    throw error;
  }
  return recentRecordsPageSchema.parse(payload);
}
