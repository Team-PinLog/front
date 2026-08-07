# API 계약

> 기준: docs 레포 `static/` (2026-08-05 doc-sync, 원본 HEAD `b82c75e` / PR #49 `docs/collection-cover-spec` 반영). 원본 사본은 `docs/reference/`.
> 아래 [확정]만 근거로 구현한다. [협의 필요]는 확정된 것처럼 구현하지 않는다. 문서에 없는 엔드포인트·필드는 추측해서 채우지 않는다.

## [확정]

### 공통

- **base path**: `/api/core/v1` (context-path `/api/core` + 버전 `v1`을 합친 값). `VITE_API_BASE_URL`에 이 값을 넣는다(`08_API_명세` 최상단).
- **운영은 same-origin이다.** Traefik이 한 호스트에서 경로 기반으로 라우팅한다(`/` → 프론트, **`/api/core/`** → 백엔드). 따라서 운영에는 **CORS 설정도 `SameSite=None`도 필요 없다**(`11_인증_설계` §7.1). <!-- 2026-08-05 운영 실측으로 [협의 필요]에서 승격 -->
  - 실측: `https://pin-log.com/api/core/v1/records/map` → `401` + 백엔드 봉투. 프론트를 서빙하는 같은 호스트에서 백엔드가 응답한다.
  - **프리픽스는 `/api/core/v1`이 아니라 `/api/core/`다.** `v1` 밖의 백엔드 경로(예: 장소 썸네일 `/api/core/images/…`)도 그대로 도달한다.
  - 로컬 개발은 포트가 달라도 **same-site**라 `SameSite=Lax` 쿠키는 정상 전송되지만, **origin은 다르므로 로컬에서만 CORS 설정이 필요**하다(`11_인증_설계` §7.3). 운영에는 해당하지 않는다.
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
  - **single-flight는 탭·창 사이에서도 하나로 묶는다.** 인증 쿠키는 오리진 단위로 탭이 공유하므로, 탭마다 따로 묶으면 두 탭이 같은 Refresh 토큰으로 동시에 회전시켜 위와 같은 결과가 된다(`11_인증_설계` 4.4). <!-- 근거: 11_인증_설계.md §4.4 -->
  - **재발급 요청 자체의 401은 재시도 대상에서 제외**한다(무한 루프 방지). 이 `401` 응답이 **인증 쿠키 세 개(`access_token`·`refresh_token`·`logged_in`)를 함께 만료**시키므로, 클라이언트가 표시 쿠키를 따로 정리하지 않아도 된다.
  - **`503`은 재발급 대상이 아니다.** 자격증명을 거절한 것이 아니라 **인증 여부를 확인하지 못한** 상태라(조회 계층 일시 장애 등) 재발급해도 같은 결과가 반복된다. 세션을 버리지 말고 잠시 후 재시도하거나 오류를 표시한다 — `401`과 `503`을 같은 분기로 묶으면 일시적 장애가 전체 로그아웃으로 번진다. <!-- 근거: 11_인증_설계.md §4.4·§5.2 -->
- **CSRF**: 서버가 `XSRF-TOKEN` 쿠키(비-`HttpOnly`)를 내려주며, 프론트는 상태를 바꾸는 요청(`POST`·`PUT`·`PATCH`·`DELETE`)에 그 값을 **`X-XSRF-TOKEN`** 헤더로 실어 보낸다. `GET` 등 조회 요청은 제외. 헤더 누락·불일치 시 `403`.
- **로그인 상태 확인**: `logged_in=1` 비-`HttpOnly` 쿠키(`Secure`, `SameSite=Lax`, `Path=/`, Refresh와 동일 만료). **UI 힌트 전용이며 인가 판단에 사용 금지 — 실제 인가는 서버가 매 요청 인증 쿠키를 검증해 수행한다.** 앱 시작 시 이 쿠키 존재로 첫 화면(로그인/메인)을 결정할 수 있지만, 이 쿠키가 있다고 권한이 있다고 판단하면 안 되며 실제 데이터 요청에서 401이 오면 재발급(위 항목)으로 정정한다.
- **로그아웃**: `POST /auth/logout` → `204`. Refresh Token 무효화 + Access·Refresh·`logged_in` 쿠키 모두 만료. 해당 세션(Refresh 쿠키로 식별)만 무효화되며 다른 기기 로그인은 유지된다. 쿠키가 없거나 이미 무효해도 `204`(이미 로그아웃 상태를 오류로 취급하지 않음).
- **응답 봉투**: 성공 `{ success: true, data: T }` / 실패 `{ success: false, error: { code, message, fieldErrors, traceId, ...확장필드 } }`(`08_API_명세` 1.6, 11.0 `ApiResponse<T>`).
  - `traceId`는 요청-서버 로그 추적용 문자열. 프론트는 해석하지 않고 그대로 노출·전달만 한다.
  - 일부 `code`는 `error`에 추가 필드를 더한다(예: `DELETE_CONFIRMATION_REQUIRED` → `error.impact`).
  - `204 No Content`는 봉투 없이 본문이 없다. **인증 관련 Endpoint(로그인 시작·콜백의 302, 재발급 성공 204, 로그아웃 204)는 봉투가 적용되지 않는다** — 이 흐름은 HTTP 상태 코드로 판단하고, 오류가 났을 때만 봉투 안의 `error.code`를 본다(`11_인증_설계` 4.3).
- 개인 API는 사용자 ID를 쿼리·바디로 받지 않는다. 서버가 인증 쿠키로 식별한다.
- **내부 사용자 ID(`memberId`)는 어떤 응답에도 포함되지 않는다.** 로그인·마이페이지 요약 등 본인 응답에서도 반환하지 않는다(과거 "로그인 응답에서 본인 memberId만 예외"였던 서술은 폐기됨 — `docs/privacy-rules.md` 확인 필요 항목 참고).
- **상태 코드**: `200` / `201` / `204` / `400` / `401` / `403`(CSRF 토큰 누락·불일치) / `404` / `409` / `422` / `500`(서버 결함 — 재시도해도 같은 결과) / `503`(일시적 처리 불가 — 재시도로 풀릴 수 있음). `500`·`503`도 공통 봉투를 따르며 `error.code`로 원인을 구분한다. **두 코드는 재시도 가부로 갈리므로 같은 분기로 묶지 않는다.** <!-- 근거: 08_API_명세.md §1.5 -->
- **권한 실패는 403이 아니라 `404`로 응답한다**(존재 여부 은닉). 타인 비공개 데이터·소유자 전용 자원 접근 포함.
- **시간 형식**: ISO 8601 **UTC**.
- **OpenAPI(Swagger) 제공 예정** → 확정 후 `/v3/api-docs`로 타입 자동 생성 계획.

### 페이지네이션

- **커서 기반**: `{ items, nextCursor, hasNext }`(`data` 안에 담김). 커서는 불투명 문자열(클라이언트가 해석·수정하지 않음). `size` 기본 **20**.
- 세 커서(팔로우 목록 · 책장별 Collection · Record)는 독립적이며 혼용하지 않는다.
- **커서는 발급받은 정렬 방향에서만 유효하다.** 정렬 방향 파라미터를 두는 목록(`5.2`·`7.2`·`7.3`·`8.1`·`9.2`·`9.3`)에서 방향을 바꿀 때는 커서 없이 첫 페이지부터 다시 요청한다. <!-- 근거: 08_API_명세.md §1.4 -->
  - ⚠️ **서버가 커서-방향 불일치를 검증하지 않는다.** 커서는 `Base64(정렬키, id)`라 방향 정보가 아예 없다 — 다른 방향에서 받은 커서를 넣으면 형식이 유효해 `400`을 낼 근거가 없고, 오류 없이 **조용히 어긋난 페이지**가 돌아온다.
  - **이것은 "고쳐지길 기다리는 버그"가 아니라 back의 의도적 보류 결정이다**(`BD-46-list-sort-default-asc-with-params.md`, back #168). 정렬 파라미터를 프론트가 상수로 고정해 보낸다는 전제 위에서 안전한 구조이고, **back 후속 작업은 계획돼 있지 않다.** 해소 일정을 기다릴 대상이 아니다.
  - 따라서 **정렬 파라미터는 사용자 노출 토글이 아니라 프론트가 상수로 고정해 보내는 값**으로 취급한다. 정렬 방향을 바꾸려면 **프론트 상수 한 줄을 바꿔 배포**하면 되고 back 관여가 없다.
  - **재검토 트리거는 "정렬을 사용자 노출 토글로 만드는 순간"이다.** 한 사용자가 페이지를 넘기다 방향을 바꿀 수 있게 되면 전제가 깨진다. 그 기능이 필요해지면 **먼저 back에 "커서에 방향을 싣고 불일치를 400으로 거절" 작업을 요청**해야 한다(BD-46이 선행 조건으로 지정). 그전까지 토글 UI를 만들지 않는다.
  - 프론트가 상수를 바꿔 배포하는 순간, 이전 방향의 커서를 쥔 클라이언트는 **한 번** 어긋난 페이지를 받는다. 일회성이고 목록 재진입으로 사라지므로 별도 처리를 두지 않는다(BD-46이 감수하기로 한 범위).
- **검색은 페이지네이션하지 않는다.** 유사도 상위 `size`(기본 20) 단일 응답.

### Place · 지도 · 검색

> **"장소 검색"이라는 말이 가리키는 대상이 세 가지다. 서로 다른 API이므로 섞지 않는다.**
>
> | 무엇을 찾는가                      | 어디에 묻는가                        | 쓰는 화면                          |
> | ---------------------------------- | ------------------------------------ | ---------------------------------- |
> | **세상의 장소**(아직 내 기록 없음) | 카카오 로컬 API — 프론트가 직접 호출 | Record 생성 시 장소 고르기         |
> | **내 기록 안의 장소**              | `GET /records/map?keyword=` — 서버   | 지도 검색, 컬렉션 만들기 장소 선택 |
> | **내 기록의 맥락**(자연어)         | `POST /search/records` — 서버(AI)    | AI 자연어 검색                     |

- **세상의 장소 검색·지도 렌더링은 프론트가 카카오를 직접 호출한다.** (과거 "BFF 경유로 확정" 서술은 폐기됨 — 백엔드가 "프론트 `.env`에 키 저장, 직접 호출"로 확정했고, `08_API_명세` §2.2/§4.1과도 일치한다.)
  - 장소 검색: 카카오 로컬 API(REST)를 프론트가 직접 호출한다. **아직 내 기록이 없는 장소를 발견하는 용도**다. 검색만으로 내부 Place를 저장하지 않으며, 사용자가 결과에서 장소를 선택해 Record를 생성할 때 그 응답 데이터를 `POST /records`에 담아 전달한다(`08_API_명세` 4.1, 5.1).
  - 지도 렌더링: 카카오 지도 **JS SDK**를 프론트가 직접 로드해서 사용한다.
- **내 기록 안에서의 장소 검색은 카카오가 아니라 서버 `GET /records/map?keyword=`다.** 카카오 로컬 API로 대신하지 않는다 — 카카오는 내가 무엇을 기록했는지 모른다. <!-- 근거: 08_API_명세.md §4.2·§13.11 -->
  - `keyword`는 장소명(`name`) **또는** 주소(`address`)에 대한 부분 일치이며 대소문자를 무시한다. `%`·`_`는 와일드카드가 아니라 문자 그대로 검색된다.
  - 생략하거나 빈 문자열·공백뿐이면 필터하지 않는다.
  - bbox와 **독립적으로 조합**된다(AND). bbox의 "모두 주거나 모두 생략" 규칙에 `keyword`는 포함되지 않는다 — `keyword`만 단독으로 보낼 수 있다.
  - `items`는 장소명 오름차순(동명이면 `recordId` 오름차순)으로 정렬돼 온다. 프론트는 재정렬하지 않는다.
  - **컬렉션 만들기의 장소 선택 화면도 별도 API 없이 이 엔드포인트를 목록으로 재사용한다**(`08_API_명세` 13.11).
- `POST /search/records`(AI 자연어 검색, Record 대상)는 위 둘과 또 별개다 — 백엔드 API이며 카카오와 무관하고, 장소명이 아니라 Context 맥락을 찾는다.
- **카카오 키**: JS 키·REST 키 모두 프론트 `.env`에 저장한다(`.gitignore`로 커밋 제외). **보안은 `.gitignore`가 아니라 카카오 개발자 콘솔의 도메인(플랫폼) 등록에 의존한다** — 등록되지 않은 도메인에서는 키가 유출돼도 호출이 거부된다.
- 지도(`GET /records/map`)·검색(`POST /search/records`) 응답의 `bounds`는 `fitBounds`용 **최소 사각형**이다. 결과 없으면 **`null`**, 1개면 sw=ne 점 사각형.

### 이미지 기반 장소 제안 (`POST /places/suggestions`)

> ⚠️ **이 절의 근거는 원본 `08_API_명세`가 아니라 front#109다.** Collection 표지 생성 절(§"Collection 표지 생성")과 같은 패턴 — 원본 문서에 이 엔드포인트가 아직 없고, 스키마가 바뀌면 이 문서가 아니라 그 이슈가 기준이다. 이 엔드포인트는 Core API 소속이라(`/image/api/*`와 달리) `httpClient`를 그대로 쓴다.

<!-- 근거: front#109, S15P11A705-344 -->

- **목적**: 대화 캡처 이미지 1장에서 장소명 후보를 AI가 추출하고, 후보마다 카카오 로컬 검색 결과를 붙여 함께 내려준다. 위 "세 가지 장소 검색" 표에는 없는 **네 번째 경로**다 — 카카오도 `GET /records/map`도 아니고, 이미지 한 장에서 장소를 **발견**하는 용도다. 사용자가 최종 확인·수정한 뒤 기존 `POST /records`로 저장한다. **AI 결과만으로 자동 저장되지 않는다.**
- **요청**: `multipart/form-data`, 필드명 `image`, 이미지 **1장만**, **JPEG/PNG만**, **최대 5 MiB**(front#109). 기존 로그인 쿠키+CSRF 흐름을 그대로 쓴다 — 별도 인증 방식이 없다.
  - `httpClient`는 기본 헤더로 `Content-Type: application/json`을 고정하므로, 이 요청만은 `headers: { 'Content-Type': undefined }`로 재정의해야 브라우저가 multipart boundary를 자동으로 붙인다(`suggestPlacesFromImage.ts`).
  - 프론트 자체 제한(5MB, JPG/PNG, `PlaceRecordSheet.tsx`)은 front#109의 서버 제한과 **값이 일치한다.** 완화·강화 논의 없이 프론트 제한을 서버 제한과 다르게 바꾸지 않는다.
- **응답 스키마**(프론트 Zod, `src/features/places/api/suggestPlacesFromImage.ts` 기준):

  ```typescript
  type PlaceSuggestionResponse = {
    requestId: string;
    candidates: Array<{
      candidateId: string;
      extracted: {
        placeName: string;
        regionHints: string[];
        branchHint: string | null;
        evidence: string[];
        contextSuggestion: string | null;
      };
      kakaoSearch: {
        status: 'SUCCESS' | 'NO_RESULTS' | 'FAILED';
        query: string;
        items: SuggestedKakaoPlace[]; // 후보당 최대 3개(front#109)
      };
    }>; // 최대 3개(front#109)
    warnings: Array<{ code: string; message: string; candidateId: string | null }>;
  };
  ```

- **`warnings[].code` 값**(front#109, 확정):
  | `code`                         | 의미                                                              |
  | ------------------------------ | ----------------------------------------------------------------- |
  | `NO_PLACE_CANDIDATES`          | 이미지에서 추출된 장소 후보가 없음                                |
  | `KAKAO_SEARCH_PARTIAL_FAILURE` | 일부 후보의 카카오 검색이 실패함                                  |
  | `KAKAO_PLACE_NOT_RECORDABLE`   | 저장 API의 제약(길이 제한 등)으로 쓸 수 없는 카카오 후보가 제외됨 |
- **요청 자체가 거부되는 HTTP 오류**(front#109, 확정 — 공통 [확정]의 응답 봉투를 따른다): `400 INVALID_IMAGE_COUNT`·`400 INVALID_IMAGE`·`413 IMAGE_TOO_LARGE`·`415 UNSUPPORTED_MEDIA_TYPE`·`502 PLACE_SUGGESTION_UPSTREAM_ERROR`·`503 PLACE_SUGGESTION_UNAVAILABLE`·`503 PLACE_SUGGESTION_BUSY`·`504 PLACE_SUGGESTION_TIMEOUT`. 내부 오류를 그대로 노출하지 않고 재시도 또는 수동 검색 유도 문구로 안내한다.

이 엔드포인트와 관련해 아직 근거가 없어 [협의 필요]로 남긴 항목은 문서 하단 [협의 필요] 목록의 3·4번을 참고한다.

### [확정] 지도 마커 조회 응답에 latestCollectionId 추가

- 대상 엔드포인트: `GET /records/map`(지도 마커 목록 조회)
- 기존 응답 필드: `recordId, placeId, name, lat, lng`
- 추가 필드: **`latestCollectionId`**(`number | null`) — 그 Record가 **가장 최근에 담긴** Collection의 id. "가장 최근"의 기준은 컬렉션 내부 정렬과 같은 **담은 시각**이며, 컬렉션에서 **뺀(삭제된) 연결은 판단에서 제외**된다. 어느 Collection에도 담기지 않은 Record는 `null`이다. <!-- 근거: 08_API_명세.md §4.2 -->
  - ⚠️ 필드명은 `collectionId`가 **아니다.** 2026-08-04 doc-sync 이전 이 문서와 프론트 Zod 스키마가 `collectionId`로 적혀 있었고, 그대로면 파싱이 조용히 `undefined`가 되어 모든 마커가 "미분류" 색으로 떨어진다.
  - 한 Record가 여러 Collection에 담길 수 있으나 이 필드는 **단일 값**이다. 마커 색은 "그 Record가 속한 모든 Collection"이 아니라 "가장 최근 것 하나"를 나타낸다.
- 프론트 처리: `latestCollectionId` 기반 해시로 마커 asset(색) 결정, `null`이면 별도 고정 asset(미분류) 적용. 구현은 `getRecordMarkerAsset`(S15P11A705-307).
- **back 구현은 아직 머지되지 않았다** — back PR #191(`S15P11A705-308`)이 2026-08-04 기준 **OPEN**이다. 그래서 프론트 Zod 스키마는 이 필드를 **optional로 받는다**(필드가 없거나 명시적 `null`이면 동일하게 "미분류"로 취급). 현재 지도 마커가 전부 미분류 색으로 보이는 것은 **정상**이며, #191이 머지·배포된 뒤에야 색이 갈린다. 그 시점에 optional 제거를 검토한다.

### 회원 탈퇴 — 2단계

> **`DELETE /me`는 더 이상 "탈퇴 완료"가 아니다.** `204`(완료) → **`200` + 이동할 곳**으로 바뀌었다. 엔드포인트·메서드는 그대로다. <!-- 근거: 08_API_명세.md §3.6, 06_데이터모델_및_무결성.md §6.9 -->
>
> **프론트 대응 완료** — front #97, back #181(`S15P11A705-285`, 머지됨). `deleteAccount` 응답 파싱 · `WithdrawConfirmDialog` 페이지 이동 · `handleOAuthCallback`의 `WITHDRAWAL_*` 분기까지 반영돼 있다.

탈퇴는 두 단계이며, **공급자 연결 해제가 선행되고 그것이 성공한 경우에만** 데이터가 삭제된다.

```text
1. DELETE /api/core/v1/me           → 200 { authorizationUrl }
2. 프론트가 그 URL로 페이지 이동      → 공급자 인가 화면
3. 공급자 → GET /auth/{provider}/callback
     → 서버: 연결 해제 → 성공 시에만 삭제 수행 → /auth/callback 으로 302
```

- **1단계는 아직 아무것도 삭제하지 않는다.** "탈퇴가 완료되었습니다"를 여기서 띄우면 거짓말이 된다.
- **`authorizationUrl`은 `window.location`으로 페이지 이동한다.** `fetch`/axios로 호출하면 공급자 화면이 사용자에게 보이지 않는다(로그인 시작과 같은 이유 — 위 소셜 로그인 항목).
- **이 URL을 해석하지 않는다.** 서버 경로일 수도 공급자 절대 URL일 수도 있다. 프론트는 이동만 한다.
- 공급자는 서버가 `social_account`로 판단한다. 프론트가 지정하지 않는다.
- 되돌릴 수 없으므로 **1단계 이전에 확인 절차를 둔다**(현행 `WithdrawConfirmDialog`).

1단계 오류:

| 상태  | `code`                     | 상황                                      |
| ----- | -------------------------- | ----------------------------------------- |
| `401` | `UNAUTHORIZED`             | 인증되지 않았거나 해제할 소셜 계정이 없다 |
| `409` | `WITHDRAWAL_NOT_SUPPORTED` | 소셜 계정이 둘 이상이다                   |

복귀 경로는 **로그인과 같은 `/auth/callback`**이다. 별도 복귀 경로를 두지 않는다 — 성공한 경우 인증 쿠키와 표시 쿠키가 이미 만료된 상태로 착지하므로 기존 앱 시작 흐름이 그대로 로그인 화면으로 보낸다.

| 결과                                            | `?error=`                     |
| ----------------------------------------------- | ----------------------------- |
| 연결 해제 성공 → 삭제 완료                      | 없음                          |
| 사용자가 공급자 화면에서 취소                   | `WITHDRAWAL_CANCELLED`        |
| 연결 해제 실패(공급자 장애 등)                  | `WITHDRAWAL_FAILED`           |
| 해제 대상을 판정하지 못함                       | `WITHDRAWAL_UNLINK_FAILED`    |
| 인증된 공급자 계정이 탈퇴 요청 회원의 것과 다름 | `WITHDRAWAL_ACCOUNT_MISMATCH` |

- **실패한 경우 아무것도 삭제되지 않는다.** 회원 데이터가 그대로 남고 세션도 유지되므로 사용자는 다시 시도할 수 있다 — 실패 문구는 "탈퇴에 실패했습니다. 계정은 그대로입니다"에 해당하는 의미여야 하며, 로그인 실패(`OAUTH_FAILED`)와 같은 문구로 묶지 않는다.
- 사용자가 공급자 화면에서 이탈해 돌아오지 않으면 아무 일도 일어나지 않는다.

### DTO — `PlaceSummary`

```typescript
type PlaceSummary = {
  placeId: number;
  kakaoPlaceId: string;
  name: string;
  address: string;
  roadAddress: string | null;
  phone: string | null;
  placeUrl: string | null;
  thumbnailUrl: string | null;
  lat: number;
  lng: number;
};
```

- back 구현 **머지 완료**(back #184 `S15P11A705-305`, 2026-08-04). `PlaceSummaryResponse`를 쓰는 **모든 응답**에 실린다 — Record 상세뿐 아니라 Collection 상세도 포함이다.
- **`thumbnailUrl`은 `null`일 수 있으나 필드가 생략되지는 않는다.** `null`이거나 이미지 로드에 실패하면 기본 이미지로 폴백한다. <!-- 근거: 08_API_명세.md §11.1 -->
- **4:3 비율**로 제공된다. `aspect-ratio: 4 / 3` + `object-fit: cover`로 표시하면 로딩 전 영역이 확보되고 폭에 적응한다.
- 현 단계 값은 같은 오리진의 절대 경로(`/api/core/images/places/…`)다. 이후 카카오 이미지 검색 API 전환 시 같은 필드에 외부 절대 URL이 들어가며 **프론트 계약은 바뀌지 않는다**. **`VITE_API_BASE_URL`(`/api/core/v1`)을 앞에 붙이지 않는다** — 이 경로는 `v1` 밖이다.
- ⚠️ **당분간 값은 사실상 전부 `null`이다. 폴백 이미지가 기본 화면이라고 보고 디자인해야 한다.** 시연용 목업 단계라 두 가지가 아직 남아 있다 — (1) 이미지 파일이 back의 `src/test/resources`에만 있어 **배포 산출물에 실리지 않는다**(표지 확정 후 `src/main/resources`로 커밋 예정), (2) place에 이미지를 잇는 **UPDATE SQL이 미실행**이다(배포 DB 쓰기 권한을 infra#189에서 요청 중).
- **라우팅은 실측으로 확인됐다** — 운영에서 `/api/core/images/places/cafe-1.jpg`를 호출하면 프론트 nginx의 맨몸 404가 아니라 **백엔드 봉투**(`{"success":false,"error":{"code":"RESOURCE_NOT_FOUND"...}}`)가 돌아온다. Traefik이 `/api/core/v1`이 아니라 **`/api/core/` 프리픽스**로 넘긴다는 뜻이라 이 경로는 백엔드에 도달한다. 인증도 막히지 않는다(back `SecurityConfig`의 `/images/places/**` permitAll). 현재 404인 이유는 라우팅이 아니라 **이미지 파일이 아직 배포 산출물에 없어서**다(위 항목). <!-- 2026-08-05 운영 실측 -->
  - 로컬은 vite dev proxy가 `/api` 전체를 넘기므로 이 경로가 따로 문제 되지 않는다.

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
- **`GET /records/recent`** — 최근 7일 안에 만든 **내** Record 목록(홈 최근 기록 카드). 기간(7일)과 정렬(`createdAt` 내림차순, 동시각은 `recordId` 내림차순)은 **서버 고정**이라 파라미터가 없다 — 프론트가 재계산·재정렬하지 않는다. 쿼리는 `cursor`/`size`뿐이며 `size` 기본 1, 100 초과는 100으로 접힌다. 항목은 `RecentRecordCard`(`recordId`·`place: PlaceSummary`·`keywords: string[]`·`createdAt`)로 **`contexts` 필드 자체가 없다** — 본문이 필요하면 `recordId`로 상세(5.2)를 재조회한다. `keywords`는 없으면 `null`이 아니라 `[]`이고 `keywordStatus`가 없어 'AI 판정 전'과 '0건'을 구분하지 않는다(둘 다 정상). 7일 내 기록이 없으면 404가 아니라 `items: []`인 200이다. <!-- 근거: 08_API_명세.md §5.9·§11.5·§13.13 -->

### Collection

- **Collection 상세는 단일 DTO**(`GET /collections/{collectionId}`, Feed·Library·직접 진입 공통).
- **`ownedByMe` 플래그로 소유자/타인을 구분**하고, **타인 조회 시 각 Record의 `contexts`는 `null`**이다.
- **`recordSize` 기본값 1은 의도된 값**(책 넘김 UX)이며, 미전송 시 서버가 1을 준다. 다음 페이지는 `records.nextCursor`로 이어받는다.
- **⚠️ `recordSize`(요청 크기)와 화면 펼침 단위는 별개다.** 펼침 단위를 그대로 요청 크기로 쓰지 않는다 — 요청은 크게 보내고 받아둔 Record 안에서 로컬 인덱스로 넘긴다. <!-- 근거: front#92 -->
  - Collection 상세는 지도가 전체 Record의 핀을 한 번에 보여줘야 해서 진입 시 `hasNext`가 끝날 때까지 전부 받는다. 요청 크기가 작으면 그만큼 요청이 **직렬로** 쌓인다(Record 27개 → 14회, 배포 환경 약 4초).
  - 서버는 값을 그대로 존중하고 **상한 100**으로만 자른다. 현재 프론트는 **30**을 보낸다(`useCollectionDetailQuery`).
- **`recordIds` 배열 상한은 100개**다(`POST /collections`, `POST /collections/{collectionId}/records`). 초과 시 `400 INVALID_INPUT`. Record 추가는 멱등(이미 담긴 Record는 건너뜀)이므로 100개를 넘으면 나눠 호출해도 중복 문제가 없다. <!-- 근거: 05-1_파트간_요구사항.md §1.5 -->
- **Collection 내부 Record 정렬 기본값은 담은 순 오름차순(오래된 것부터)**이다 — `collection_records.created_at ASC`, 동률이면 `id ASC`. `recordSort=ADDED_AT_DESC`로 최신순을 요청할 수 있다(`08_API_명세` 7.3). 과거 "정책(오름차순) vs 구현(`created_at DESC`) 충돌"은 오름차순 기본으로 해소됐다. <!-- 근거: 08_API_명세.md §7.3·§14-8, 06_데이터모델_및_무결성.md §2.7, 10_MVP_기능범위.md -->
  - Collection 목록(`7.2`·`9.3`)과 공개 책장(`8.1`)도 같은 규칙이다 — 기본 ASC, `sort`로 최신순.
  - 각 Record 안의 `contexts`는 `recordSort`와 **무관하게 항상 `createdAt` 오름차순**이다.
  - 프론트는 이 정렬 파라미터를 **상수로 고정해** 보낸다(위 페이지네이션 항목의 BD-46 제약).

#### 표지 이미지 `coverImageUrl`

<!-- 근거: 08_API_명세.md §7.1·§7.4·§7.7, 06_데이터모델_및_무결성.md §2.6, 05-1_파트간_요구사항.md §1.6·§3.1 -->

- **Collection이 실리는 모든 응답에 포함되고, `null`이어도 필드가 생략되지 않는다** — 생성(7.1)·내 목록(7.2)·상세(7.3)·공개 책장(8.1)·팔로우 책장(9.2·9.3)·Feed(10.1). **`null`은 표지가 없는 정상 상태다.** `null`이거나 이미지 로드에 실패하면 기본 표지로 폴백하고 **오류·로딩 실패로 처리하지 않는다**(`keywords: []`와 같은 계열의 규칙).
- **`POST /collections` 요청에는 표지 필드가 없다.** 생성 직후 값은 항상 `null`이고, 표지가 확정된 뒤 `PATCH`로 등록한다.
  - **생성 버튼을 표지 완성에 묶지 않는다.** 표지 생성은 GPU 비동기 잡이라 큐 상황에 따라 수십 초가 걸린다. 기다리면 생성 버튼이 생성 큐에 묶인다.
  - 사용자가 화풍 선택 전에 이탈해 **표지 없는 Collection이 남는 것도 정상**이다. 이후 등록·교체할 진입점을 제공한다.
- **`PATCH /collections/{collectionId}`는 제목·표지 부분 수정이다.** `title`·`coverImageUrl` 둘 다 선택이지만 **둘 다 없으면 `400`**이다.
  - **보내지 않은 필드와 `null`로 보낸 필드 모두 기존 값을 유지한다** — 제목만 고쳐도 표지가 지워지지 않는다. 별칭 `PATCH`와 규칙이 정반대이니 **§ Follow의 대비표를 반드시 확인한다.**
  - **표지 제거(비우기)는 제공하지 않는다.** 등록·교체만 있으므로 **제거 UI를 만들지 않는다.** 필요해지면 `DELETE /collections/{collectionId}/cover`가 별도로 생긴다.
  - 재등록(교체)도 같은 필드로 처리한다. 교체 전용 API를 따로 두지 않는다.
- **값 형식은 같은 오리진 상대 경로뿐이다.** 패턴 `^/image/files/[A-Za-z0-9._-]+\.webp$`(최대 300자)를 벗어나는 값(외부 절대 URL·다른 경로·다른 확장자)은 `400 INVALID_INPUT`이다.
  - **`VITE_API_BASE_URL`을 앞에 붙이지 않는다** — `/api/core/v1` 바깥의 경로다. 응답 값을 그대로 `<img src>`에 넣는다.
  - 서버는 패턴만 검사하고 **파일의 실제 존재는 확인하지 않는다**(확인하려면 core가 이미지 서비스에 결합된다). 그러므로 프론트는 이미지 서비스 상태 폴링에서 `final.status: "done"`으로 확인한 `final.url`만 보낸다.
- **비율은 세로 2:3**이다(미리보기 512×768, 최종본 1795×2657, 둘 다 WebP). 장소 썸네일 `PlaceSummary.thumbnailUrl`의 4:3과 다르므로 **같은 표시 컴포넌트로 묶지 않는다.**
- 파일은 이미지 서비스가 PVC(`local-path-retain`)에 보관·서빙하며 삭제 경로가 없는 것이 확인됐다(2026-08-05). 다만 **정리 배치가 새로 생기면 저장된 표지가 깨질 수 있다** — 그 시점에 이미지 서비스가 먼저 알리기로 되어 있다.

### Follow

- **`GET /follows`가 팔로우 항목마다 그 책장의 Collection 첫 페이지를 동봉한다.** `collectionSize`·`collectionSort` 쿼리로 제어하며, Library 첫 화면에서 팔로우 목록을 받은 뒤 책장마다 Collection을 또 부르던 1+N 호출이 사라진다(`08_API_명세` 2.6·9.1·9.2). <!-- 근거: 08_API_명세.md §2.6·§9.1·§9.2 -->
  - 위 "세 커서는 독립적이며 혼용하지 않는다"와 **상충하지 않는다** — 커서를 합치는 것이 아니라 각 축의 **첫 페이지**를 한 응답에 싣는 것이다. 두 번째 페이지부터는 각 축의 커서를 따로 쓴다.
- **별칭(`alias`) 수정 `PATCH /follows/{followId}`는 키를 생략한 요청(`{}`)도 값 제거로 처리한다.** 서버는 키 부재와 명시적 `null`을 구분하지 않는다 — 변경된 필드만 모아 보내는 부분 수정 방식을 쓰면 건드리지 않은 `alias`가 지워질 수 있으니, 유지하려면 현재 값을 그대로 실어 보낸다. <!-- 근거: 08_API_명세.md §8.3 -->

#### ⚠️ 같은 `PATCH`인데 리소스마다 생략 규칙이 정반대다

<!-- 근거: 08_API_명세.md §7.4·§8.3 -->

| 보낸 형태         | `PATCH /follows/{followId}` (별칭)           | `PATCH /collections/{collectionId}` (제목·표지) |
| ----------------- | -------------------------------------------- | ----------------------------------------------- |
| 키를 **생략**     | **제거된다**                                 | **기존 값 유지**                                |
| `null`을 **명시** | **제거된다**                                 | **기존 값 유지**                                |
| 빈 요청 `{}`      | 별칭 제거로 정상 처리                        | **`400`** (최소 한 필드는 있어야 한다)          |
| 값을 비우려면     | 위 두 방법 중 아무거나                       | **불가능** — 등록·교체만 있다                   |
| 안전한 호출법     | **유지할 값도 매번 현재 값으로 실어 보낸다** | 바꿀 필드만 보낸다                              |

두 리소스는 **같은 서버 제약 위에 있는데 해소 방향이 반대다.** Jackson이 `String` 필드에서 "키 부재"와 "명시적 `null`"을 구분하지 못하는데(구분하려면 `JsonNullable` 같은 래퍼가 필요하다), 별칭은 **제거가 필요한 기능**이라 "없으면 제거"로, 표지는 **제거 UI 자체가 없어** "없으면 유지"로 정했다.

따라서 **"변경된 필드만 모아 보내는" 범용 부분수정 헬퍼를 두 리소스에 공유하면 안 된다.** 그 헬퍼를 별칭에 쓰면 값이 지워지고, 반대로 별칭 방식(전체 값 실어 보내기)을 표지에 쓰면 문제는 없지만 불필요하다. 각각 전용 요청 타입을 둔다.

- 표지 쪽 실수는 특히 눈에 안 띈다 — 제목만 고치는 화면에서 `{ title }`만 보내는 것이 **정상 동작**이고, 만약 서버가 "생략 = 제거"였다면 표지가 조용히 사라졌을 것이다. 이 규칙이 바뀌면 제목 수정 화면부터 깨지므로 계약 변경 시 가장 먼저 확인한다.

### Collection 표지 생성 (이미지 서비스 `/image/api/*`)

> ⚠️ **이 절만 core API가 아니다.** 별도 서비스(`Team-PinLog/image`)이고, 계약의 근거도 원본 docs 레포가 아니라 **front#99 연동 가이드**다. 원본 08_API_명세 §7.7이 "연동 계약은 front#99 가이드를 따른다"고 위임한다. 스키마가 바뀌면 이 문서가 아니라 그 이슈가 기준이다.

<!-- 근거: front#99, 08_API_명세.md §7.7·§13.12, 05-1_파트간_요구사항.md §1.6 -->

- **오케스트레이션은 프론트 담당이다.** 화풍 6종 중 하나를 사용자가 고르는 UI 단계가 있어 서버가 대신할 수 없다.

  ```text
  POST /collections { title, recordIds }         → 표지 없이 즉시 생성 (core 7.1)
  POST /image/api/covers { title, keywords }     → request_id + 후보 6종
  GET  /image/api/covers/{request_id}            → 1초 폴링, done된 카드부터 표시
  POST /image/api/covers/{request_id}/select     → { style_id } 인쇄본 잡 생성
  GET  /image/api/covers/{request_id}            → final.status가 done이 될 때까지
  PATCH /collections/{collectionId}              → { coverImageUrl: final.url } (core 7.4)
  ```

- **`httpClient`를 재사용할 수 없다.** baseURL이 `/api/core/v1`이고 인터셉터가 `{ success, data }` 봉투를 벗기는데, 이미지 API는 **봉투 없는 원시 JSON**을 반환한다. 전용 클라이언트를 둔다.
- **응답 필드는 snake_case다**(`request_id`, `style_id`). 경계에서 camelCase로 바꾼다.
  - ⚠️ **이미지 API의 `request_id`와 Feed의 `requestId`(Feed Session 식별자)는 완전히 별개다.** 이름이 같아 섞이기 쉬우니 `coverRequestId`처럼 구분되는 이름을 쓴다.
- **잡 상태는 `queued`/`running`/`done`/`failed` 넷**이고 카드마다 따로 진행된다. 6장을 다 기다리지 말고 `done`이 된 카드부터 붙인다. 권장 폴링 간격 **1초**.
  - ⚠️ **폴링 종료 조건이 단계마다 다르다.** 선택 **전**에는 후보 6종이 모두 terminal이면 최상위 `status: "done"`이다. 선택 **후**에는 새 잡이 생겨 다시 `running`이 되고, `final.status`가 `done`/`failed`가 되어야 끝난다.
  - **컴포넌트 언마운트 시 폴링을 반드시 정리한다.**
- **`title`·`keywords`는 사용자 입력(한국어)을 그대로 보낸다.** 프론트에서 번역하거나 프롬프트를 조립하지 않는다 — 한국어 장면 해석은 GPU 생성 계층이 한다.
- **`WORKER_TOKEN`을 브라우저 코드·`VITE_*` 환경변수에 넣지 않고, `/image/jobs/*`를 호출하지 않는다.** 프론트가 쓰는 경로는 `/image/api/*`와 `/image/files/*`뿐이다.
- 오류: `404`(없는 `request_id`) · `422`(필드 누락 또는 잘못된 `style_id`) · `5xx`(일시 장애). **네트워크 오류와 GPU 작업 실패(`status: "failed"`)를 구분해 안내한다.**

### Feed 이벤트

- `GET /feed/collections` 응답 최상위에 `requestId`, 각 item에 `position`이 존재한다.
- `POST /feed/events`는 **`CLICK`·`SAVE` 두 가지만 프론트가 전송**한다. **`IMPRESSION`은 서버가 목록 응답 생성 시 기록**한다(프론트가 보내지 않는다).
- 이벤트 전송 시 다음 3가지를 반드시 지킨다.
  1. **Keyword의 키는 `display_name`이 아니라 `code`(불변 식별자)다.** `display_name`(구 컬럼명 `label`)은 표시용이라 변경될 수 있다.
  2. **`position`은 배열 인덱스가 아니라 응답 값을 그대로 사용한다**(2페이지 첫 항목은 `0`이 아니다).
  3. **`requestId`는 응답 단위다.** 페이지를 넘기면 새 값이며, 그 페이지에서 발생한 이벤트는 그 페이지의 `requestId`를 쓴다.
- **`events` 배열 상한은 100개**다. 초과 시 `400 INVALID_INPUT`. (단건→배열 배치 전송으로의 요청 스키마 변경 자체는 이번 반영 범위 밖 — 별도 확인 예정) <!-- 근거: 05-1_파트간_요구사항.md §1.5 -->

### AI 검색 · Keyword

- **자연어 검색 응답 시간**: 정상 0.5~~1초, 최악 2~~3초, 장애 시 5~10초 타임아웃.
  - UI: 0~1.5초 스피너 → 1.5초 경과 후 "맥락을 분석하고 있어요" 문구 → 타임아웃 시 에러 처리.
- **Keyword 생성**: 정상 2초 이내 완료. 폴링은 저장 후 **3초·8초 2회만** 재조회하고 중단한다. **무한 폴링 금지** — 실패 복구는 분 단위로 이뤄져 폴링으로는 잡을 수 없다.
- **`keywords` 빈 배열은 정상**이다(COMPLETED 0건 포함). 실패로 처리하지 않는다.
- **`keywordStatus`(`COMPLETED`/`PROCESSING`/`FAILED`)**: `POST /search/records` 응답의 각 item에 Record 단위로 존재한다. Feed·Record 상세 응답에는 없다 — `04_익명SNS_공개정책.md` §2 공개 범위 표에 없는 내부 처리 상태라 공개 대상이 아니고, `search/records`는 본인 데이터만 반환하는 비공개 엔드포인트라 노출해도 된다.
  - `keywords`와는 별도 시점에 판정되는 독립 필드다. `keywords: []`이면서 `keywordStatus`가 `PROCESSING`/`COMPLETED`/`FAILED` 어느 쪽이어도 정상이고(처리중·완료 0건·실패), `keywords`가 비어 있지 않은데 `PROCESSING`인 조합(재분석 중 기존 결과 유지 등)도 정상이다 — 두 필드를 서로의 근거로 추론하지 않는다.
  - 하위호환: 이 필드를 무시해도 기존 `keywords` 계약(빈 배열 = 정상)은 그대로 유지된다.
- **[확인 필요]** AI 파생 데이터 삭제 정책이 origin에서 '즉시 파기' → '무효화 표시(`is_deleted`/`CANCELLED`)'로 변경됨(`05_AI_설계.md` §11). `docs/privacy-rules.md` 영향 여부 미확인 — 이 문서에서는 반영하지 않았다.

### Keyword 등급 (MVP)

- **MVP에서는 Keyword 등급(`visibility`)을 사용하지 않는다.** 모든 Keyword를 `PUBLIC`처럼 취급하고 등급 구분 UI를 만들지 않는다.
- 응답은 **현행 `display_name`(표시 문자열, 구 컬럼명 `label`) 문자열 배열**을 사용한다.
- `{ code, display_name, visibility }` 형태는 AI 파트가 확장용으로 보유하나 **MVP 범위 밖**이다.
- 단, 프론트가 Keyword를 내부 키로 다뤄야 하는 경우(아이콘 매핑·필터 상태)에는 `display_name`이 아니라 **향후 도입될 `code`**를 쓰도록 설계 여지를 남긴다.

## [협의 필요]

> 이 섹션은 임의로 채우지 않는다. 확정 전까지 구현에서 확정된 것으로 가정하지 않는다.

1. **provider 대소문자** — 경로는 소문자(`kakao`), 응답은 대문자(`KAKAO`). 타입은 대문자로 두고 경로 조립 시 `toLowerCase()`로 매핑한다.
2. **표지 생성 요청의 인증·rate limit** — `POST /image/api/covers`는 GPU 비용이 발생하는데 front#99 예제에 인증 헤더가 없다. 비로그인 허용 여부와 남용 방지 정책이 미확정이다(`05-1_파트간_요구사항.md` §3.2). <!-- 2026-08-05 doc-sync -->
   - **구현은 막지 않는다** — 가이드대로 인증 없이 호출한다. 다만 인증이 붙으면 요청 헤더가 바뀌므로, 이미지 서비스 호출부를 전용 클라이언트 한 곳에 모아 그 변경이 한 파일에서 끝나게 한다.
3. **이미지 기반 장소 제안(`POST /places/suggestions`)의 rate limit 구체값** — Gemini Vision 등 분석 비용이 발생하는 경로다. front#109가 `503 PLACE_SUGGESTION_BUSY`(동시 분석 제한)의 **존재**는 명시하지만 임계값(동시 요청 수·시간당 횟수 등)은 없다. 표지 생성(위 2번)과 같은 이유로 협의 필요. <!-- 근거: front#109, S15P11A705-344 -->
4. **`kakaoSearch.status`(`NO_RESULTS`/`FAILED`)가 오류인지 정상 응답 안의 상태 표시인지** — 200 응답 안에 후보별로 내려오는 필드라는 스키마 형태로 미루어 보면 "정상 응답, 개별 후보 실패"에 가깝지만, front#109 본문에는 이 필드명 자체가 없다(이슈는 `warnings[].code`로만 부분 실패를 표현한다). 확정 전까지 프론트는 후보별 안내로만 처리하고 전체 요청 실패로 승격하지 않는다(`PlaceRecordSheet.tsx`, S15P11A705-343). <!-- 근거: front#109 부재, S15P11A705-343/344 -->

### 이번에 [협의 필요]에서 제거(확정으로 흡수)됨

- ~~BFF 세부 계약~~ → BFF 별도 계층 없음. Spring 단일 앱이 BFF+리소스서버 겸함(위 [확정] 참고).
- ~~소셜 로그인 토큰 교환 엔드포인트~~ → 토큰 교환 방식 자체가 폐기되고 302 리다이렉트 방식으로 대체됨(위 [확정] 참고).
- ~~refreshToken 저장 위치~~ → 쿠키(서버가 `HttpOnly`+`Secure`+`SameSite=Lax`로 관리, 프론트는 저장하지 않음).
- ~~Context 본문 최대 길이~~ → **확정: 500자.** 위 [확정] > Record · Context 섹션 참고. <!-- 근거: 06_데이터모델_및_무결성.md §8 -->
- ~~카카오 검색 프록시 API(BFF 경유)~~ → **BFF 경유 자체가 폐기됨.** 프론트가 카카오 로컬 API를 직접 호출하는 것으로 확정됐고([확정] Place·지도·검색), 이 항목은 그 확정과 이미 모순된 채 남아 있던 잔여 서술이라 삭제했다(2026-08-04 doc-sync).
- ~~Collection 내부 Record 정렬~~ → **확정: 담은 순 오름차순 기본, `recordSort`로 최신순.** 위 [확정] > Collection 섹션 참고(2026-08-04 doc-sync). <!-- 근거: 08_API_명세.md §7.3 -->
- ~~프론트/API 운영 도메인이 같은 오리진인지~~ → **확정: same-origin.** 2026-08-05 운영 실측으로 확인했다(위 [확정] > 공통). 문서상으로만 정리돼 있고 실측이 없어 미결로 두던 항목이다.
