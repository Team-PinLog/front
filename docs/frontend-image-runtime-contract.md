# Frontend image runtime contract

The `dev` frontend image is built with these fixed deployment inputs:

- `VITE_API_BASE_URL=/api/core/v1` is a non-secret build-time value. Vite embeds it in `dist`; Kubernetes runtime environment variables cannot change an existing bundle. CI fails if the variable is empty or if the resulting artifact does not contain the value.
- The image runs as UID/GID `101:101`, with `allowPrivilegeEscalation: false` and all Linux capabilities dropped.
- Nginx listens on container port `8080`. Infra must set the frontend Service/Deployment `targetPort` and probes to `8080`; port `80` is not part of this image contract.
- The root filesystem may be read-only when a writable, size-bounded `emptyDir` (preferably memory-backed) is mounted at `/tmp`. Nginx PID and all temporary paths are explicitly under `/tmp`.
- Liveness/readiness/startup probes must use exact path `GET /healthz` on port `8080`. It returns static `200 text/plain`; `/api/*` returns `404` from this frontend image and never falls through to `index.html`.
- `/` and client-side SPA routes are served from the immutable `dist` artifact.

Rollback: redeploy the previous immutable `ghcr.io/team-pinlog/front:<40-character-commit-sha>` (or its recorded digest) and restore its matching Infra `targetPort`/probe contract. Do not retag or overwrite an existing commit tag.
