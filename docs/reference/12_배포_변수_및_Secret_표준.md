# 배포 변수 및 Secret 표준

이 문서는 Frontend·Backend·AI·Infra의 배포 변수와 Secret 전달 계약을 한 곳에 고정합니다. 이름과 전달 경계만 공개하며 **값은 기록하지 않습니다**.

## 1. 원칙

- `민감`은 GitHub Actions Secret과 Kubernetes Secret으로, `비민감`은 코드 기본값·GitHub Actions Variable·GitOps values로 관리합니다.
- `VITE_*`는 브라우저 번들에 포함되므로 Secret이 될 수 없습니다. API key라는 이름이어도 공개 build variable입니다.
- 평문 Secret은 Git·PR·Jira·workflow 출력에 남기지 않습니다. GitOps에는 strict-scope SealedSecret의 `encryptedData`만 둡니다.
- GitHub Environment는 승인 경계입니다. 표의 `없음`은 Environment Secret이 아니라는 뜻이지 값이 필요 없다는 뜻이 아닙니다.
- runtime Secret과 공급망/PR token은 서로 재사용하지 않습니다. `GITHUB_TOKEN`은 GitHub가 job마다 발급하는 임시 token이므로 표에서 제외합니다.

## 2. 정본 표

`GitOps ciphertext 위치`의 `—`는 ciphertext 전달 대상이 없다는 뜻입니다. `repo/Environment`는 GitHub 저장 위치이고 값은 이 문서에 두지 않습니다.

