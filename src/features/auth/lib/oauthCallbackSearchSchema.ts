import { z } from 'zod';

/**
 * /auth/callback 쿼리 파라미터.
 * 근거: docs/reference/11_인증_설계.md 21행 — 성공 `/auth/callback`, 실패 `/auth/callback?error=OAUTH_FAILED`.
 */
export const oauthCallbackSearchSchema = z.object({
  error: z.string().optional(),
});

export type OAuthCallbackSearch = z.infer<typeof oauthCallbackSearchSchema>;
