# API 계약

> 기준: docs 레포 `static/08_API_명세.md`, `static/11_인증_설계.md` (2026-07-27 재확인, `docs/cookie-based-auth` PR merge 반영). 원본 사본은 `docs/reference/08_API_명세.md`, `docs/reference/11_인증_설계.md`.
> 아래 [확정]만 근거로 구현한다. [협의 필요]는 확정된 것처럼 구현하지 않는다. 문서에 없는 엔드포인트·필드는 추측해서 채우지 않는다.

## [확정]

### 공통

- **base path**: `/api/core/v1` (context-path `/api/core` + 버전 `v1`을 합친 값). `VITE_API_BASE_URL`에 이 값을 넣는다(`08_API_명세` 최상단).
- **인증**: **쿠키 기반**. BFF 별도 계층 없음 — Spring 단일 앱이 BFF+리소스서버를 겸한다(`11_인증_설계` 2장).
  - 방식: JWT. Access 30분 / Refresh 7일. Refresh는 Redis 저장·**회전 발급**(재발급 시 이전 토큰 무효화).
  - 토큰은 **`HttpOnly` + `Secure` + `SameSite=Lax`** 쿠키로 발급한다. 응답 본문에 토큰을 담지 않으며 프론트 스크립트는 읽을 수 없다.
  - 프론트는 `access_token`/`refresh_token`(서버 쿠키명. 과거 이 문서의 `accessToken`/`refreshToken` 표기는 정정 대상)을 저장·직접 다루지 않는다. `Authorization` 헤더를 직접 구성하지 않는다. HttpOnly 쿠키라 프론트 코드 동작에는 영향 없으며, 문서 정확성을 위한 정정이다. <!-- 근거: 08_API_명세.md §1.1 -->
  - Axios는 **`withCredentials: true`**(fetch는 `credentials: 'include'`)만 켠다.
  - Refresh 쿠키는 `Path=/api/core/v1/auth`로 제한된다(재발급·로그아웃 요청에만 실림).
  - Access 쿠키는 `Path=/api/core`(context-path)로 제한된다. API 기본 경로 `/api/core/v1`과는 다른 값이니 `/api/core/v1`로 오인하지 않는다. HttpOnly 쿠키라 프론트 코드 동작에는 영향 없으며, 문서 정확성을 위한 정정이다. <!-- 근거: 08_API_명세.md §1.1 -->
- **소셜 로그인**: **302 리다이렉트 방식**. **기존 "별도 POST 토큰 교환" 방식 및 약관 동의로 가입을 확정하던 흐름은 폐기됨.**
  - 흐름: `window.location.href`로 `/api/core/v1/auth/{provider}/login` 이동(`fetch`/axios 호출 금지 — 페이지 이동이어야 리다이렉트가 동작한다) → 공급자 인증 → 서버 콜백(`GET /auth/{provider}/callback`)에서 활성 `social_account` 있으면 로그인, 없으면 그 시점에 `member`+`social_account` 생성(소셜 인증 성공이 곧 가입 완료) → `Set-Cookie`로 인증 쿠키 발급 후 302로 프론트 복귀.
  - 지원 provider: `google`, `kakao`, `naver`(경로는 소문자).
  - 필수 약관은 **로그인 시작 이전 화면에서 프론트가 안내**하며 서버는 동의 여부를 받지도 저장하지도 않는다(`08_API_명세` 3.2, `11_인증_설계` 5.1).
- **콜백 URL**: 성공 `/auth/callback`, 실패 `/auth/callback?error=OAUTH_FAILED`. 이 값은 `08_API_명세` §3.2에 예시로 명시돼 있다. 복귀 경로는 서버 설정값이며 프론트가 파라미터로 넘기지 않는다(open redirect 방지). 로그인 시작 전 화면으로 되돌리는 처리는 프론트가 담당한다(`sessionStorage` 등에 경로 보관).
- **401 처리**: 프론트가 `POST /auth/refresh` 호출(요청 본문 없음, Refresh 쿠키로 동작).
  - 성공: `204` + 새 Access·Refresh 쿠키 `Set-Cookie`(Refresh도 회전 발급) → 원 요청 재시도.
  - 실패: `401` → 재로그인 화면으로 유도.
  - **회전 발급이므로 재발급 요청은 동시에 하나만 보낸다(single-flight 필수).** 여러 API가 동시에 401을 받아도 재발급은 한 번만 호출하고 나머지는 그 결과를 기다린다 — 개별 호출 시 첫 요청이 토큰을 회전시켜 나머지가 실패하고 사용자가 로그아웃된다.
  - **재발급 요청 자체의 401은 재시도 대상에서 제외**한다(무한 루프 방지).