| 영역  | 이름                                       | 분류                            | owner / GitHub 저장 위치                             | GitHub Environment                                                             | GitOps ciphertext 위치                                                                                      | runtime consumer                                 |
| ----- | ------------------------------------------ | ------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| FE    | `VITE_API_BASE_URL`                        | 비민감 build variable           | Front / repository variable                          | `dev` publish gate                                                             | —                                                                                                           | Vite build → browser API client                  |
| FE    | `VITE_KAKAO_REST_KEY`                      | 비민감 공개 key                 | Front / repository variable                          | `dev` publish gate                                                             | —                                                                                                           | Vite build → browser Kakao REST client           |
| FE    | `VITE_KAKAO_JS_KEY`                        | 비민감 공개 key                 | Front / repository variable                          | `dev` publish gate                                                             | —                                                                                                           | Vite build → browser Kakao Maps SDK              |
| FE    | `DEPLOY_CANARY_REV`                        | 비민감 build identity           | Front / `dev` Environment variable                   | `dev` publish gate                                                             | —                                                                                                           | Vite image identity/canary 검증                  |
| FE    | `PINLOG_INFRA_IMAGE_PR_TOKEN`              | 민감 공급망 token               | Front / repository Actions Secret                    | `dev` publish job gate (repository Secret 소비)                                | —                                                                                                           | Front CI의 Infra image PR client                 |
| BE    | `JWT_PRIVATE_KEY`                          | 민감 runtime Secret             | Back / Environment Secret                            | `pinlog-secrets-prod`                                                          | `infra/secrets/prod/back-owner-secrets.sealedsecret.yaml`                                                   | Spring `JwtKeyProvider`                          |
| BE    | `GOOGLE_CLIENT_ID`                         | 민감 runtime credential         | Back / Environment Secret                            | `pinlog-secrets-prod`                                                          | 위와 같음                                                                                                   | Spring OAuth2 Google client                      |
| BE    | `GOOGLE_CLIENT_SECRET`                     | 민감 runtime Secret             | Back / Environment Secret                            | `pinlog-secrets-prod`                                                          | 위와 같음                                                                                                   | Spring OAuth2 Google client                      |
| BE    | `KAKAO_CLIENT_ID`                          | 민감 runtime credential         | Back / Environment Secret                            | `pinlog-secrets-prod`                                                          | 위와 같음                                                                                                   | Spring OAuth2 Kakao client                       |
| BE    | `KAKAO_CLIENT_SECRET`                      | 민감 runtime Secret             | Back / Environment Secret                            | `pinlog-secrets-prod`                                                          | 위와 같음                                                                                                   | Spring OAuth2 Kakao client                       |
| BE    | `NAVER_CLIENT_ID`                          | 민감 runtime credential         | Back / Environment Secret                            | `pinlog-secrets-prod`                                                          | 위와 같음                                                                                                   | Spring OAuth2 Naver client                       |
| BE    | `NAVER_CLIENT_SECRET`                      | 민감 runtime Secret             | Back / Environment Secret                            | `pinlog-secrets-prod`                                                          | 위와 같음                                                                                                   | Spring OAuth2 Naver client                       |
| BE    | `PINLOG_AI_INTERNAL_SECRET`                | 민감 runtime Secret             | Back / Environment Secret                            | `pinlog-secrets-prod`                                                          | 위와 같음                                                                                                   | Spring AI client의 `X-Internal-Secret`           |
| BE    | `PINLOG_INFRA_SECRET_PR_TOKEN`             | 민감 bridge token               | Back / Environment Secret                            | `pinlog-secrets-prod`                                                          | —                                                                                                           | SealedSecret Infra PR action만 소비              |
| BE    | `SPRING_DATASOURCE_URL`                    | 비민감 runtime variable         | Infra / GitOps values                                | 없음                                                                           | —                                                                                                           | Spring datasource                                |
| BE    | `SPRING_DATASOURCE_USERNAME`               | 비민감 runtime variable         | Infra / GitOps values                                | 없음                                                                           | —                                                                                                           | Spring datasource                                |
| BE    | `SPRING_DATASOURCE_PASSWORD`               | 민감 runtime Secret             | Infra credential owner                               | 없음                                                                           | `infra/secrets/prod/postgres-credentials.sealedsecret.yaml` (`password`)                                    | Spring datasource                                |
| BE    | `SPRING_DATA_REDIS_HOST`                   | 비민감 runtime variable         | Infra / GitOps values                                | 없음                                                                           | —                                                                                                           | Spring Data Redis                                |
| BE    | `SPRING_DATA_REDIS_PORT`                   | 비민감 runtime variable         | Infra / GitOps values                                | 없음                                                                           | —                                                                                                           | Spring Data Redis                                |
| BE    | `PINLOG_AI_BASE_URL`                       | 비민감 runtime variable         | Infra / GitOps values                                | 없음                                                                           | —                                                                                                           | Spring AI HTTP client                            |
| AI    | `GMS_API_KEY`                              | 민감 runtime Secret             | AI / Environment Secret                              | `pinlog-secrets-dev`                                                           | `infra/secrets/dev/ai-owner-secrets.sealedsecret.yaml`                                                      | FastAPI GMS clients                              |
| AI    | `GMS_BASE_URL`                             | 비민감 endpoint(현재 봉인 전달) | AI / Environment Secret                              | `pinlog-secrets-dev`                                                           | 위와 같음                                                                                                   | FastAPI GMS clients                              |
| AI    | `INTERNAL_SHARED_SECRET`                   | 민감 runtime Secret             | AI / Environment Secret                              | `pinlog-secrets-dev`                                                           | 위와 같음                                                                                                   | FastAPI internal-auth verifier                   |
| AI    | `PINLOG_EMBEDDING_MODEL`                   | 비민감 optional override        | AI 설정 owner                                        | `pinlog-secrets-dev`                                                           | 위와 같음                                                                                                   | FastAPI `Settings`                               |
| AI    | `PINLOG_EMBEDDING_DIMENSION`               | 비민감 optional override        | AI 설정 owner                                        | `pinlog-secrets-dev`                                                           | 위와 같음                                                                                                   | FastAPI `Settings`                               |
| AI    | `PINLOG_EMBEDDING_DISTANCE`                | 비민감 optional override        | AI 설정 owner                                        | `pinlog-secrets-dev`                                                           | 위와 같음                                                                                                   | FastAPI `Settings`                               |
| AI    | `PINLOG_EMBEDDING_PROFILE`                 | 비민감 optional override        | AI 설정 owner                                        | `pinlog-secrets-dev`                                                           | 위와 같음                                                                                                   | FastAPI `Settings` 및 BE/AI profile 대조         |
| AI    | `DATABASE_URL`                             | 민감 runtime Secret             | AI DB credential owner                               | 별도 승인 전달                                                                 | `infra/secrets/dev/ai-db-credentials.sealedsecret.yaml`                                                     | FastAPI/Flyway-compatible DB client              |
| AI    | `PINLOG_INFRA_IMAGE_PR_TOKEN`              | 민감 공급망·Secret PR token     | AI / repository Actions Secret                       | `pinlog-secrets-dev` seal job gate (repository Secret 소비), 일반 CI(image PR) | —                                                                                                           | AI CI 및 SealedSecret Infra PR action            |
| Infra | `PINLOG_IMAGE_UPDATER_TOKEN`               | 민감 공급망 token               | Infra / Actions Secret                               | 없음                                                                           | —                                                                                                           | Backend·Frontend source/run/GHCR 검증과 Infra PR |
| Infra | `PINLOG_IMAGE_UPDATER_USERNAME`            | 비민감 공급망 variable          | Infra / repository variable                          | 없음                                                                           | —                                                                                                           | Backend·Frontend GHCR digest 검증                |
| Infra | `PINLOG_AI_SOURCE_READER_TOKEN`            | 민감 read token                 | Infra / Actions Secret                               | 없음                                                                           | —                                                                                                           | AI source CI/GHCR provenance 검증                |
| Infra | `PINLOG_AI_INFRA_PR_TOKEN`                 | 민감 PR token                   | Infra / Actions Secret                               | 없음                                                                           | —                                                                                                           | AI image update PR 생성·검증                     |
| Infra | `PINLOG_AI_IMAGE_UPDATER_USERNAME`         | 비민감 공급망 variable          | Infra / repository variable                          | 없음                                                                           | —                                                                                                           | AI GHCR digest 검증                              |
| Infra | `AI_IMAGE_AUTOMATION_APPROVED`             | 비민감 승인 gate                | Infra / repository variable                          | 없음                                                                           | —                                                                                                           | AI image updater job gate                        |
| Infra | `FRONTEND_IMAGE_AUTOMATION_APPROVED`       | 비민감 승인 gate                | Infra / repository variable                          | 없음                                                                           | —                                                                                                           | Front image PR 생성 gate                         |
| Infra | `FRONTEND_IMAGE_AUTO_MERGE_APPROVED`       | 비민감 승인 gate                | Infra / repository variable                          | 없음                                                                           | —                                                                                                           | Front trusted auto-merge gate                    |
| Infra | `MATTERMOST_WEBHOOK_URL`                   | 민감 알림 Secret                | Infra / Actions Secret                               | 없음                                                                           | `infra/secrets/monitoring/mattermost-alert-webhook.sealedsecret.yaml`은 live Alertmanager용 별도 ciphertext | 외부 HTTPS monitor; live 사본은 Alertmanager     |
| Infra | GHCR pull credential (`.dockerconfigjson`) | 민감 imagePullSecret            | Infra credential owner                               | 없음                                                                           | `infra/secrets/{dev,prod}/ghcr-*-pull.sealedsecret.yaml`                                                    | kubelet image pull                               |
| Infra | Sealed Secrets controller private key      | 최고 민감 복호화 key            | Infra owner / 팀 비밀번호 관리자·오프클러스터 backup | 없음                                                                           | GitOps 저장 금지                                                                                            | Sealed Secrets controller                        |

