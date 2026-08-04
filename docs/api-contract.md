# API 계약

> 기준: docs 레포 `static/` (2026-08-04 doc-sync, 원본 HEAD `8b1d3b6` / PR #48 `docs/map-latest-collection-id` 반영). 원본 사본은 `docs/reference/`.
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

### [확정] 지도 마커 조회 응답에 latestCollectionId 추가

- 대상 엔드포인트: `GET /records/map`(지도 마커 목록 조회)
- 기존 응답 필드: `recordId, placeId, name, lat, lng`
- 추가 필드: **`latestCollectionId`**(`number | null`) — 그 Record가 **가장 최근에 담긴** Collection의 id. "가장 최근"의 기준은 컬렉션 내부 정렬과 같은 **담은 시각**이며, 컬렉션에서 **뺀(삭제된) 연결은 판단에서 제외**된다. 어느 Collection에도 담기지 않은 Record는 `null`이다. <!-- 근거: 08_API_명세.md §4.2 -->
  - ⚠️ 필드명은 `collectionId`가 **아니다.** 2026-08-04 doc-sync 이전 이 문서와 프론트 Zod 스키마가 `collectionId`로 적혀 있었고, 그대로면 파싱이 조용히 `undefined`가 되어 모든 마커가 "미분류" 색으로 떨어진다.
  - 한 Record가 여러 Collection에 담길 수 있으나 이 필드는 **단일 값**이다. 마커 색은 "그 Record가 속한 모든 Collection"이 아니라 "가장 최근 것 하나"를 나타낸다.
- 프론트 처리: `latestCollectionId` 기반 해시로 마커 asset(색) 결정, `null`이면 별도 고정 asset(미분류) 적용. 구현은 `getRecordMarkerAsset`(S15P11A705-307).
- 배포 시점이 프론트 배포보다 늦어질 가능성에 대비해, 프론트 Zod 스키마는 이 필드를 optional로 받는다(필드가 없거나 명시적 `null`이면 동일하게 "미분류"로 취급). 실제 배포 확인되면 optional 제거를 검토한다.

### 회원 탈퇴 — 2단계

> **`DELETE /me`는 더 이상 "탈퇴 완료"가 아니다.** `204`(완료) → **`200` + 이동할 곳**으로 바뀌었다. 엔드포인트·메서드는 그대로다. <!-- 근거: 08_API_명세.md §3.6, 06_데이터모델_및_무결성.md §6.9 -->

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

- **`thumbnailUrl`은 `null`일 수 있으나 필드가 생략되지는 않는다.** `null`이거나 이미지 로드에 실패하면 기본 이미지로 폴백한다. <!-- 근거: 08_API_명세.md §11.1 -->
- **4:3 비율**로 제공된다. `aspect-ratio: 4 / 3` + `object-fit: cover`로 표시하면 로딩 전 영역이 확보되고 폭에 적응한다.
- 현 단계 값은 같은 오리진의 절대 경로(`/api/core/images/places/…`)다. 이후 외부 절대 URL로 바뀔 수 있으며 `<img src>` 사용법은 동일하다. **`VITE_API_BASE_URL`(`/api/core/v1`)을 앞에 붙이지 않는다** — 이 경로는 `v1` 밖이다.
  - ⚠️ 이 경로가 실제로 백엔드에 도달하는지는 [협의 필요] 1번(Traefik 라우팅 실측)에 달려 있다. 프론트 nginx는 `/api/`를 무조건 `404`로 막으므로(`infra/frontend-image/nginx.conf`), Traefik 규칙이 `/api/core/v1`이 아니라 **`/api/core/` 프리픽스**로 백엔드에 넘겨야 이미지가 뜬다.

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
- **Collection 내부 Record 정렬 기본값은 담은 순 오름차순(오래된 것부터)**이다 — `collection_records.created_at ASC`, 동률이면 `id ASC`. `recordSort=ADDED_AT_DESC`로 최신순을 요청할 수 있다(`08_API_명세` 7.3). 과거 "정책(오름차순) vs 구현(`created_at DESC`) 충돌"은 오름차순 기본으로 해소됐다. <!-- 근거: 08_API_명세.md §7.3·§14-8, 06_데이터모델_및_무결성.md §2.7, 10_MVP_기능범위.md -->
  - Collection 목록(`7.2`·`9.3`)과 공개 책장(`8.1`)도 같은 규칙이다 — 기본 ASC, `sort`로 최신순.
  - 각 Record 안의 `contexts`는 `recordSort`와 **무관하게 항상 `createdAt` 오름차순**이다.
  - 프론트는 이 정렬 파라미터를 **상수로 고정해** 보낸다(위 페이지네이션 항목의 BD-46 제약).

### Follow

- **`GET /follows`가 팔로우 항목마다 그 책장의 Collection 첫 페이지를 동봉한다.** `collectionSize`·`collectionSort` 쿼리로 제어하며, Library 첫 화면에서 팔로우 목록을 받은 뒤 책장마다 Collection을 또 부르던 1+N 호출이 사라진다(`08_API_명세` 2.6·9.1·9.2). <!-- 근거: 08_API_명세.md §2.6·§9.1·§9.2 -->
  - 위 "세 커서는 독립적이며 혼용하지 않는다"와 **상충하지 않는다** — 커서를 합치는 것이 아니라 각 축의 **첫 페이지**를 한 응답에 싣는 것이다. 두 번째 페이지부터는 각 축의 커서를 따로 쓴다.
- **별칭(`alias`) 수정 `PATCH /follows/{followId}`는 키를 생략한 요청(`{}`)도 값 제거로 처리한다.** 서버는 키 부재와 명시적 `null`을 구분하지 않는다 — 변경된 필드만 모아 보내는 부분 수정 방식을 쓰면 건드리지 않은 `alias`가 지워질 수 있으니, 유지하려면 현재 값을 그대로 실어 보낸다. <!-- 근거: 08_API_명세.md §8.3 -->

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

1. **프론트/API 운영 도메인이 실제로 같은 오리진인지** — reference 문서(`11_인증_설계` §7.1)는 Traefik이 한 호스트에서 경로 기반(`/` → 프론트, `/api/core/` → 서버)으로 라우팅해 **이미 same-origin으로 정리**했고, 그 결과 "CORS 설정 불필요·`SameSite=None` 불필요"라고 명시한다. 문서상으로는 확정처럼 보이지만, 실제 배포 인프라(Traefik 라우팅 실측)가 이 문서대로 구성됐는지 인프라 파트 확인이 아직 없어 이 항목은 [협의 필요]로 유지한다. **인프라 실측이 확인되면 [확정]으로 승격 검토.**
   - 로컬 개발은 포트가 달라도 **same-site**라 `SameSite=Lax` 쿠키는 정상 전송되지만, **origin은 다르므로 로컬 개발 환경에서만 CORS 설정이 필요**하다(`11_인증_설계` §7.3). 운영에는 해당하지 않는다.
2. **provider 대소문자** — 경로는 소문자(`kakao`), 응답은 대문자(`KAKAO`). 타입은 대문자로 두고 경로 조립 시 `toLowerCase()`로 매핑한다.

### 이번에 [협의 필요]에서 제거(확정으로 흡수)됨

- ~~BFF 세부 계약~~ → BFF 별도 계층 없음. Spring 단일 앱이 BFF+리소스서버 겸함(위 [확정] 참고).
- ~~소셜 로그인 토큰 교환 엔드포인트~~ → 토큰 교환 방식 자체가 폐기되고 302 리다이렉트 방식으로 대체됨(위 [확정] 참고).
- ~~refreshToken 저장 위치~~ → 쿠키(서버가 `HttpOnly`+`Secure`+`SameSite=Lax`로 관리, 프론트는 저장하지 않음).
- ~~Context 본문 최대 길이~~ → **확정: 500자.** 위 [확정] > Record · Context 섹션 참고. <!-- 근거: 06_데이터모델_및_무결성.md §8 -->
- ~~카카오 검색 프록시 API(BFF 경유)~~ → **BFF 경유 자체가 폐기됨.** 프론트가 카카오 로컬 API를 직접 호출하는 것으로 확정됐고([확정] Place·지도·검색), 이 항목은 그 확정과 이미 모순된 채 남아 있던 잔여 서술이라 삭제했다(2026-08-04 doc-sync).
- ~~Collection 내부 Record 정렬~~ → **확정: 담은 순 오름차순 기본, `recordSort`로 최신순.** 위 [확정] > Collection 섹션 참고(2026-08-04 doc-sync). <!-- 근거: 08_API_명세.md §7.3 -->
