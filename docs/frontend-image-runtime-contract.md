# Frontend image runtime contract

The `dev` frontend image is built with the public configuration declared in
`.github/pinlog/runtime-config.dev.yaml`:

- `VITE_API_BASE_URL`, `VITE_KAKAO_REST_KEY`, and `VITE_KAKAO_JS_KEY` are public browser inputs, not confidential runtime credentials. Vite embeds every `VITE_*` value in the browser bundle; Kubernetes Secrets or SealedSecrets therefore cannot make the resulting values private.
- The `dev` push and image-publish paths read all three values from repository-level GitHub Actions Variables, not Secrets (`Front / repository variable` per `docs/reference/12_배포_변수_및_Secret_표준.md` §2, confirmed by Infra). This document previously stated these were read from repository-level Secrets, chosen to protect CI log handling from masking gaps (commits `efc116e`/`8195380`, 2026-07); that rationale is superseded now that the Infra deploy-variable standard classifies them as non-sensitive build variables. Run scripts validate nonempty values without printing them.
- `DEPLOY_CANARY_REV` is read only by the `image-publish` job from the `dev` Environment Variable context (`Front / dev Environment variable` per `docs/reference/12_배포_변수_및_Secret_표준.md` §2), not Secret. It participates in the image configuration fingerprint and tag, but is never injected into Vite or the browser bundle.
- Missing or empty inputs fail closed before build or publish; the canary revision must also match `[A-Za-z0-9._-]+`. This PR does not create or modify repository Secrets, Environment Secrets, Variables, or Environments.
- Pull-request CI uses non-sensitive placeholders and validates the contract without reading real key values. The contract declares `ownerSecretKeys: []`; therefore no sealing or dispatch action/job is invoked. A server-side runtime consumer must be introduced before adding a Secret handoff.
- Kubernetes runtime environment variables cannot change an existing bundle. Changing one of these public variables requires an image rebuild; the resulting immutable image SHA/digest is then rolled out through Infra GitOps.
- The image runs as UID/GID `101:101`, with `allowPrivilegeEscalation: false` and all Linux capabilities dropped.
- Nginx listens on container port `8080`. Infra must set the frontend Service/Deployment `targetPort` and probes to `8080`; port `80` is not part of this image contract.
- The root filesystem may be read-only when a writable, size-bounded `emptyDir` (preferably memory-backed) is mounted at `/tmp`. Nginx PID and all temporary paths are explicitly under `/tmp`.
- Liveness/readiness/startup probes must use exact path `GET /healthz` on port `8080`. It returns static `200 text/plain`; `/api/*` returns `404` from this frontend image and never falls through to `index.html`.
- `/` and client-side SPA routes are served from the immutable `dist` artifact.

- Every `dev` push or trusted manual rebuild publishes a fresh run-bound tag `<40sha>-cfg-<20hex>-run-<GITHUB_RUN_ID>-a<GITHUB_RUN_ATTEMPT>`. Repeating the same variables intentionally creates another immutable tag: safety and auditability take precedence over registry preflight reuse or no-op behavior.

Rollback: redeploy a previously recorded immutable run-bound tag (or its recorded digest) and restore its matching Infra `targetPort`/probe contract. Do not retag or overwrite an existing tag.