Backend owner runtime policy는 **8-key**입니다. 위 `JWT_PRIVATE_KEY`부터 `PINLOG_AI_INTERNAL_SECRET`까지 정확히 8개이며 bridge token은 runtime key 수에 포함하지 않습니다. AI owner manifest의 비민감 override도 현재 전달 정책상 ciphertext에 포함되지만, 이를 민감정보로 재분류하지는 않습니다.

## 3. dev/prod 승인과 전달

1. owner가 해당 저장소의 보호된 trusted ref에서 수동 seal workflow를 실행합니다. AI dev는 `ai/main` + `pinlog-secrets-dev`, Backend prod는 `back/dev` + `pinlog-secrets-prod`입니다.
2. GitHub Environment reviewer가 이름·owner·대상 환경·변경 사유를 확인해 job 접근을 승인합니다. prod는 dev 검증 증거, 변경창, rollback 담당자를 추가 확인합니다.
3. workflow는 승인된 인증서와 strict namespace/name/key schema로 봉인하고, 평문 없이 Infra 기능 브랜치 PR만 만듭니다. source SHA, run ID, 인증서 fingerprint, encrypted key 이름만 검토합니다.
4. Infra PR에서 허용 경로, ciphertext-only, provenance, key 집합, rollout annotation 변경, 필수 CI를 검증합니다. 승인되지 않은 key 추가·삭제나 평문/placeholder가 있으면 중단합니다.
5. merge 후 Argo CD sync를 기다리고 아래 rollout 검증을 통과해야 완료입니다. dev 성공 없이 prod를 승인하지 않습니다.

