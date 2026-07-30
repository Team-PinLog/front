import { z } from 'zod';
import { httpClient } from '@/shared/http/client';

/**
 * ⭐ 표준 패턴: 화면 → Hook → API 함수(여기) → httpClient.
 * 근거: docs/reference/08_API_명세.md 8.3 별칭 수정·제거.
 * 이번 티켓(143)에서 소비하는 화면은 없다 — 별칭 관리 UI는 144(Library) 범위. API 함수만 미리 만들어 둔다.
 *
 * ⚠️ alias 키를 생략한 요청({})도 서버는 "제거"로 처리한다(키 부재와 명시적 null을 구분하지 않음).
 * 그래서 이 함수는 alias를 필수 인자로 받는다 — 호출자가 명시적으로 값을 넣지 않으면 아예 호출하지 않도록
 * 시그니처로 강제한다(값을 유지하려면 현재 값을 그대로 실어 보내야 한다).
 */
const updateFollowAliasResponseSchema = z.object({
  followId: z.number(),
  alias: z.string().nullable(),
});

export type UpdateFollowAliasResponse = z.infer<typeof updateFollowAliasResponseSchema>;

export async function updateFollowAlias(
  followId: number,
  alias: string | null,
): Promise<UpdateFollowAliasResponse> {
  const { data } = await httpClient.patch(`/follows/${followId}`, { alias });
  return updateFollowAliasResponseSchema.parse(data);
}
