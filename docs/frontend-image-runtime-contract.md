# Frontend image runtime contract

The `dev` frontend image is built with the public configuration declared in
`.github/pinlog/runtime-config.dev.yaml`:

- `VITE_API_BASE_URL`, `VITE_KAKAO_REST_KEY`, and `VITE_KAKAO_JS_KEY` are public build configuration. Vite embeds every `VITE_*` value in the browser bundle, so these values must not be called or managed as Secrets or SealedSecrets.
- The `dev` push workflow reads all three values from repository-level GitHub Actions Variables. A missing or empty variable fails the workflow before the build. The repository currently has no configured Actions Variables or Environment, so all three variables are a required deployment prerequisite; this PR does not create them.
- Pull-request CI uses non-sensitive placeholders and validates the contract without reading real key values. The contract declares `ownerSecretKeys: []`; therefore no sealing or dispatch action/job is invoked. A server-side runtime consumer must be introduced before adding a Secret handoff.
- Kubernetes runtime environment variables cannot change an existing bundle. Changing one of these public variables requires an image rebuild; the resulting immutable image SHA/digest is then rolled out through Infra GitOps.
- The image runs as UID/GID `101:101`, with `allowPrivilegeEscalation: false` and all Linux capabilities dropped.
- Nginx listens on container port `8080`. Infra must set the frontend Service/Deployment `targetPort` and probes to `8080`; port `80` is not part of this image contract.
- The root filesystem may be read-only when a writable, size-bounded `emptyDir` (preferably memory-backed) is mounted at `/tmp`. Nginx PID and all temporary paths are explicitly under `/tmp`.
- Liveness/readiness/startup probes must use exact path `GET /healthz` on port `8080`. It returns static `200 text/plain`; `/api/*` returns `404` from this frontend image and never falls through to `index.html`.
- `/` and client-side SPA routes are served from the immutable `dist` artifact.

- Every `dev` push or trusted manual rebuild publishes a fresh run-bound tag `<40sha>-cfg-<20hex>-run-<GITHUB_RUN_ID>-a<GITHUB_RUN_ATTEMPT>`. Repeating the same variables intentionally creates another immutable tag: safety and auditability take precedence over registry preflight reuse or no-op behavior.

Rollback: redeploy a previously recorded immutable run-bound tag (or its recorded digest) and restore its matching Infra `targetPort`/probe contract. Do not retag or overwrite an existing tag.