- **CSRF**: 서버가 `XSRF-TOKEN` 쿠키(비-`HttpOnly`)를 내려주며, 프론트는 상태를 바꾸는 요청(`POST`·`PUT`·`PATCH`·`DELETE`)에 그 값을 **`X-XSRF-TOKEN`** 헤더로 실어 보낸다. `GET` 등 조회 요청은 제외. 헤더 누락·불일치 시 `403`.
- **로그인 상태 확인**: `logged_in=1` 비-`HttpOnly` 쿠키(`Secure`, `SameSite=Lax`, `Path=/`, Refresh와 동일 만료). **UI 힌트 전용이며 인가 판단에 사용 금지 — 실제 인가는 서버가 매 요청 인증 쿠키를 검증해 수행한다.** 앱 시작 시 이 쿠키 존재로 첫 화면(로그인/메인)을 결정할 수 있지만, 이 쿠키가 있다고 권한이 있다고 판단하면 안 되며 실제 데이터 요청에서 401이 오면 재발급(위 항목)으로 정정한다.
- **로그아웃**: `POST /auth/logout` → `204`. Refresh Token 무효화 + Access·Refresh·`logged_in` 쿠키 모두 만료. 해당 세션(Refresh 쿠키로 식별)만 무효화되며 다른 기기 로그인은 유지된다. 쿠키가 없거나 이미 무효해도 `204`(이미 로그아웃 상태를 오류로 취급하지 않음).
- **응답 봉투**: 성공 `{ success: true, data: T }` / 실패 `{ success: false, error: { code, message, fieldErrors, traceId, ...확장필드 } }`(`08_API_명세` 1.6, 11.0 `ApiResponse<T>`).
  - `traceId`는 요청-서버 로그 추적용 문자열. 프론트는 해석하지 않고 그대로 노출·전달만 한다.
  - 일부 `code`는 `error`에 추가 필드를 더한다(예: `DELETE_CONFIRMATION_REQUIRED` → `error.impact`).
  - `204 No Content`는 봉투 없이 본문이 없다. **인증 관련 Endpoint(로그인 시작·콜백의 302, 재발급 성공 204, 로그아웃 204)는 봉투가 적용되지 않는다** — 이 흐름은 HTTP 상태 코드로 판단하고, 오류가 났을 때만 봉투 안의 `error.code`를 본다(`11_인증_설계` 4.3).
- 개인 API는 사용자 ID를 쿼리·바디로 받지 않는다. 서버가 인증 쿠키로 식별한다.
- **내부 사용자 ID(`memberId`)는 어떤 응답에도 포함되지 않는다.** 로그인·마이페이지 요약 등 본인 응답에서도 반환하지 않는다(과거 "로그인 응답에서 본인 memberId만 예외"였던 서술은 폐기됨 — `docs/privacy-rules.md` 확인 필요 항목 참고).
- **상태 코드**: `200` / `201` / `204` / `400` / `401` / `403`(CSRF 토큰 누락·불일치) / `404` / `409` / `422`.
- **권한 실패는 403이 아니라 `404`로 응답한다**(존재 여부 은닉). 타인 비공개 데이터·소유자 전용 자원 접근 포함.
- **시간 형식**: ISO 8601 **UTC**.
- **OpenAPI(Swagger) 제공 예정** → 확정 후 `/v3/api-docs`로 타입 자동 생성 계획.

### 페이지네이션

- **커서 기반**: `{ items, nextCursor, hasNext }`(`data` 안에 담김). 커서는 불투명 문자열(클라이언트가 해석·수정하지 않음). `size` 기본 **20**.
- 세 커서(팔로우 목록 · 책장별 Collection · Record)는 독립적이며 혼용하지 않는다.
- **검색은 페이지네이션하지 않는다.** 유사도 상위 `size`(기본 20) 단일 응답.

### Place · 지도 · 검색

- **장소 검색·지도 렌더링은 프론트가 카카오를 직접 호출한다.** (과거 "BFF 경유로 확정" 서술은 폐기됨 — 백엔드가 "프론트 `.env`에 키 저장, 직접 호출"로 확정했고, `08_API_명세` §2.2/§4.1과도 일치한다.)
  - 장소 검색: 카카오 로컬 API(REST)를 프론트가 직접 호출한다. 검색만으로 내부 Place를 저장하지 않으며, 사용자가 결과에서 장소를 선택해 Record를 생성할 때 그 응답 데이터를 `POST /records`에 담아 전달한다(`08_API_명세` 4.1, 5.1).
  - 지도 렌더링: 카카오 지도 **JS SDK**를 프론트가 직접 로드해서 사용한다.
  - `POST /search/records`(AI 자연어 검색, Record 대상)는 이 항목과 별개다 — 이건 백엔드 API이며 카카오와 무관하다.
