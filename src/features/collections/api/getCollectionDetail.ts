import { z } from 'zod';
import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 7.3 Collection 상세 통합 조회.
 * 봉투({ success, data })는 httpClient 인터셉터가 벗긴다. 여기서는 언랩된 data만 파싱한다.
 * Feed·타인 Shelf·직접 진입 공통 DTO라, 소유자 조회와 타인(공개) 조회가 같은 스키마를 공유한다.
 */
// [확인 필요] 08_API_명세.md는 PlaceSummary의 완전한 필드 목록을 명시하지 않는다(JSON 예시엔 placeId만 등장).
// kakaoPlaceId는 142 "저장하기"(POST /records)에 필요해 포함된다고 가정하고 추가했다 — 실제 응답에 없어도
// 파싱이 깨지지 않도록 optional로 둔다. 없으면 RecordSaveButton이 버튼 자체를 렌더하지 않는다.
// thumbnailUrl은 PlaceSummaryResponse를 쓰는 모든 응답에 실린다(back PR #184) — Collection 상세도 포함이다.
// 배포 시점이 프론트보다 늦을 수 있어 optional로 받는다. 값 자체는 당분간 대부분 null이다:
// 시연용 목업 단계라 이미지 연결이 수동 SQL이고 그 실행이 아직 남아 있다(docs/api-contract.md DTO — PlaceSummary).
const placeSummarySchema = z.object({
  placeId: z.number(),
  kakaoPlaceId: z.string().optional(),
  name: z.string(),
  address: z.string(),
  thumbnailUrl: z.string().nullable().optional(),
  lat: z.number(),
  lng: z.number(),
});

export type PlaceSummary = z.infer<typeof placeSummarySchema>;

const contextDetailSchema = z.object({
  contextId: z.number(),
  body: z.string(),
  createdAt: z.string(),
});

const followSummarySchema = z.object({
  followed: z.boolean(),
  followId: z.number().nullable(),
  alias: z.string().nullable(),
});

// contexts는 ownedByMe: true일 때만 배열이고, 타인(공개) 조회는 null이다(privacy-rules.md 1장 — Context 원문 비공개).
// keywords: []는 AI 미완료 상태의 정상 응답이다(architecture.md 5장) — 오류로 처리하지 않는다.
const collectionRecordItemSchema = z.object({
  recordId: z.number(),
  place: placeSummarySchema,
  contexts: z.array(contextDetailSchema).nullable(),
  keywords: z.array(z.string()),
  createdAt: z.string(),
  addedToCollectionAt: z.string(),
});

// follow는 ownedByMe: true(본인 Collection)면 null이다.
const collectionDetailSchema = z.object({
  collectionId: z.number(),
  title: z.string(),
  ownedByMe: z.boolean(),
  follow: followSummarySchema.nullable(),
  // 318: 표지 이미지 URL(7.3). null은 표지가 없는 정상 상태다. 백엔드 배포가 프론트보다 늦을 수
  // 있어 optional로 받는다(같은 파일 thumbnailUrl 선례).
  coverImageUrl: z.string().nullable().optional(),
  records: z.object({
    items: z.array(collectionRecordItemSchema),
    nextCursor: z.string().nullable(),
    hasNext: z.boolean(),
  }),
  publishedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CollectionDetail = z.infer<typeof collectionDetailSchema>;

export interface GetCollectionDetailParams {
  recordCursor?: string;
  recordSize?: number;
}

export async function getCollectionDetail(
  collectionId: number,
  params?: GetCollectionDetailParams,
): Promise<CollectionDetail> {
  const { data } = await httpClient.get(`/collections/${collectionId}`, { params });
  return collectionDetailSchema.parse(data);
}
