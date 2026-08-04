import { z } from 'zod';

/**
 * /auth/callback 쿼리 파라미터.
 * 근거: docs/reference/11_인증_설계.md 21행 — 성공 `/auth/callback`, 실패 `/auth/callback?error=OAUTH_FAILED`.
 * 탈퇴 왕복의 실패 어휘는 08_API_명세 3.6.2에 있다(`WITHDRAWAL_*`).
 *
 * ⚠️ `z.object`는 **선언하지 않은 쿼리를 버린다.** 서버가 새 파라미터를 추가하면 여기에도
 * 적어야 `beforeLoad`까지 도달한다.
 */
export const oauthCallbackSearchSchema = z.object({
  error: z.string().optional(),
});

export type OAuthCallbackSearch = z.infer<typeof oauthCallbackSearchSchema>;