- **카카오 키**: JS 키·REST 키 모두 프론트 `.env`에 저장한다(`.gitignore`로 커밋 제외). **보안은 `.gitignore`가 아니라 카카오 개발자 콘솔의 도메인(플랫폼) 등록에 의존한다** — 등록되지 않은 도메인에서는 키가 유출돼도 호출이 거부된다.
- 지도(`GET /records/map`)·검색(`POST /search/records`) 응답의 `bounds`는 `fitBounds`용 **최소 사각형**이다. 결과 없으면 **`null`**, 1개면 sw=ne 점 사각형.

### Record · Context

- **`POST /records`는 `result`로 분기한다.**
  - `RECORD_CREATED` → `201` (내 활성 Record 없음 → Record + 첫 Context 생성)
  - `CONTEXT_ADDED` → `200` (내 활성 Record 존재 → 기존 Record에 Context 추가, `contexts`는 기존 포함 전체)
- **Context 본문 상한은 500자**다. `POST /records`(`contextBody`) · `POST /records/{recordId}/contexts`(`body`) · `PATCH /records/{recordId}/contexts/{contextId}`(`body`) 모두에 적용되며, 초과 시 `400 INVALID_INPUT`(`error.fieldErrors`에 위반 필드)이다. 프론트는 입력 UI에 `maxlength=500`을 걸어 사전에 막는다. <!-- 근거: 06_데이터모델_및_무결성.md §8 -->
- **`GET /records/by-place`는 미저장 시 404가 아니라 `record: null`(200)**이다. 미저장 장소 조회는 정상 흐름.
- **Context 수정 `PATCH .../contexts/{contextId}`는 `200`이며 새 `contextId`를 반환한다.** 프론트는 구 id를 새 id로 교체한다(→ `docs/architecture.md` 4장).
- **Record/Context 삭제는 연쇄 삭제 시 `409` + `impact { recordDeleted, collectionIds }`**를 반환한다. 사용자 확인 후 **`DELETE /records/{recordId}/force`** 호출.
  - Context 삭제: 마지막 Context가 아니면 `204`, 마지막이면 `409`.
  - Record 삭제: 마지막 Record인 Collection이 있으면 `409`, 없으면 `204`.
  - Collection에서 마지막 Record 제거도 `409` → 확인 후 `DELETE /collections/{collectionId}`.

### Collection

- **Collection 상세는 단일 DTO**(`GET /collections/{collectionId}`, Feed·Library·직접 진입 공통).
- **`ownedByMe` 플래그로 소유자/타인을 구분**하고, **타인 조회 시 각 Record의 `contexts`는 `null`**이다.
- **`recordSize` 기본값 1은 의도된 값**(책 넘김 UX). **모바일 = 1, 웹 펼침 = 2**로 명시해서 요청한다. 미전송 시 서버가 1을 주고, 다음 페이지는 `records.nextCursor`로 이어받는다.
- **`recordIds` 배열 상한은 100개**다(`POST /collections`, `POST /collections/{collectionId}/records`). 초과 시 `400 INVALID_INPUT`. Record 추가는 멱등(이미 담긴 Record는 건너뜀)이므로 100개를 넘으면 나눠 호출해도 중복 문제가 없다. <!-- 근거: 05-1_파트간_요구사항.md §1.5 -->

### Follow

- **별칭(`alias`) 수정 `PATCH /follows/{followId}`는 키를 생략한 요청(`{}`)도 값 제거로 처리한다.** 서버는 키 부재와 명시적 `null`을 구분하지 않는다 — 변경된 필드만 모아 보내는 부분 수정 방식을 쓰면 건드리지 않은 `alias`가 지워질 수 있으니, 유지하려면 현재 값을 그대로 실어 보낸다. <!-- 근거: 08_API_명세.md §8.3 -->

### Feed 이벤트

- `GET /feed/collections` 응답 최상위에 `requestId`, 각 item에 `position`이 존재한다.
- `POST /feed/events`는 **`CLICK`·`SAVE` 두 가지만 프론트가 전송**한다. **`IMPRESSION`은 서버가 목록 응답 생성 시 기록**한다(프론트가 보내지 않는다).
- 이벤트 전송 시 다음 3가지를 반드시 지킨다.
  1. **Keyword의 키는 `label`이 아니라 `code`(불변 식별자)다.** `label`은 표시용이라 변경될 수 있다.
  2. **`position`은 배열 인덱스가 아니라 응답 값을 그대로 사용한다**(2페이지 첫 항목은 `0`이 아니다).
  3. **`requestId`는 응답 단위다.** 페이지를 넘기면 새 값이며, 그 페이지에서 발생한 이벤트는 그 페이지의 `requestId`를 쓴다.
