import { z } from 'zod';
import { imageClient } from '@/shared/http/imageClient';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → HTTP Client.
 * 근거: docs/api-contract.md § Collection 표지 생성(이미지 서비스), 원본 08_API_명세 §7.7이
 * 연동 계약을 front#99 가이드로 위임한다.
 *
 * 세 호출이 한 흐름(생성 → 폴링 → 선택 → 폴링)이라 파일을 쪼개지 않고 한곳에 둔다 — 스키마를
 * 공유하고, 계약이 바뀔 때 함께 움직인다.
 *
 * ⚠️ **이미지 API의 `request_id`는 Feed의 `requestId`(Feed Session 식별자)와 완전히 별개다.**
 * 이름이 같아 섞이기 쉬워서 프론트 이름은 전부 `coverRequestId`로 둔다.
 */

// 이미지 API 응답은 snake_case다. 경계에서 한 번만 camelCase로 바꾸고, 그 뒤로는 프론트 관례를 따른다.

// styleId를 z.enum(6종)으로 좁히지 않는 이유: 프론트는 이 값을 해석하지 않는다 — 카드에 찍는
// 것은 서버가 준 label이고, styleId는 선택 시 그대로 돌려보내는 불투명 식별자다. enum으로 굳히면
// AI 파트가 화풍을 하나 추가하는 순간 파싱이 통째로 실패해 표지 생성 화면이 죽는다.
const coverCandidateBaseSchema = z.object({
  style_id: z.string(),
  label: z.string(),
});

// 잡 상태는 반대로 좁힌다 — 프론트가 값마다 다르게 그리고(스켈레톤/이미지/재시도 안내) 폴링
// 종료 여부까지 이 값으로 판단하므로, 모르는 값이 조용히 흘러들면 폴링이 멈추지 않거나 잘못된
// 화면을 그린다. front#99가 넷으로 못박은 값이다.
const coverJobStatusSchema = z.enum(['queued', 'running', 'done', 'failed']);

export type CoverJobStatus = z.infer<typeof coverJobStatusSchema>;

const coverCandidateSchema = coverCandidateBaseSchema
  .extend({
    status: coverJobStatusSchema,
    url: z.string().nullable(),
  })
  .transform(({ style_id, label, status, url }) => ({ styleId: style_id, label, status, url }));

export type CoverCandidate = z.infer<typeof coverCandidateSchema>;

// --- 1. 미리보기 6장 요청 -------------------------------------------------------------------

// 생성 응답의 candidates에는 아직 status·url이 없다(잡이 막 큐에 들어간 시점이다) — 폴링 응답과
// 스키마가 다르므로 따로 파싱하고, 화면에는 queued 상태로 그린다.
const createCoverRequestResponseSchema = z
  .object({
    request_id: z.string(),
    candidates: z.array(coverCandidateBaseSchema),
  })
  .transform(({ request_id, candidates }) => ({
    coverRequestId: request_id,
    candidates: candidates.map(({ style_id, label }) => ({
      styleId: style_id,
      label,
      status: 'queued' as const,
      url: null,
    })),
  }));

export type CreateCoverRequestResponse = z.infer<typeof createCoverRequestResponseSchema>;

export interface CreateCoverRequestPayload {
  title: string;
  /** 사용자 입력(한국어)을 그대로 보낸다 — 번역·프롬프트 조립 금지(front#99). */
  keywords: string[];
}

export async function createCoverRequest(
  payload: CreateCoverRequestPayload,
): Promise<CreateCoverRequestResponse> {
  const { data } = await imageClient.post('/covers', payload);
  return createCoverRequestResponseSchema.parse(data);
}

// --- 2. 생성 상태 폴링 ----------------------------------------------------------------------

const coverRequestStateSchema = z
  .object({
    request_id: z.string(),
    // 가이드의 TS 타입은 'running' | 'done'이지만 잡 상태와 같은 어휘를 쓰므로 넷 다 받는다 —
    // 생성 직후 queued가 오더라도 파싱이 깨지지 않게 한다.
    status: coverJobStatusSchema,
    candidates: z.array(coverCandidateSchema),
    final: coverCandidateSchema.nullable(),
  })
  .transform(({ request_id, status, candidates, final }) => ({
    coverRequestId: request_id,
    status,
    candidates,
    final,
  }));

export type CoverRequestState = z.infer<typeof coverRequestStateSchema>;

export async function getCoverRequest(coverRequestId: string): Promise<CoverRequestState> {
  const { data } = await imageClient.get(`/covers/${coverRequestId}`);
  return coverRequestStateSchema.parse(data);
}

// --- 3. 화풍 선택(인쇄본 생성) ---------------------------------------------------------------

const selectCoverStyleResponseSchema = z
  .object({
    request_id: z.string(),
    job_id: z.string(),
    style_id: z.string(),
  })
  .transform(({ request_id, job_id, style_id }) => ({
    coverRequestId: request_id,
    jobId: job_id,
    styleId: style_id,
  }));

export type SelectCoverStyleResponse = z.infer<typeof selectCoverStyleResponseSchema>;

export async function selectCoverStyle(
  coverRequestId: string,
  styleId: string,
): Promise<SelectCoverStyleResponse> {
  const { data } = await imageClient.post(`/covers/${coverRequestId}/select`, {
    style_id: styleId,
  });
  return selectCoverStyleResponseSchema.parse(data);
}