## 4. rotation

1. credential owner가 공급자/키 종류별 새 값을 발급하고 폐기 시점·영향 consumer를 기록합니다. 값 자체는 기록하지 않습니다.
2. 가능한 credential은 overlap 기간을 두고 새 값으로 owner workflow를 재실행합니다. asymmetric JWT key는 기존 token TTL과 강제 로그아웃 영향을 승인 항목에 포함합니다.
3. Infra ciphertext PR의 key 집합과 provenance를 검증하고 merge합니다. `secrets.pinlog.io/revision` 변경으로 Pod template이 갱신되어야 합니다.
4. rollout과 실제 OAuth/DB/AI round-trip을 검증한 뒤에만 이전 credential을 폐기합니다. 실패하면 이전 ciphertext를 GitOps revert합니다.
5. GitHub Secret, 공급자 credential, cluster pull credential은 서로 독립적으로 회전하며 token을 다른 용도로 재사용하지 않습니다. controller private key를 회전하면 모든 SealedSecret 재봉인과 backup 복구 시험이 필요합니다.

## 5. GitOps revert rollback

1. 장애 변경의 Infra merge commit을 식별하고 `revert/<Jira-key>-...` 기능 브랜치에서 `git revert`합니다.
2. ciphertext와 rollout annotation/image digest를 함께 직전 검증 상태로 되돌립니다. Secret 값을 복호화하거나 live Secret을 수동 편집하지 않습니다.
3. Infra 필수 checks와 PR review 후 merge하고 Argo CD가 정본을 sync하게 합니다. `kubectl rollout undo`, protected branch 직접 push, live patch는 영구 rollback 수단으로 쓰지 않습니다.
4. credential이 이미 폐기되었다면 ciphertext revert만으로 복구되지 않습니다. owner가 이전 credential 재활성화 또는 새 rotation을 승인해야 합니다.

## 6. Pod rollout 검증

값을 출력하지 않고 다음 증거만 수집합니다.

```bash
kubectl -n <namespace> rollout status deployment/<service> --timeout=5m
kubectl -n <namespace> get deployment/<service> -o jsonpath='{.metadata.generation} {.status.observedGeneration} {.status.updatedReplicas} {.status.readyReplicas} {.status.unavailableReplicas}{"\n"}'
kubectl -n <namespace> get pods -l app.kubernetes.io/name=<service> -o wide
kubectl -n <namespace> describe deployment/<service>
```

- 새 ReplicaSet이 기대 image SHA+digest와 Secret revision annotation을 사용하고, old ReplicaSet이 scale-down 되었는지 확인합니다.
- startup → readiness가 성공한 뒤 liveness가 안정적인지, restart count·Unavailable replica·경고 Event가 증가하지 않는지 확인합니다.
- Backend는 `/api/core/actuator/health/liveness`, `/api/core/actuator/health/readiness`, PostgreSQL/Flyway, Redis, OAuth redirect, AI internal round-trip을 확인합니다.
- AI는 `/health`, `/ready`, DB schema/pgvector 접근, embedding profile 일치, GMS round-trip을 확인합니다.
- Front는 immutable image identity와 외부 HTTPS, API base path, Kakao 지도/검색 smoke를 확인합니다.
- 로그에는 key 이름과 revision만 허용하며 값·Authorization header·DATABASE_URL은 출력하지 않습니다.