- **`events` 배열 상한은 100개**다. 초과 시 `400 INVALID_INPUT`. (단건→배열 배치 전송으로의 요청 스키마 변경 자체는 이번 반영 범위 밖 — 별도 확인 예정) <!-- 근거: 05-1_파트간_요구사항.md §1.5 -->

### AI 검색 · Keyword

- **자연어 검색 응답 시간**: 정상 0.5~~1초, 최악 2~~3초, 장애 시 5~10초 타임아웃.
  - UI: 0~1.5초 스피너 → 1.5초 경과 후 "맥락을 분석하고 있어요" 문구 → 타임아웃 시 에러 처리.
- **Keyword 생성**: 정상 2초 이내 완료. 폴링은 저장 후 **3초·8초 2회만** 재조회하고 중단한다. **무한 폴링 금지** — 실패 복구는 분 단위로 이뤄져 폴링으로는 잡을 수 없다.
- **`keywords` 빈 배열은 정상**이다(COMPLETED 0건 포함). 실패로 처리하지 않는다.
- 현재 응답은 **실패 / 처리중 / 정상 0건을 구분하지 못한다**(A안 현행 유지).
- **[확인 필요]** AI 파생 데이터 삭제 정책이 origin에서 '즉시 파기' → '무효화 표시(`is_deleted`/`CANCELLED`)'로 변경됨(`05_AI_설계.md` §11). `docs/privacy-rules.md` 영향 여부 미확인 — 이 문서에서는 반영하지 않았다.

### Keyword 등급 (MVP)

- **MVP에서는 Keyword 등급(`visibility`)을 사용하지 않는다.** 모든 Keyword를 `PUBLIC`처럼 취급하고 등급 구분 UI를 만들지 않는다.
- 응답은 **현행 `label` 문자열 배열**을 사용한다.
- `{ code, label, visibility }` 형태는 AI 파트가 확장용으로 보유하나 **MVP 범위 밖**이다.
- 단, 프론트가 Keyword를 내부 키로 다뤄야 하는 경우(아이콘 매핑·필터 상태)에는 `label`이 아니라 **향후 도입될 `code`**를 쓰도록 설계 여지를 남긴다.

## [협의 필요]

> 이 섹션은 임의로 채우지 않는다. 확정 전까지 구현에서 확정된 것으로 가정하지 않는다.

1. **프론트/API 운영 도메인이 실제로 같은 오리진인지** — reference 문서(`11_인증_설계` §7.1)는 Traefik이 한 호스트에서 경로 기반(`/` → 프론트, `/api/core/` → 서버)으로 라우팅해 **이미 same-origin으로 정리**했고, 그 결과 "CORS 설정 불필요·`SameSite=None` 불필요"라고 명시한다. 문서상으로는 확정처럼 보이지만, 실제 배포 인프라(Traefik 라우팅 실측)가 이 문서대로 구성됐는지 인프라 파트 확인이 아직 없어 이 항목은 [협의 필요]로 유지한다. **인프라 실측이 확인되면 [확정]으로 승격 검토.**
   - 로컬 개발은 포트가 달라도 **same-site**라 `SameSite=Lax` 쿠키는 정상 전송되지만, **origin은 다르므로 로컬 개발 환경에서만 CORS 설정이 필요**하다(`11_인증_설계` §7.3). 운영에는 해당하지 않는다.
2. **카카오 검색 프록시 API** — BFF 경유 방식은 확정, 엔드포인트 경로·요청/응답 스키마는 명세 대기.
3. **Collection 내부 Record 정렬** — 정책(오름차순) vs 구현(`created_at DESC`) 충돌. 프론트는 서버 응답 순서를 그대로 쓰므로 코드 영향은 없다. 문서 정리는 백엔드/기획 대기.
4. **provider 대소문자** — 경로는 소문자(`kakao`), 응답은 대문자(`KAKAO`). 타입은 대문자로 두고 경로 조립 시 `toLowerCase()`로 매핑한다.

### 이번에 [협의 필요]에서 제거(확정으로 흡수)됨

- ~~BFF 세부 계약~~ → BFF 별도 계층 없음. Spring 단일 앱이 BFF+리소스서버 겸함(위 [확정] 참고).
- ~~소셜 로그인 토큰 교환 엔드포인트~~ → 토큰 교환 방식 자체가 폐기되고 302 리다이렉트 방식으로 대체됨(위 [확정] 참고).
- ~~refreshToken 저장 위치~~ → 쿠키(서버가 `HttpOnly`+`Secure`+`SameSite=Lax`로 관리, 프론트는 저장하지 않음).
- ~~Context 본문 최대 길이~~ → **확정: 500자.** 위 [확정] > Record · Context 섹션 참고. <!-- 근거: 06_데이터모델_및_무결성.md §8 -->
