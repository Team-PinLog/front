# PinLog API 명세

MVP REST API 명세입니다. 데이터 구조는 데이터 모델 및 무결성 문서를, 화면 흐름은 유저플로우 문서를 따릅니다.

- 서비스 context-path: `/api/core` (인프라 고정값. 컨트롤러 매핑에 다시 쓰지 않는다)
- API 버전: `v1` — context-path 뒤에 붙는 버전 세그먼트
- **기본 경로: `/api/core/v1`** (위 둘을 합친 값. 2장 목록의 Endpoint는 여기에 이어 붙는 상대 경로다)
  - 클라이언트의 API base URL 환경변수에는 이 값을 넣는다. 3장 이후 모든 예시가 이 경로로 시작한다
- 응답 형식: 공통 봉투(`success`/`data`/`error`) — 1.6
- 페이지네이션: 커서 기반
- 시간 형식: ISO 8601 UTC
- 삭제 정책: 소프트 삭제

---

# 1. 공통 규약

## 1.1 인증

- 방식: **JWT (확정)**. Access Token + Refresh Token.
- 만료: Access **30분**, Refresh **7일**.
- Refresh Token은 **Redis**에 저장한다(로그아웃 무효화·회전 발급 관리, TTL 자동 만료).
- 토큰은 **`HttpOnly` + `Secure` + `SameSite=Lax` 쿠키**로 발급한다. 응답 본문에 토큰을 담지 않으며 클라이언트 스크립트는 토큰을 읽을 수 없다.
- 클라이언트는 요청에 자격증명을 포함시키기만 한다(`credentials: include` / `withCredentials`). 인증 헤더를 직접 구성하지 않는다.
- 쿠키 이름은 `access_token`·`refresh_token`이다. 둘 다 `HttpOnly`이므로 클라이언트가 이름으로 접근할 일은 없다.
- Access 쿠키는 `Path=/api/core`(context-path)로 발급한다. 모든 API 요청에 실려야 하고, 그 밖으로 나갈 필요는 없다.
- Refresh 쿠키는 `Path=/api/core/v1/auth`로 제한해 일반 API 요청(`/records` 등)에 실리지 않게 한다. 재발급과 로그아웃이 모두 이 범위에 들어간다.
- 프론트엔드와 API는 같은 오리진에서 서비스한다. 따라서 `SameSite=None`과 CORS 자격증명 설정이 필요하지 않다.
- 인증 쿠키와 별개로, 클라이언트가 로그인 여부를 판단할 수 있도록 **표시용 쿠키**를 함께 발급한다(1.8).
- Access 만료(401) 시 `POST /auth/refresh`로 재발급한다.
- 개인 API에서 사용자 ID를 요청 Query나 Body로 받지 않는다. 서버가 쿠키로 식별한다.
- 내부 사용자 ID는 응답에 포함하지 않는다. 클라이언트는 자신의 `memberId`를 알 필요가 없다.

## 1.2 권한 실패

타인의 비공개 데이터 또는 소유자 전용 자원에 접근한 경우 존재 여부를 노출하지 않도록 `404 NOT_FOUND`를 사용한다.

예:

- 타인의 개인 Record 조회
- 타인의 Context 수정·삭제
- 타인의 Collection 수정·삭제
- 자신이 보유하지 않은 `followId`로 Library 조회

## 1.3 비동기 AI

Record·Context 생성 및 수정 응답은 Keyword·Embedding 생성을 기다리지 않는다.

```json
{
  "success": true,
  "data": {
    "keywords": []
  }
}
```

위 응답은 오류가 아니다.

## 1.4 페이지네이션

목록 조회는 커서 기반을 기본으로 한다.

```json
{
  "success": true,
  "data": {
    "items": [],
    "nextCursor": "opaque-cursor-or-null",
    "hasNext": true
  }
}
```

목록 응답도 공통 봉투(1.6)를 따르며, `items`·`nextCursor`·`hasNext`는 `data` 안에 담긴다.

커서는 불투명 문자열이며 클라이언트가 내부 값을 해석하거나 수정하지 않는다.

- 인코딩: **Base64(정렬키 + id)**. 예: `Base64("2026-07-23T10:00:00Z,8801")`.
- `size` 기본 20, 명세상 상한 없음. 단, 구현 시 서버 내부 방어 상한을 두는 것을 권장한다.

정렬 방향 파라미터(7.2·7.3·8.1·9.2·9.3·5.2)를 두는 목록에서 **커서는 발급받은 방향에서만 유효하다.** 방향을 바꿀 때는 커서 없이 첫 페이지부터 다시 요청한다. 서버는 커서와 방향의 불일치를 검증하지 않으므로(알려진 한계, back BD-46), 다른 방향에서 받은 커서를 넣으면 오류 없이 어긋난 페이지가 반환된다. 정렬 파라미터는 사용자 노출 토글이 아니라 **프론트가 상수로 고정해 보내는 값**이며, 이 전제가 깨지는 기능(정렬 토글 UI)을 붙이려면 커서 방향 검증이 선행돼야 한다.

## 1.5 공통 에러 형식

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "요청한 리소스를 찾을 수 없습니다.",
    "fieldErrors": [],
    "traceId": "3f1c9a7e-58b2-4d6a-9f0e-7c2b1d4e8a55"
  }
}
```

- `code`는 클라이언트가 분기하는 안정적인 문자열이다. `message`는 사람이 읽는 설명이며 분기 기준으로 쓰지 않는다.
- `fieldErrors`는 입력 검증 실패 시 필드별 위반을 담고, 그 외에는 빈 배열이다.
- `traceId`는 요청 하나를 서버 로그와 잇는 추적 식별자다. 문의·장애 대응 시 이 값으로 해당 요청의 로그를 찾는다. 클라이언트는 해석하지 않고 그대로 노출·전달만 한다.
- 일부 `code`는 `error` 안에 **추가 필드**를 더한다. 예: `DELETE_CONFIRMATION_REQUIRED`는 연쇄 삭제 영향을 `error.impact`로 반환한다(5.6·5.7).

권장 상태 코드:

| 상태 | 의미 |
|---:|---|
| `200` | 조회·수정 성공 |
| `201` | 리소스 생성 성공 |
| `204` | 응답 본문 없는 성공 |
| `400` | 형식 또는 입력값 오류 |
| `401` | 인증 필요 |
| `403` | CSRF 토큰 누락·불일치 (자원 접근 권한 실패는 1.2에 따라 `404`) |
| `404` | 리소스 없음 또는 접근 권한 없음 |
| `409` | 상태 충돌 (연쇄 삭제 확인 필요 등) |
| `422` | 도메인 규칙 위반 |
| `500` | 서버 결함 — 재시도해도 같은 결과다 |
| `503` | **일시적으로 처리할 수 없음** (의존성 장애·자원 고갈) — 재시도로 풀릴 수 있다 |

`500`과 `503`을 가르는 기준은 **재시도가 의미 있는가**다. 클라이언트는 `503`을 받으면 세션을 버리지 않고 잠시 후 다시 시도하거나 오류를 표시하며, `500`은 그대로 오류로 다룬다. 두 코드 모두 봉투(1.6)를 따르므로 `error.code`로 원인을 구분한다.

## 1.6 공통 응답 형식

성공과 오류 모두 같은 봉투로 감싼다. 클라이언트는 `success` 하나로 분기한다.

```json
// 성공
{ "success": true, "data": { } }

// 오류
{ "success": false, "error": { "code": "…", "message": "…", "fieldErrors": [], "traceId": "…" } }
```

- 성공 응답의 실제 페이로드는 항상 `data` 안에 있다. 목록도 마찬가지다(1.4).
- 성공 응답에는 `message` 필드를 두지 않는다. 사람이 읽을 문구가 필요하면 `data` 안의 도메인 필드로 표현한다.
- `null`인 필드는 직렬화에서 생략한다. 성공 응답에 `error` 키가, 오류 응답에 `data` 키가 나타나지 않는다.
- **`204 No Content`는 본문이 없다.** 봉투도 보내지 않는다.
- `success`는 HTTP 상태 코드를 대체하지 않는다. 상태 코드의 의미는 위 표를 그대로 따르며, `success: false`는 항상 4xx·5xx와 함께 온다.
- 아래 3장 이후의 모든 응답 예시는 이 봉투를 적용한 형태다.

## 1.7 CSRF

쿠키 기반 인증이므로 상태를 바꾸는 요청은 CSRF 토큰을 요구한다.

- 서버가 `XSRF-TOKEN` 쿠키를 내려준다. 이 쿠키는 **`HttpOnly`가 아니며** 클라이언트가 읽을 수 있다.
- 클라이언트는 `POST`·`PUT`·`PATCH`·`DELETE` 요청에 그 값을 `X-XSRF-TOKEN` 헤더로 실어 보낸다.
- 헤더가 없거나 값이 일치하지 않으면 `403`을 반환한다.
- `GET`을 비롯한 조회 요청은 해당하지 않는다.

| 항목 | 값 |
|---|---|
| 이름 | `XSRF-TOKEN` |
| 속성 | `Secure`, `SameSite=Lax`, **`Path=/`**. **`HttpOnly`가 아니다** |
| 발급 시점 | 조회 요청을 포함한 모든 요청의 응답. 클라이언트는 첫 `GET` 응답에서 값을 얻으므로 토큰 전용 엔드포인트를 호출하지 않는다 |

> **`Path=/`는 이 쿠키가 동작하기 위한 조건이다.**
>
> 읽는 주체가 브라우저 JS이므로, `Path`를 API 경로(`/api/core`)로 좁히면 프론트 페이지(`/`·`/auth/callback`)의 `document.cookie`에 **나타나지 않는다.** 그러면 클라이언트는 `X-XSRF-TOKEN`에 넣을 값을 구할 방법이 없고 상태 변경 요청이 **전부 `403`**이 된다. 표시 쿠키(1.8)와 같은 판단이다 — 읽는 주체가 JS인 쿠키는 `Path=/`여야 한다.

## 1.8 로그인 표시 쿠키

인증 쿠키는 `HttpOnly`라 클라이언트가 읽을 수 없다. 앱 시작 시 로그인 화면을 띄울지 판단할 수 있도록, 값에 의미가 없는 표시용 쿠키를 함께 발급한다.

| 항목 | 값 |
|---|---|
| 이름·값 | `logged_in=1` |
| 속성 | `Secure`, `SameSite=Lax`, `Path=/`, `Max-Age`는 Refresh와 동일(7일). **`HttpOnly`가 아니다** |
| 내용 | 개인정보·식별자를 담지 않는다. 존재 여부만 의미가 있다 |
| 발급·갱신 | 로그인 콜백(3.2), 재발급 성공(3.3) |
| 삭제 | 로그아웃(3.4), 회원 탈퇴(3.6) |

> **UI 힌트 전용이다. 인가 판단에 사용하지 않는다.**
>
> 실제 인가는 서버가 **매 요청** 인증 쿠키를 검증해 수행한다. 이 쿠키는 브라우저에 남아 있어도 세션이 이미 무효일 수 있다(예: Refresh 만료, 다른 기기에서 로그아웃). 그 경우 첫 API 호출이 `401`을 반환하므로, 클라이언트는 재발급(3.3)을 시도하고 실패하면 로그인 화면으로 유도한다.
>
> 이 쿠키의 존재를 근거로 보호 화면을 렌더링하는 것은 무방하다. 이 쿠키의 존재를 근거로 **권한이 있다고 판단하는 것은 안 된다.**

## 1.9 요청 입력 크기 상한

서버가 요청 입력에 방어 상한을 둔다. 초과하면 `400 INVALID_INPUT`이며 위반 필드가 `error.fieldErrors`(1.5)에 담긴다.

| 대상 | 상한 | 적용 |
|---|---|---|
| Context 본문 | **500자** | `POST /records`의 `contextBody`(5.1) · `POST /records/{recordId}/contexts`의 `body`(5.4) · `PATCH /records/{recordId}/contexts/{contextId}`의 `body`(5.5) |
| `recordIds` 배열 | **100개** | `POST /collections`(7.1) · `POST /collections/{collectionId}/records`(7.5) |
| `events` 배열 | **100개** | `POST /feed/events`(10.2) |

배열 상한 100은 목록 조회의 방어 상한(1.4의 `size`)과 **같은 값**이다. 요청마다 상한을 따로 정하면 클라이언트가 외울 값이 늘어난다.

> **Context 입력 필드에는 클라이언트도 `maxlength=500`을 건다.** 서버만 막으면 사용자가 긴 글을 다 쓴 뒤에 거절당한다. 저장 이유 메모는 한 번에 쓰는 성격이라 그 시점에 본문을 잃으면 체감이 나쁘다 — 남은 글자 수를 함께 표시한다([파트간 요구사항](05-1_파트간_요구사항.md) 1.5).

---

# 2. Endpoint 전체 목록

아래 표의 Endpoint는 모두 기본 경로 `/api/core/v1` 뒤에 붙는 상대 경로다. 예를 들어 `/auth/logout`의 전체 경로는 `/api/core/v1/auth/logout`이다. 3장 이후의 상세에서는 전체 경로로 표기한다.

## 2.1 인증·계정

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/auth/{provider}/login` | 소셜 로그인 시작 |
| GET | `/auth/{provider}/callback` | 소셜 로그인 콜백 (신규면 가입 처리 후 인증 쿠키 발급) |
| POST | `/auth/refresh` | Access Token 재발급 |
| POST | `/auth/logout` | 로그아웃 (Refresh Token 무효화) |
| GET | `/me/summary` | 마이페이지 요약 (계정 정보 + Record·Collection·팔로워·팔로잉 수) |
| DELETE | `/me` | 회원 탈퇴 |

## 2.2 Place·지도

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/records/map` | 내 활성 Record 기반 지도 마커 조회 |
| GET | `/records/map/keywords` | 지도에 보이는 범위의 내 키워드 상위 5건 (검색창 밑 추천 칩) |

장소 검색은 서버 API가 아니다. 프론트가 카카오 로컬 API를 직접 호출하고, Record 생성 시 카카오 응답의 장소 데이터를 서버에 전달한다(5.1).

## 2.3 Record·Context

| Method | Endpoint | 설명 |
|---|---|---|
| POST | `/records` | 카카오 Place와 첫 Context로 Record 생성 |
| GET | `/records/{recordId}` | 내 Record 상세 조회 |
| GET | `/records/by-place` | kakaoPlaceId로 이 장소의 내 활성 Record 조회 |
| GET | `/records/recent` | 최근 7일 안에 만든 내 Record 목록 (홈 화면 최근 기록) |
| GET | `/records/{recordId}/collections` | 이 Record가 담긴 내 Collection 목록 (Record 상세 화면) |
| DELETE | `/records/{recordId}` | Record 소프트 삭제. 마지막 Record인 Collection이 있으면 409 거절 |
| DELETE | `/records/{recordId}/force` | 안내 확인 후 Record 강제 삭제. 연쇄 Collection 삭제 포함 |
| POST | `/records/{recordId}/contexts` | Context 추가 |
| PATCH | `/records/{recordId}/contexts/{contextId}` | Context 교체 방식 수정 |
| DELETE | `/records/{recordId}/contexts/{contextId}` | Context 삭제 |

Context 목록은 별도 API 없이 Record 상세(`GET /records/{recordId}`)의 `contexts`를 사용한다.

## 2.4 AI 자연어 검색

| Method | Endpoint | 설명 |
|---|---|---|
| POST | `/search/records` | 내 Place·Context·Keyword 기반 AI 자연어 검색 |

## 2.5 Collection

| Method | Endpoint | 설명 |
|---|---|---|
| POST | `/collections` | Collection 생성 및 자동 발행 |
| GET | `/collections` | 내 Collection 목록 조회 |
| GET | `/collections/{collectionId}` | 소유권에 따라 개인·공개 상세 조회 |
| PATCH | `/collections/{collectionId}` | 소유자의 Collection 제목·표지 수정 |
| DELETE | `/collections/{collectionId}` | 소유자의 Collection 삭제 |
| POST | `/collections/{collectionId}/records` | 소유자의 Record 추가 |
| DELETE | `/collections/{collectionId}/records/{recordId}` | 소유자의 Record 제거 |
공개 책장 탐색은 Feed 네임스페이스(2.7), 책장 Follow는 Follow 네임스페이스(2.6)를 사용한다.

## 2.6 Follow

| Method | Endpoint | 설명 |
|---|---|---|
| POST | `/follows` | Follow 생성 (body의 `collectionId`로 작성자 식별) |
| GET | `/follows` | 내 팔로우 목록 페이지네이션. `collectionSize`를 주면 책장별 Collection 첫 페이지를 함께 반환(9.2) |
| GET | `/follows/{followId}/collections` | 팔로우 유저의 공개 Collection 목록 페이지네이션 |
| PATCH | `/follows/{followId}` | Follow 별칭 수정·제거 |
| DELETE | `/follows/{followId}` | Follow 해제 |

Library는 프론트 페이지 명칭이며 전용 Endpoint가 없다. 내 책장은 `GET /collections`, 팔로우 책장은 `GET /follows` + `GET /follows/{followId}/collections` 조합으로 구성한다(9장).

## 2.7 Feed·추천 이벤트

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/feed/collections` | 추천 Collection 목록 |
| GET | `/feed/collections/{collectionId}/shelf` | Collection 작성자의 공개 책장 탐색 |
| POST | `/feed/events` | CLICK·SAVE 이벤트 수집 |

Collection 상세은 Feed 전용 URL을 만들지 않고 공통 Endpoint를 사용한다.

```http
GET /collections/{collectionId}
```

---

# 3. 인증·계정 상세

## 3.1 소셜 로그인 시작

```http
GET /api/core/v1/auth/{provider}/login
```

지원 provider:

```text
google
kakao
naver
```

공급자 인가 페이지로 리다이렉트한다.

## 3.2 소셜 로그인 콜백

```http
GET /api/core/v1/auth/{provider}/callback?code={code}&state={state}
```

공급자 인증 후 다음을 수행한다.

- 활성 `social_account`가 있으면 그 회원으로 로그인한다.
- 없으면 이 시점에 `member`와 `social_account`를 생성한다. 소셜 인증 성공이 곧 가입 완료다.
- 두 경우 모두 인증 쿠키를 발급하고 클라이언트 애플리케이션으로 리다이렉트한다.

필수 약관은 클라이언트가 로그인 시작 이전 화면에서 안내하며, 서버는 동의 여부를 받지도 저장하지도 않는다.

응답에 본문이 없다. 인증 정보는 `Set-Cookie`로만 전달하므로 공통 응답 봉투(1.6)가 적용되지 않는다.

```http
HTTP/1.1 302 Found
Location: /auth/callback
Set-Cookie: access_token=…; HttpOnly; Secure; SameSite=Lax; Path=/api/core
Set-Cookie: refresh_token=…; HttpOnly; Secure; SameSite=Lax; Path=/api/core/v1/auth
Set-Cookie: logged_in=1; Secure; SameSite=Lax; Path=/
```

`logged_in`만 `HttpOnly`가 아니다(1.8). 나머지 속성 근거는 1.1에 있다.

복귀 경로는 성공·실패 모두 `/auth/callback` 하나이며, 실패 시에만 `error` query가 붙는다.

```text
성공: /auth/callback
실패: /auth/callback?error=OAUTH_FAILED
```

- 복귀 경로는 **서버 설정값**이며 요청 파라미터로 받지 않는다. 임의 URL을 받으면 open redirect 취약점이 된다.
- 로그인 이전 화면으로 되돌아가는 처리는 클라이언트가 담당한다(로그인 시작 전 경로를 `sessionStorage` 등에 보관).
- **공급자 응답에 이메일이 없으면 가입하지 않고 실패로 처리한다**(`email`은 필수다 — [06 §2.2](06_데이터모델_및_무결성.md)). 세 공급자 콘솔이 이메일을 필수 동의로 두고 있어 사용자가 이메일만 거절하고 진행할 수는 없으므로, 이 실패는 **정상 흐름이 아니라 그 설정이 깨졌을 때의 방어선**이다.
  - 복귀는 다른 실패와 같은 **`error=OAUTH_FAILED`** 다. **사유별로 `error` 값을 가르지 않는다** — 위 규칙대로 클라이언트는 고정된 값 하나만 보고 재로그인을 유도하고, 원인은 서버 로그에서 찾는다. 따라서 클라이언트에 분기를 더할 필요가 없다.
  - 사유를 노출하지 않는 이유: 이 실패는 사용자가 우리 화면에서 고칠 수 있는 것이 아니다(동의는 공급자 쪽에 있다). 값을 가르면 클라이언트에 **발생하지 않는 분기**가 남는다.

## 3.3 토큰 재발급

```http
POST /api/core/v1/auth/refresh
```

요청 본문이 없다. Refresh 쿠키로 식별한다.

- **204**: 새 Access·Refresh 쿠키를 `Set-Cookie`로 발급하고 표시 쿠키(1.8)의 만료를 함께 갱신한다(Refresh도 회전 발급). 본문이 없으므로 봉투(1.6)가 적용되지 않는다.
- 만료·무효, 또는 회전 전 Refresh 재사용: 401. 오류 응답은 봉투를 따른다(1.5). 클라이언트는 재로그인으로 유도한다.

회전 발급이므로 재발급 요청은 **동시에 하나만** 보낸다. 401이 여러 건 동시에 발생해도 재발급은 한 번만 호출하고 나머지 요청은 그 결과를 기다린다.

## 3.4 로그아웃

```http
POST /api/core/v1/auth/logout
```

- 동작: Refresh Token을 무효화하고 Access·Refresh 쿠키와 표시 쿠키(1.8)를 모두 만료시킨다.
- 204.

무효화 대상은 **Refresh 쿠키로 식별한다.** 이 경로는 Refresh 쿠키의 `Path` 범위(`/api/core/v1/auth`) 안에 있으므로 쿠키가 함께 전송된다.

- Access가 이미 만료됐어도 로그아웃은 동작한다. Refresh 쿠키만으로 대상을 특정할 수 있기 때문이다.
- 해당 세션 하나만 무효화한다. 다른 기기의 로그인은 유지된다.
- Refresh 쿠키가 없거나 이미 무효한 경우에도 **204**를 반환한다. 서버에 지울 것이 없을 뿐이고, 쿠키 정리는 그대로 수행한다. 이미 로그아웃된 상태를 오류로 취급하지 않는다.

## 3.5 마이페이지 요약

```http
GET /api/core/v1/me/summary
```

마이페이지 진입 시 1회 호출한다.

```json
{
  "success": true,
  "data": {
    "provider": "KAKAO",
    "email": "user@example.com",
    "recordCount": 20,
    "collectionCount": 9,
    "followerCount": 12,
    "followingCount": 8
  }
}
```

- 카운트는 모두 활성 데이터 기준 집계다.
- **`email`은 항상 있다.** 이메일 없는 계정은 가입 단계에서 걸러지므로(3.2, [06 §2.2](06_데이터모델_및_무결성.md)) 이 필드가 생략되는 경우는 없다. 클라이언트에 값 없음 대비가 필요하지 않다.
- 팔로워·팔로잉 목록은 제공하지 않는다. 수치는 본인만 볼 수 있다.
- `memberId`는 반환하지 않는다. 개인 API는 서버가 쿠키로 사용자를 식별하므로 클라이언트가 자신의 내부 ID를 알 필요가 없다(1.1).

## 3.6 회원 탈퇴

탈퇴는 **두 단계**다. 공급자 연결 해제가 선행되고, 그것이 성공한 경우에만 데이터가 삭제된다.

```text
1. DELETE /api/core/v1/me              → 200 + 공급자 인가 URL
2. 클라이언트가 그 URL로 페이지 이동     → 공급자 인가
3. 공급자 → GET /api/core/v1/auth/{provider}/callback
     → 서버: 공급자 연결 해제 → 성공하면 삭제 절차 수행 → 복귀 URL로 302
```

**엔드포인트와 메서드는 그대로다.** 바뀌는 것은 첫 응답이 `204`(완료)에서 `200`(계속 진행할 곳)이 되는 것뿐이다.

### 3.6.1 탈퇴 시작

```http
DELETE /api/core/v1/me
X-XSRF-TOKEN: {csrfToken}
```

요청 본문이 없다. Access 쿠키로 회원을 식별한다. CSRF 토큰은 상태 변경 요청의 기존 규칙(1.7)이며 이 개정으로 새로 생긴 요구가 아니다.

```json
{ "success": true, "data": { "authorizationUrl": "…" } }
```

- 클라이언트는 이 URL로 **페이지 이동**한다(4.5의 로그인 시작과 같다). `fetch`나 `axios`로 호출하면 공급자 화면이 사용자에게 보이지 않는다.
- **이 URL을 해석하지 않는다.** 서버 경로일 수도, 공급자의 절대 URL일 수도 있다. 클라이언트는 이동만 하고 최종 도착지는 공급자 인가 화면이다.
- 이 단계는 아직 아무것도 삭제하지 않는다.
- 회원의 공급자는 서버가 `social_account`에서 판단한다. 클라이언트가 지정하지 않는다.

오류 응답은 다음과 같다.

| 상태 | `code` | 상황 |
|---|---|---|
| `401` | `UNAUTHORIZED` | 인증되지 않았거나 해제할 소셜 계정이 없다 |
| `409` | `WITHDRAWAL_NOT_SUPPORTED` | 소셜 계정이 둘 이상이다 |

`409`는 **한 번의 인가 왕복이 한 공급자만 인가**하기 때문이다. 계정이 여럿인데 하나만 해제하고 삭제하면 나머지는 마스킹(6.9)으로 지목할 수단이 사라져 영구히 끊을 수 없다. 서버는 그 상태를 만들지 않고 시작을 거절한다. 계정을 여러 개 연결하는 기능이 생기면 이 응답과 함께 흐름을 다시 설계한다.

**이 왕복은 조건부가 아니라 항상 일어난다.** 연결 해제에는 공급자가 발급한 토큰이 필요한데, 서버는 로그인 시 그 토큰을 보관하지 않는다(11 §2). 즉 "만료됐으면 다시 받는다"가 아니라 **탈퇴 시점에는 언제나 없으므로 언제나 다시 받는다.** 클라이언트가 들고 있는 것은 우리 서버의 인증 쿠키이고, 그것으로는 공급자에게 연결 해제를 요청할 수 없다.

공급자 화면에서 무엇이 보이는지는 **공급자의 세션·동의 상태에 달려 있다.** 세션이 살아 있고 이전에 동의한 사용자는 화면이 스쳐 지나가고, 세션이 없으면 로그인 절차를 밟는다. 서버는 그 차이를 알지 못하고 알 필요도 없다 — 인가 코드 또는 오류를 받을 뿐이다.

### 3.6.2 완료 — 콜백

공급자 인가를 마치면 로그인과 **같은 콜백**으로 돌아온다. 서버는 그 요청이 탈퇴 흐름인지 로그인 흐름인지 구분해 처리한다.

복귀 경로는 **로그인과 같다**(`/auth/callback`). 성공한 경우 인증 쿠키와 표시 쿠키가 이미 만료된 상태로 착지하므로, 클라이언트의 기존 앱 시작 흐름(11 §5.2)이 그대로 로그인 화면으로 보낸다. 별도 복귀 경로를 두지 않는다.

| 결과 | `?error=` |
|---|---|
| 연결 해제 성공 → 삭제 완료 | 없음 |
| 사용자가 공급자 화면에서 취소 | `WITHDRAWAL_CANCELLED` |
| 연결 해제 실패 (공급자 장애 등) | `WITHDRAWAL_FAILED` |
| 해제 대상을 판정하지 못함 | `WITHDRAWAL_UNLINK_FAILED` |
| **인증된 공급자 계정이 탈퇴 요청 회원의 것과 다름** | `WITHDRAWAL_ACCOUNT_MISMATCH` |

- 실패한 경우 **아무것도 삭제하지 않는다.** 회원 데이터가 그대로 남고 세션도 유지되므로 사용자는 다시 시도할 수 있다.
- 되돌릴 수 없다. 클라이언트는 1단계 이전에 확인 절차를 둔다.
- 사용자가 공급자 화면에서 이탈해 돌아오지 않으면 아무 일도 일어나지 않는다.

**왕복 중에 Access 쿠키가 만료돼도 탈퇴는 완료된다.** 탈퇴 대상 회원은 1단계에서 확정되어 인가 요청과 함께 서버가 보관하므로, 콜백 시점의 인증 상태에 의존하지 않는다.

**계정 일치를 확인한다.** 사용자가 공급자 화면에서 다른 계정으로 인증할 수 있다(계정 선택 화면을 띄우는 공급자가 있다). 그 경우 서버는 **계정 B의 연결을 끊고 회원 A를 삭제하게 되므로**, 콜백에서 공급자가 알려준 사용자 식별자가 탈퇴를 요청한 회원의 `social_account`와 같은지 확인하고 다르면 거절한다.

### 3.6.3 왜 연결 해제가 선행인가

**삭제가 먼저 커밋되면 연결 해제가 영구히 불가능해진다.** 삭제 절차가 `social_account`의 `provider_user_id`를 마스킹하므로, 그 시점부터 공급자에서 그 사용자를 지목할 수단이 사라진다. 실패를 나중에 재시도할 수도 없다.

그 결과가 **연결이 남은 채 탈퇴가 완료된 상태**다. 같은 계정으로 다시 로그인하면 공급자가 동의 화면 없이 통과시켜, 사용자 입장에서는 탈퇴가 무의미해진다.

카카오는 연결 해제를 탈퇴 절차에 포함할 것을 **의무로 규정**한다. 따라서 이 순서는 편의가 아니라 요구사항이다.

**공급자 장애 시 탈퇴가 지연되는 것을 감수한다.** 그 대가는 일시적이고 재시도로 해소되는 반면, 반대 순서의 대가는 회복 불가능하다. 서버는 순간적 장애를 흡수하기 위해 짧은 재시도를 수행한다.

### 3.6.4 삭제 절차

동작은 정책 정의서 10장을 따른다.

| 대상 | 처리 |
|---|---|
| **공급자 연결** | **해제(선행). 실패 시 아래를 수행하지 않는다** |
| `member`, `social_account` | 소프트 삭제 |
| `record`, `context`, `collection`, `collection_record`, 관련 `follow` | 소프트 삭제 |
| `social_account`의 `provider_user_id`, `email` | **마스킹**(개인정보 파기 대상) |
| `ai.context_ai_state` | 두 status를 `CANCELLED`로 전이 |
| `ai.context_embedding` | `is_deleted = true` 표시 |
| Refresh Token | 해당 회원의 **모든** Refresh를 무효화하고 인증 쿠키와 표시 쿠키(1.8)를 만료시킨다 |
| `place` | 공용 데이터이므로 유지한다 |

### AI 파생 데이터

Context가 소프트 삭제될 때 함께 처리한다. **물리 삭제가 아니라 무효화 표시다.**

| 표시 | 효과 |
|---|---|
| `context_ai_state`의 두 status → `CANCELLED` | 진행 중인 AI 작업을 취소해 **늦게 도착한 결과가 저장되는 것을 막고**, 키워드 조회에서 제외한다 |
| `context_embedding.is_deleted = true` | 검색 대상에서 제외하고 물리 삭제 대상으로 식별한다 |

```sql
UPDATE ai.context_ai_state
SET embedding_status = 'CANCELLED',
    keyword_status   = 'CANCELLED',
    updated_at       = now()
WHERE context_id = ?;
-- 조건 없음. COMPLETED·FAILED도 덮는다. CANCELLED가 다른 모든 상태보다 우선한다(05 §11.1).

UPDATE ai.context_embedding
SET is_deleted = true, updated_at = now()
WHERE context_id = ?;
-- 영향 행이 0이어도 정상이다(Embedding 생성 전에 삭제된 경우).
-- 늦게 도착하는 INSERT는 State의 CANCELLED가 차단한다(05 §11.2).
```

- **`CANCELLED` 전이에 조건을 걸지 않는다.** `COMPLETED`도 덮어야 한다. `context_keyword`에는 `is_deleted`에 해당하는 컬럼이 없어, 키워드 조회 제외를 오직 `keyword_status = 'CANCELLED'`가 담당하기 때문이다. `COMPLETED`를 남기면 임베딩 검색에서는 걸러지지만 **키워드 조회에서 탈퇴한 사용자의 키워드가 계속 노출된다.**
- `is_deleted` UPDATE의 **영향 행이 0이어도 오류로 처리하지 않는다.**
- 두 컬럼 모두 **백엔드(Spring)가 변경한다.** FastAPI는 건드리지 않는다(05 §6.4·§12.3). 반대로 Finalizer는 `CANCELLED`를 `FAILED`로 덮어쓸 수 없다(05 §12).
- `ai.context_keyword`는 별도 처리가 필요 없다. 조회가 `context_ai_state`를 조인해 `keyword_status = 'COMPLETED'`로 거르므로 자동 제외된다(05 §9·§11.2). 백엔드는 이 테이블에 쓰지 않고 읽기 조인만 한다.
- 물리 삭제 시점은 이 명세의 범위가 아니며 개인정보 정책을 따른다(07 §5).
- 같은 처리를 Record 삭제(5.6·5.7)에도 적용한다. 탈퇴 전용 동작이 아니다.

3.6.1은 Refresh 쿠키의 `Path` 범위 밖이라 Refresh 쿠키가 전송되지 않는다. 따라서 **Access 쿠키로 회원을 식별하고 그 회원의 Refresh를 전부 무효화한다.** 탈퇴는 모든 기기에서 즉시 로그아웃되어야 하므로 전체 무효화가 의도된 동작이다. Access가 만료된 상태라면 인증 실패(401)이므로, 클라이언트는 재발급(3.3) 후 다시 요청한다.

- 탈퇴한 사용자의 Shelf와 Collection은 다른 사용자의 Library·Feed에서 즉시 제외한다.
- 활성 `social_account`가 사라지므로, 같은 소셜 계정으로 다시 로그인하면 **신규 회원으로 가입**된다(3.2). 과거 데이터는 복구되지 않는다.
- 연결이 해제됐으므로 그 재로그인은 **공급자 동의 절차를 다시 거친다.** 이것이 3.6.3의 순서가 보장하는 결과다.

## 3.7 나의 활동 기록 집계

```http
GET /api/core/v1/me/activity
```

내 기록을 월별·지역별로 집계한다. 활동 기록 화면 진입 시 1회 호출한다.

**기간은 전체 누적이다.** 기간 파라미터를 두지 않는다 — 화면이 "지금까지"를 보여주는 자리라 범위를 고를 여지가 없다.

```json
{
  "success": true,
  "data": {
    "totals": {
      "placeCount": 24,
      "districtCount": 7,
      "firstRecordedOn": "2026-01-14"
    },
    "months": [
      { "month": "2026-01", "recordCount": 2 },
      { "month": "2026-02", "recordCount": 0 },
      { "month": "2026-03", "recordCount": 5 }
    ],
    "areas": [
      { "district": "마포구", "recordCount": 8 },
      { "district": "성동구", "recordCount": 5 }
    ],
    "counts": {
      "contextCount": 31,
      "collectionCount": 5,
      "recordedMonthCount": 7
    },
    "highlights": {
      "firstPlaceName": "성수 앤트러사이트",
      "lastPlaceName": "연남 커피리브레",
      "busiestDay": { "date": "2026-05-17", "recordCount": 3 }
    }
  }
}
```

**날짜 경계는 전부 KST다.** `record.created_at`은 `TIMESTAMPTZ`이므로 UTC로 끊으면 KST 자정 직후에 남긴 기록이 전날에 붙는다. 월·일 집계는 모두 KST 벽시계 기준으로 계산한다.

| 필드 | 의미 |
|---|---|
| `totals.placeCount` | 기록한 장소 수. 활성 Record 수와 같다([06 §4.1](06_데이터모델_및_무결성.md) 회원·장소당 활성 Record 1개) |
| `totals.districtCount` | 발자국이 닿은 시·구 수 |
| `totals.firstRecordedOn` | 첫 기록일(KST). 기록이 없으면 `null` |
| `months` | 첫 기록이 있는 달부터 **이번 달까지** 빠짐없이 이어진다. 기록이 없는 달은 `recordCount: 0`으로 채워진다 |
| `areas` | 건수 내림차순 **상위 5곳**. 동점은 지역명 오름차순으로 끊는다 |
| `counts.recordedMonthCount` | 기록이 **실제로 있는** 달의 수. `months`의 길이와 다르다 — 그쪽은 빈 달까지 채운 구간 길이다 |
| `highlights.busiestDay` | 하루에 가장 많이 기록한 날(KST). 동점이면 더 최근 날짜다 |

- 카운트는 모두 활성 데이터 기준 집계다. 소프트 삭제된 Record·Context·Collection은 빠진다.
- **`areas`의 시·구는 `place.address` 문자열에서 뽑는다.** 행정구역 컬럼이 없어 주소를 공백으로 끊은 두 번째 조각을 쓰므로, 도로명·지번이 섞이거나 형식을 벗어난 주소에서는 정확하지 않다. 조각을 뽑을 수 없는 주소는 `areas`와 `districtCount` 양쪽에서 제외된다.
- **기록이 하나도 없으면 `200`이다.** `months`·`areas`는 빈 배열, 카운트는 `0`, `firstRecordedOn`과 `highlights`의 세 값은 `null`이다. 404가 아니다.
- AI 키워드는 담지 않는다. 키워드 집계는 4.3(지도 범위의 내 키워드 상위 5건)을 쓴다.
- `memberId`는 반환하지 않는다(1.1).
- 3.5(마이페이지 요약)를 대체하지 않는다. 그쪽은 계정 정보와 카운트 넷이고 이쪽은 집계라, 호출 시점과 응답 크기가 다르다.

---

# 4. Place·지도 상세

## 4.1 카카오 Place 검색

장소 검색은 서버 API가 아니다. **프론트가 카카오 로컬 API를 직접 호출한다.**

- 검색 결과 조회만으로 내부 Place를 저장하지 않는다.
- 사용자가 검색 결과에서 장소를 선택해 기록을 저장할 때, 프론트가 카카오 응답의 장소 데이터를 Record 생성 요청(5.1)에 담아 전달한다.
- 서버는 `kakaoPlaceId` 기준으로 내부 Place를 upsert한다(이미 있으면 재사용).

## 4.2 내 Record 지도

```http
GET /api/core/v1/records/map?swLat={swLat}&swLng={swLng}&neLat={neLat}&neLng={neLng}&keyword={keyword}
```

Query:

| 이름 | 필수 | 설명 |
|---|---:|---|
| `swLat` | X | 남서 위도 |
| `swLng` | X | 남서 경도 |
| `neLat` | X | 북동 위도 |
| `neLng` | X | 북동 경도 |
| `keyword` | X | 장소명·주소 부분 일치 검색어 |
| `keywordId` | X | AI 키워드 id. 이 키워드가 붙은 Record만 남긴다 |

**`keyword`와 `keywordId`는 다른 것이다.** `keyword`는 사용자가 검색창에 친 **글자**로 장소명·주소를 찾고, `keywordId`는 4.3이 내려준 **AI 키워드**로 Record를 거른다. 이름이 비슷하니 프론트에서 섞어 쓰지 않도록 주의한다.

- bbox 파라미터 없이 호출하면(최초 진입) 내 **전체** 마커를 반환한다.
- bbox를 주면 해당 범위의 마커만 반환한다(지도 이동 시).
- `keyword`를 주면 장소명(`name`) **또는** 주소(`address`)에 검색어가 부분 일치(대소문자 무시)하는 마커만 반환한다. 생략하거나 빈 문자열·공백뿐이면 필터하지 않는다. `%`·`_`는 와일드카드가 아니라 문자 그대로 검색된다.
- `keywordId`를 주면 그 키워드가 붙은 Record의 마커만 반환한다. 값은 4.3의 `items[].keywordId`를 그대로 넘긴다.
- 존재하지 않거나 비활성·비공개 처리된 `keywordId`는 **400이 아니라 빈 `items`의 200**이다. 프리셋이 꺼지는 것은 사용자 잘못이 아니므로 오류로 다루지 않는다.
- `keyword`·`keywordId`는 bbox와 독립적으로 조합할 수 있다(전부 AND). bbox의 "모두 주거나 모두 생략" 규칙에 이 둘은 포함되지 않는다.
- 응답은 현재 로그인 사용자의 활성 Record와 연결된 Place만 포함한다.
- `items`는 장소명 오름차순(동명이면 `recordId` 오름차순)으로 정렬된다.

```json
{
  "success": true,
  "data": {
    "bounds": { "swLat": 37.4979, "swLng": 126.9270, "neLat": 37.5665, "neLng": 127.0557 },
    "items": [
      { "recordId": 8801, "placeId": 5501, "name": "앤트러사이트 성수", "lat": 37.5447, "lng": 127.0557, "latestCollectionId": 7001 }
    ]
  }
}
```

- `bounds`는 반환된 마커 전체를 포함하는 **최소 사각형**이다. 프론트는 최초 진입 시 `fitBounds(bounds, padding)`으로 모든 마커가 한눈에 보이는 최소 화면(여유 포함)을 만든다.
- 결과가 없으면 `bounds: null`, 1개면 해당 좌표의 점 사각형(sw = ne)이다.
- `latestCollectionId`는 그 Record가 **가장 최근에 담긴** Collection의 id다(마커 색상 구분용). "가장 최근"은 컬렉션 내부 정렬과 같은 담은 시각 기준이며, 어느 Collection에도 담기지 않은 Record는 `null`이다. 컬렉션에서 뺀(삭제된) 연결은 판단에서 제외된다.

## 4.3 지도 범위의 내 키워드 상위 5건

```http
GET /api/core/v1/records/map/keywords?swLat={swLat}&swLng={swLng}&neLat={neLat}&neLng={neLng}
```

검색창 밑에 띄우는 추천 칩이다. 누르면 그 `keywordId`로 4.2를 다시 호출해 지도를 거른다.

Query:

| 이름 | 필수 | 설명 |
|---|---:|---|
| `swLat` | X | 남서 위도 |
| `swLng` | X | 남서 경도 |
| `neLat` | X | 북동 위도 |
| `neLng` | X | 북동 경도 |

- bbox 규칙은 4.2와 같다 — **넷 다 주거나 모두 생략**한다. 일부만 주면 400이다.
- 개수는 서버가 5로 고정한다. 개수 파라미터가 없다.

```json
{
  "success": true,
  "data": {
    "items": [
      { "keywordId": 12, "displayName": "카페", "recordCount": 12 },
      { "keywordId": 7, "displayName": "산책", "recordCount": 5 }
    ]
  }
}
```

- `recordCount`는 **Record 수**다. 같은 키워드가 한 Record의 Context 여러 개에 붙어 있어도 1로 센다 — 지도 핀 하나가 Record 하나이므로 칩의 숫자와 핀 개수가 같은 규칙으로 세어진다.
- 집계 범위는 **전체 기간 × bbox 안**이다. 기간 파라미터는 없다.
- 정렬은 `recordCount` 내림차순이고, 같으면 `keywordId` 오름차순이다.
- 대상이 5개 미만이면 있는 만큼, 없으면 `items: []`인 200이다. 404가 아니다.
- AI 판정이 끝나지 않은 Context는 집계에서 빠진다. 갓 만든 Record는 칩에 반영되기까지 시간이 걸린다.

### 프론트 구현 규약

**칩 계산은 bbox만 반영한다.** 검색창에 친 `keyword`도, 지금 적용 중인 `keywordId`도 반영하지 않는다. 적용 중인 필터를 반영하면 그 키워드를 뺀 나머지 칩이 전부 0이 되어 사라지고, 사용자가 다른 칩으로 갈아탈 수 없게 된다.

**칩 숫자와 화면의 핀 수는 같아야 한다.** 같은 bbox에서 `keywordId`로 거른 4.2의 `items` 개수와 이 응답의 `recordCount`는 일치한다. 어긋나 보이면 두 요청의 bbox가 다른 것이다.

**두 요청의 bbox 동기화는 프론트 책임이다.** 4.2와 4.3은 별도 호출이라 완료 순서에 보장이 없다. 빠르게 패닝하면 칩은 bbox A의 결과, 마커는 bbox B의 결과가 화면에 함께 뜰 수 있다. 요청마다 토큰을 들고 **늦게 도착한 응답을 버려야 한다.**

호출 횟수를 줄이는 세 가지를 함께 적용한다.

- **디바운스** — 지도 idle 후 약 300ms. 드래그 중 쏟아지는 이벤트를 1회로 접는다.
- **bbox 양자화** — 뷰포트를 격자에 맞춰 반올림해서 보낸다. 미세한 팬이 같은 요청이 되어 재호출이 사라지고 직전 응답을 그대로 재사용할 수 있다.
- **줌 임계** — 전국이 보이는 줌에서는 호출하지 않는다. 그 범위의 칩은 의미가 없다.

## 4.4 발견한 Place 저장

Feed나 공개 Collection에서 발견한 장소의 저장도 별도 API 없이 Record 생성(5.1)을 사용한다. 공개 응답에 포함된 장소 데이터를 그대로 전달한다.

Feed에서 실행된 저장이라면 성공 후 클라이언트가 별도로 `SAVE` 이벤트를 전송한다.

---

# 5. Record·Context 상세

## 5.1 Record 생성

```http
POST /api/core/v1/records
```

```json
{
  "place": {
    "kakaoPlaceId": "1234567",
    "name": "앤트러사이트 성수",
    "address": "성동구 성수동2가 273-1",
    "roadAddress": "성동구 연무장길 47",
    "phone": "02-1234-5678",
    "placeUrl": "http://place.map.kakao.com/1234567",
    "lat": 37.5447,
    "lng": 127.0557
  },
  "contextBody": "비 오는 날 친구와 가려고 저장"
}
```

- 프론트가 카카오 로컬 API 응답의 장소 데이터를 그대로 전달한다.
- 서버는 `kakaoPlaceId` 기준으로 내부 Place를 upsert한다. 동일 `kakaoPlaceId`의 Place가 이미 있으면 전달된 값으로 갱신하지 않고 기존 행을 재사용한다(저장 시점 스냅샷 원칙).
- 필수: `kakaoPlaceId`, `name`, `address`, `lat`, `lng`. 좌표 범위 등 형식 검증 실패 시 400.
- `contextBody`는 최대 **500자**다(1.9).

동일 장소에 내 활성 Record가 이미 있으면 거절하지 않고 **기존 Record에 Context만 추가**한다.

```text
내 활성 Record 없음 → Record + 첫 Context 생성 → 201 (result: RECORD_CREATED)
내 활성 Record 존재 → 기존 Record에 Context 추가 → 200 (result: CONTEXT_ADDED)
```

응답(공통):

```json
{
  "success": true,
  "data": {
    "result": "RECORD_CREATED",
    "recordId": 8801,
    "place": {
      "placeId": 5501,
      "name": "앤트러사이트 성수",
      "address": "성동구 성수동2가 273-1",
      "lat": 37.5447,
      "lng": 127.0557
    },
    "contexts": [
      {
        "contextId": 91001,
        "body": "비 오는 날 친구와 가려고 저장",
        "createdAt": "2026-07-23T10:00:00Z"
      }
    ],
    "keywords": [],
    "createdAt": "2026-07-23T10:00:00Z"
  }
}
```

- `CONTEXT_ADDED`일 때 `contexts`는 기존 것을 포함한 활성 Context 전체다.

## 5.2 Record 상세

```http
GET /api/core/v1/records/{recordId}?contextSort=CREATED_AT_ASC
```

Query:

| 이름 | 필수 | 설명 |
|---|---:|---|
| `contextSort` | X | `CREATED_AT_ASC`(기본, 오래된순) 또는 `CREATED_AT_DESC`. 프론트가 상수로 고정해 보낸다(1.4) |

본인 소유 Record만 조회한다. `contexts`는 배열이며, 기본은 `createdAt`(최초 작성 시각) 오름차순 — 오래된 것부터 — 이다. Collection 상세(7.3) 안의 `records[].contexts`는 파라미터 없이 항상 오름차순이다.

## 5.3 장소로 내 Record 조회

```http
GET /api/core/v1/records/by-place?kakaoPlaceId=1234567
```

프론트가 카카오 장소 상세 화면에서 이 장소에 내 기록이 이미 있는지 확인할 때 사용한다.

```json
{ "success": true, "data": { "record": null } }
```

```json
{
  "success": true,
  "data": {
    "record": {
      "recordId": 8801,
      "place": { },
      "contexts": [ ],
      "keywords": []
    }
  }
}
```

- 내 활성 Record가 없으면 `record: null`(200). 404가 아니다 — 미저장 장소 조회는 정상 흐름이다.
- 있으면 Record 상세와 동일한 DTO를 반환한다. 프론트는 기존 맥락 표시와 `POST /records`의 CONTEXT_ADDED 분기 예측에 사용한다.

## 5.4 Context 추가

```http
POST /api/core/v1/records/{recordId}/contexts
```

```json
{
  "body": "실제로 방문했고 창가 자리가 좋았음"
}
```

- 공백만이면 400.
- `body`는 최대 **500자**다(1.9).

201:

```json
{
  "success": true,
  "data": {
    "contextId": 91003,
    "body": "실제로 방문했고 창가 자리가 좋았음",
    "createdAt": "2026-07-23T10:10:00Z",
    "keywords": []
  }
}
```

## 5.5 Context 수정

```http
PATCH /api/core/v1/records/{recordId}/contexts/{contextId}
```

```json
{
  "body": "주말 오후에 다시 가고 싶은 카페"
}
```

`body`는 최대 **500자**다(1.9).

Context 수정은 내부적으로 기존 Context를 소프트 삭제하고 새 Context를 생성하는 교체 방식으로 처리할 수 있다.

응답은 최신 ID를 반환한다. `createdAt`은 구 Context의 최초 작성 시각을 그대로 승계한다(`origin_created_at`) — 수정해도 목록 위치와 표시 시각이 바뀌지 않는다.

```json
{
  "success": true,
  "data": {
    "contextId": 91002,
    "body": "주말 오후에 다시 가고 싶은 카페",
    "createdAt": "2026-07-23T10:00:00Z",
    "keywords": []
  }
}
```

프론트는 기존 `contextId`를 새 ID로 교체해야 한다. `createdAt`은 바뀌지 않는다.

## 5.6 Context 삭제

```http
DELETE /api/core/v1/records/{recordId}/contexts/{contextId}
```

- 마지막 Context가 아니면 Context만 삭제한다(204).
- 마지막 Context라면 삭제하지 않고 409로 거절한다. Record 삭제 영향과 연쇄 Collection 삭제 영향을 `impact`로 반환한다.

```http
409 Conflict
```

```json
{
  "success": false,
  "error": {
    "code": "DELETE_CONFIRMATION_REQUIRED",
    "message": "마지막 Context를 삭제하면 Record와 일부 Collection이 함께 삭제됩니다.",
    "fieldErrors": [],
    "traceId": "3f1c9a7e-58b2-4d6a-9f0e-7c2b1d4e8a55",
    "impact": {
      "recordDeleted": true,
      "collectionIds": [7001]
    }
  }
}
```

프론트는 `error.impact`를 기반으로 사용자에게 안내한 뒤, 확인을 받으면 `DELETE /records/{recordId}/force`(5.8)를 호출한다.

## 5.7 Record 삭제

```http
DELETE /api/core/v1/records/{recordId}
```

- 프론트는 이 Record가 어떤 Collection의 마지막 Record인지 알 수 없다. 서버가 DB에서 확인한다.
- 마지막 Record인 활성 Collection이 없으면: Record·Context 소프트 삭제, Collection 연결 소프트 삭제, AI 파생 데이터 무효화 — State `CANCELLED` + Embedding `is_deleted`(204). 물리 삭제 시점은 미결이며 별도 개인정보 정책을 따른다([06 §1.1](06_데이터모델_및_무결성.md)).
- 마지막 Record인 활성 Collection이 있으면: 삭제하지 않고 409로 거절한다.

```http
409 Conflict
```

```json
{
  "success": false,
  "error": {
    "code": "DELETE_CONFIRMATION_REQUIRED",
    "message": "이 기록을 삭제하면 일부 컬렉션이 함께 삭제됩니다.",
    "fieldErrors": [],
    "traceId": "3f1c9a7e-58b2-4d6a-9f0e-7c2b1d4e8a55",
    "impact": {
      "recordDeleted": true,
      "collectionIds": [7001, 7002]
    }
  }
}
```

## 5.8 Record 강제 삭제

```http
DELETE /api/core/v1/records/{recordId}/force
```

- 5.6·5.7에서 409를 받은 프론트가 사용자 안내·확인 후 호출한다.
- Record·활성 Context 전체 소프트 삭제, Collection 연결 소프트 삭제, **마지막 Record였던 Collection 소프트 삭제**, AI 파생 데이터 무효화(State `CANCELLED` + Embedding `is_deleted`)를 한 트랜잭션으로 수행한다.
- 204.
- 연쇄 삭제 대상이 없어도 정상 수행한다(일반 삭제와 동일 결과).

## 5.9 최근 Record 목록

```http
GET /api/core/v1/records/recent?cursor=&size=1
```

홈 화면의 "최근 기록" 영역이 쓴다. 최근 7일 안에 만든 **내** Record만 최신순으로 반환한다.

> 조회 API이지만 5.4~5.8 뒤에 붙인 것은 번호를 밀지 않기 위해서다. 5.4~5.8은 본문 여러 곳과 백엔드 주석이 번호로 참조하고 있다.

Query:

| 이름 | 필수 | 설명 |
|---|---:|---|
| `cursor` | X | 1.4의 불투명 커서. 없으면 첫 페이지 |
| `size` | X | **기본 1**. 0 이하는 1로, 100 초과는 100으로 접힌다 |

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "recordId": 8801,
        "place": { },
        "keywords": ["조용한", "디저트"],
        "createdAt": "2026-08-06T11:20:31Z"
      }
    ],
    "nextCursor": "MjAyNi0wOC0wNlQxMToyMDozMVosODgwMQ",
    "hasNext": true
  }
}
```

- **기간은 서버가 7일로 고정한다.** 기간 파라미터가 없다.
- **정렬은 `createdAt` 내림차순 고정이다.** 정렬 파라미터가 없다 — "최근"이 곧 정렬이다. 같은 시각은 `recordId` 내림차순으로 끊는다.
- 카드에 **Context 본문이 없다.** 본문이 필요하면 `recordId`로 5.2를 호출한다.
- `keywords`는 소유자 범위(`PUBLIC` + `PRIVATE_ONLY`) 집계이며, 없으면 `null`이 아니라 빈 배열이다. **AI 판정 전과 "키워드 0건"을 구분하지 않는다** — 6.1의 `keywordStatus`를 여기서는 제공하지 않으므로, 갓 만든 Record는 화면에 키워드 없이 그려진다.
- 7일 안에 Record가 없으면 `items: []`인 200이다. 404가 아니다.
- 페이징 도중 7일 경계는 요청마다 다시 계산된다. 커서를 오래 쥐고 있다가 다음 페이지를 부르면 경계에 걸친 항목이 빠질 수 있으나, 최신순이라 **이미 받은 항목이 다시 오지는 않는다.**

## 5.10 Record가 담긴 내 Collection 목록

```http
GET /api/core/v1/records/{recordId}/collections?cursor={cursor}&size=20&sort=CREATED_AT_ASC
```

Record 상세 화면에서 "이 기록이 담긴 내 책" 목록을 Collection 카드로 보여줄 때 쓴다. **본인 소유 Record만** 대상이다.

Query:

| 이름 | 필수 | 설명 |
|---|---:|---|
| `cursor` | X | 1.4의 불투명 커서. 없으면 첫 페이지 |
| `size` | X | 1.4의 공통 규칙. 기본 20, 서버 방어 상한 100 |
| `sort` | X | `CREATED_AT_ASC`(기본, 오래된순) 또는 `CREATED_AT_DESC`. 7.2와 같은 규칙 |

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "collectionId": 41,
        "title": "비 오는 날 카페",
        "recordCount": 7,
        "keywords": ["조용한", "디저트"],
        "coverImageUrl": "/image/files/3f2a9c1e-8d4b-4f6a-9c0e-5b7d2e8a1c44_image_0.webp",
        "publishedAt": "2026-08-01T02:11:07Z",
        "createdAt": "2026-08-01T02:11:07Z"
      }
    ],
    "nextCursor": "MjAyNi0wOC0wMVQwMjoxMTowN1osNDE",
    "hasNext": true
  }
}
```

- **정렬 기준은 Collection의 생성 시각이다**(7.2와 같음). 그 Record를 담은 시각이 아니다 — 사용자가 책장에서 보던 순서가 여기서도 유지된다. 같은 시각은 `collectionId`로 끊는다.
- 어느 Collection에도 담기지 않은 Record는 `items: []`인 200이다. 404가 아니다.
- 없는 `recordId`와 **타인의 `recordId`는 모두 404**다. 존재 여부를 응답으로 구분하지 않는다(5.2와 같은 규약).
- `keywords`는 Collection 단위 `PUBLIC` 집계이며 없으면 `null`이 아니라 빈 배열이다. 내 목록이지만 **남이 보는 표지와 같은 글자**를 싣는다. AI 판정 전과 "키워드 0건"을 구분하지 않는다(10.1과 같은 계약).
- `coverImageUrl`은 `null`이어도 필드를 생략하지 않는다(7.7).
- **목록 길이에 상한이 없다.** 한 Record가 담길 수 있는 Collection 수에는 제한이 없으므로(1.9의 상한은 요청 1회의 배열 크기다) 프론트는 커서를 끝까지 따라갈 수 있어야 한다.
- 이 목록은 추천이 아니라 내 데이터 조회다. `requestId`·`position`이 없으며 **Feed 이벤트(10.2)를 보내지 않는다.**

---

# 6. AI 자연어 검색 상세

## 6.1 검색

```http
POST /api/core/v1/search/records
```

```json
{
  "query": "비 오는 날 친구와 가려고 저장한 카페",
  "size": 20
}
```

검색은 페이지네이션하지 않는다. 유사도 상위 `size`개(기본 20)를 단일 응답으로 반환한다. 유사도 정렬은 커서 기준이 불안정하고, 하위 결과는 유사도가 낮아 노출 가치가 없다.

검색 범위:

- 현재 로그인 사용자의 **활성 Context 임베딩 단일 경로**다. 질의 전체를 1회 임베딩해 Context 단위 유사도(정확 cosine)를 구하고, Record 단위로 집계한다(최고 유사도 Context가 `matchedContext` 대표).
- Place·Keyword는 독립 검색 경로가 아니다([AI 설계](05_AI_설계.md) §9.4 MVP 제외 — 독립 Place·Keyword 후보 검색).

응답:

```json
{
  "success": true,
  "data": {
    "bounds": { "swLat": 37.4979, "swLng": 126.9270, "neLat": 37.5665, "neLng": 127.0557 },
    "items": [
      {
        "recordId": 8801,
        "similarity": 0.82,
        "place": {
          "placeId": 5501,
          "name": "앤트러사이트 성수",
          "address": "성동구 연무장길 47",
          "lat": 37.5447,
          "lng": 127.0557
        },
        "matchedContext": {
          "contextId": 91001,
          "body": "비 오는 날 친구와 가려고 저장",
          "createdAt": "2026-07-23T10:00:00Z"
        },
        "keywords": ["친구", "비 오는 날"],
        "keywordStatus": "COMPLETED",
        "createdAt": "2026-07-20T09:00:00Z"
      }
    ]
  }
}
```

- `bounds`는 검색 결과 Record들의 Place 전체를 포함하는 최소 사각형이다(4.2와 동일 규칙: 결과 없으면 `null`). 프론트는 검색 결과를 지도에 띄울 때 `fitBounds(bounds, padding)`을 사용한다.
- `keywords`는 매칭된 Context의 Keyword가 아니라 **해당 Record의 활성 Context 전체 Keyword 집계값**이다(`ai.context_keyword`를 Record 단위로 집계, 중복 제거).
- `keywords`는 `keyword_preset`의 `display_name` 문자열 배열이다. `code`는 내부 식별용으로 노출하지 않는다(모든 Keyword 응답 공통). 지역·Place 카테고리(예: "카페")는 프리셋에 없으므로 Keyword로 나올 수 없다.
- `keywordStatus`는 그 Record의 **Keyword 판정 상태**다. **항상 반환하며 `null`이 아니다.** `keywords`가 빈 배열일 때 그것이 최종인지 아닌지를 이 값 하나로 가른다.

#### `keywordStatus`

| 값 | 뜻 | 화면 |
|---|---|---|
| `COMPLETED` | 판정이 끝났다. `keywords`가 최종이다 | 0건이면 "이 기록엔 키워드가 없어요" |
| `PROCESSING` | 아직 처리 중이다. 기다리면 채워진다 | "분석 중"이 사실인 유일한 경우 |
| `FAILED` | 처리가 끝내 실패했다. 기다려도 오지 않는다 | 재시도·문의 유도 |

**프론트가 분기해야 하는 것은 `PROCESSING` 하나다.** 나머지 둘은 `keywords`를 그대로 그리면 된다. **필드를 읽지 않아도 기존 동작과 같다** — `keywords`의 의미와 값은 이 필드가 생기기 전과 동일하다.

세 값은 AI 파트의 내부 상태(`ai.context_ai_state.keyword_status`, 5값)를 그대로 내보낸 것이 아니라 **응답용으로 접은 값**이다. 사용자에게 필요한 판단이 「기다리면 오는가」 하나이기 때문이다. Record 하나에 활성 Context가 여럿일 수 있어 Record 단위로 접으며, 규칙과 근거는 AI 파트 명세가 원본이다([back `docs/ai/spec/ai-response-assembly.md` §5.1](https://github.com/Team-PinLog/back/blob/dev/docs/ai/spec/ai-response-assembly.md)).

```text
활성 Context 중 하나라도 처리 중   →  PROCESSING   (그것이 끝나면 Keyword가 더 붙는다)
그렇지 않고 하나라도 실패          →  FAILED
그 밖                              →  COMPLETED
```

`PROCESSING`은 무한히 지속되지 않는다. 재스캔이 만료된 처리 중 상태를 `FAILED`로 전이시키므로 화면의 "분석 중"에는 상한이 있다.

**다른 응답에는 이 필드가 없다.** 검색은 소유자 전용 응답이라 자기 기록의 처리 상태를 봐도 되지만, 타인 응답(공개 Collection·책장·타인 Record 카드)에 실으면 남의 AI 처리 진행 상황이 새어 나간다. 그쪽 `keywords`는 종전대로 빈 배열이 최종인지 아닌지를 구분하지 않는다.

### 검색 결과 카드 요구사항

- Context 미리보기를 위해 `matchedContext.body`를 반환한다.
- 수정·삭제를 위해 `recordId`와 `matchedContext.contextId`를 반환한다.
- 결과 선택 후 다음 API를 그대로 사용한다.

```text
PATCH  /records/{recordId}/contexts/{contextId}
DELETE /records/{recordId}/contexts/{contextId}
```

검색 선택 이유를 별도 자연어 문장으로 생성하지 않는다.  
`similarity`는 정렬 근거·디버깅용으로 **항상 반환한다**. UI 노출 여부는 프론트가 결정한다.

---

# 7. Collection 상세

## 7.1 Collection 생성

```http
POST /api/core/v1/collections
```

```json
{
  "title": "비 오는 날의 카페",
  "recordIds": [8801, 8802, 8803]
}
```

규칙:

- 제목 필수
- 제목 최대 20자
- Record 1개 이상, `recordIds` 최대 **100개**(1.9)
- 본인 활성 Record만 추가 가능
- 생성 즉시 자동 발행
- 동일 Record 중복 추가 금지
- **표지는 생성 요청에 없다.** 표지 생성은 GPU 비동기 잡이라 완료를 기다리면 생성 버튼이 생성 큐에 묶인다. 표지는 확정된 뒤 7.4로 등록한다(플로우는 7.7)

응답:

```json
{
  "success": true,
  "data": {
    "collectionId": 7050,
    "title": "비 오는 날의 카페",
    "recordCount": 3,
    "coverImageUrl": null,
    "publishedAt": "2026-07-23T10:00:00Z",
    "createdAt": "2026-07-23T10:00:00Z"
  }
}
```

생성 직후 `coverImageUrl`은 항상 `null`이다.

## 7.2 내 Collection 목록

```http
GET /api/core/v1/collections?cursor={cursor}&size=10&sort=CREATED_AT_ASC
```

Query:

| 이름 | 필수 | 설명 |
|---|---:|---|
| `sort` | X | `CREATED_AT_ASC`(기본, 오래된순) 또는 `CREATED_AT_DESC`. 프론트가 상수로 고정해 보낸다(1.4) |

정렬 기본은 `collection.created_at ASC`(오래된순), 동률이면 `id ASC`다.

이 Endpoint는 내 Collection 관리 화면과 Library 내 책장 세로 스크롤에서 함께 사용한다. Library 전용 Endpoint는 없다(2.6·9.1·14장 5번).

Feed(추천 Collection 노출)는 이 정렬 기준과 무관하다 — 추천 정렬은 Feed 파트가 별도로 정한다.

## 7.3 Collection 상세 통합 조회

```http
GET /api/core/v1/collections/{collectionId}?recordCursor={cursor}&recordSize=2
```

Query:

| 이름 | 필수 | 설명 |
|---|---:|---|
| `recordCursor` | X | 다음 CollectionRecord 커서 |
| `recordSize` | X | 반환할 Record 수, 기본 1 |
| `recordSort` | X | `ADDED_AT_ASC`(기본, 담은 순서 오래된순) 또는 `ADDED_AT_DESC`. 프론트가 상수로 고정해 보낸다(1.4) |

정렬:

```text
collection_records.created_at ASC (기본), 동률이면 id ASC
```

각 Record 안의 `contexts`는 `recordSort`와 무관하게 항상 `createdAt` 오름차순이다(5.2).

### 소유자 조회 응답

```json
{
  "success": true,
  "data": {
    "collectionId": 7050,
    "title": "비 오는 날의 카페",
    "ownedByMe": true,
    "follow": null,
    "coverImageUrl": "/image/files/3f2a9c1e-8d4b-4f6a-9c0e-5b7d2e8a1c44_image_0.webp",
    "records": {
      "items": [
        {
          "recordId": 8801,
          "place": {},
          "contexts": [
            {
              "contextId": 91001,
              "body": "비 오는 날 친구와 가려고 저장",
              "createdAt": "2026-07-23T10:00:00Z"
            }
          ],
          "keywords": [],
          "createdAt": "2026-07-20T09:00:00Z",
          "addedToCollectionAt": "2026-07-23T11:00:00Z"
        }
      ],
      "nextCursor": null,
      "hasNext": false
    },
    "publishedAt": "2026-07-23T10:00:00Z",
    "createdAt": "2026-07-23T10:00:00Z",
    "updatedAt": "2026-07-23T10:00:00Z"
  }
}
```

### 타인 공개 Collection 응답

같은 DTO를 사용하되 `contexts`를 `null`로 반환한다.

```json
{
  "success": true,
  "data": {
    "collectionId": 7001,
    "title": "성수 산책 코스",
    "ownedByMe": false,
    "follow": {
      "followed": true,
      "followId": 701,
      "alias": "서울 카페"
    },
    "coverImageUrl": null,
    "records": {
      "items": [
        {
          "recordId": 9901,
          "place": {},
          "contexts": null,
          "keywords": ["산책", "카페"],
          "createdAt": "2026-07-18T09:00:00Z",
          "addedToCollectionAt": "2026-07-18T11:00:00Z"
        }
      ],
      "nextCursor": "opaque-record-cursor",
      "hasNext": true
    },
    "publishedAt": "2026-07-18T10:00:00Z",
    "createdAt": "2026-07-18T10:00:00Z",
    "updatedAt": "2026-07-20T10:00:00Z"
  }
}
```

공개 조회에서 금지되는 정보:

- Context 원문
- 사용자 내부 ID
- 실명
- 닉네임
- 소셜 계정
- 팔로워·팔로잉 목록
- 다른 팔로워가 설정한 별칭

## 7.4 제목·표지 수정

```http
PATCH /api/core/v1/collections/{collectionId}
```

소유자만 가능하다.

```json
{
  "title": "비 오는 날 다시 갈 카페",
  "coverImageUrl": "/image/files/3f2a9c1e-8d4b-4f6a-9c0e-5b7d2e8a1c44_image_0.webp"
}
```

두 필드 모두 선택이며 최소 하나는 있어야 한다. **보내지 않았거나 `null`인 필드는 기존 값을 유지한다** — 제목만 고칠 때 표지가 지워지지 않는다.

`coverImageUrl` 규칙:

- 이미지 서비스 최종본의 같은 origin 상대 경로만 받는다. 패턴은 `^/image/files/[A-Za-z0-9._-]+\.webp$`이며, 그 외(외부 절대 URL, 다른 경로, 다른 확장자)는 `400 INVALID_INPUT`이다. 프론트가 보낸 값을 그대로 믿고 저장하면 임의 문자열이 표지로 들어가므로 서버가 반드시 검증한다.
- **표지 제거(비우기)는 제공하지 않는다.** 등록·교체만 있다. MVP UX에 제거 화면이 없고, JSON에서 "필드 생략"과 "null 명시"를 구분해 제거를 표현하는 비용이 실익보다 크다. 제거가 필요해지면 `DELETE /collections/{collectionId}/cover`를 별도로 더한다.
- 서버는 해당 파일의 실제 존재 여부는 검증하지 않는다 — 존재 확인은 이미지 서비스 호출이 필요해 결합이 생긴다. 프론트는 상태 폴링에서 `final.status: "done"`으로 확인한 `final.url`만 보낸다(7.7).
- 같은 필드로 표지 재등록(교체)도 처리한다. 별도 API를 두지 않는다.

## 7.5 Record 추가

```http
POST /api/core/v1/collections/{collectionId}/records
```

```json
{
  "recordIds": [8804, 8805]
}
```

- `recordIds`는 최대 **100개**다(1.9).
- 이미 담긴 Record가 섞여 있으면 실패시키지 않고 **중복만 건너뛰고 나머지를 담는다**(멱등).
- 각 관계의 `collection_records.created_at`이 Collection 내부 표시 순서의 기준이 된다.

## 7.6 Record 제거

```http
DELETE /api/core/v1/collections/{collectionId}/records/{recordId}
```

마지막 Record 제거 요청은 409 `DELETE_CONFIRMATION_REQUIRED`로 거절한다. 프론트는 "컬렉션도 함께 사라짐"을 안내한 뒤, 확인을 받으면 `DELETE /collections/{collectionId}`를 호출한다.

## 7.7 표지 이미지

Collection 표지는 이미지 서비스(INFRA 소유 `Team-PinLog/image`, `/image/api/*`, 연동 계약은 front#99 가이드)가 생성하고, **core는 최종본 URL만 저장한다.** 전체 플로우는 프론트가 오케스트레이션한다 — 화풍 6종 중 사용자가 하나를 고르는 UI 단계가 있어 서버가 뒤에서 대신할 수 없다.

```text
POST /collections { title, recordIds }        -- 표지 없이 즉시 생성 (7.1)
→ POST /image/api/covers { title, keywords }  -- 후보 6종 생성 시작 (이미지 서비스)
→ GET  /image/api/covers/{requestId}          -- 1초 폴링, done 카드부터 표시
→ POST /image/api/covers/{requestId}/select   -- 화풍 선택
→ final.status가 done이 되면
→ PATCH /collections/{collectionId} { coverImageUrl: final.url }  (7.4)
```

규칙:

- **Collection 생성은 표지를 기다리지 않는다.** GPU 큐 상황에 따라 표지는 수십 초 뒤에 완료될 수 있고, 그동안 Collection은 표지 없이 정상 동작한다.
- `coverImageUrl`은 Collection이 실리는 모든 응답에 포함된다 — 생성(7.1)·상세(7.3)·책장 탐색(8.1)·팔로우 책장(9.2·9.3)·Feed(10.1). **`null`이어도 필드를 생략하지 않는다.** 프론트는 `null`이거나 이미지 로드에 실패하면 기본 표지로 폴백한다.
- 이미지는 **세로형 2:3 비율**(미리보기 512×768 WebP)이다. `aspect-ratio: 2 / 3` + `object-fit: cover`로 표시하면 로딩 전 영역이 확보된다.
- 사용자가 화풍을 고르기 전에 이탈하면 표지 없는 Collection이 남는다. 오류가 아니라 정상 상태이며, 표지는 이후 언제든 7.4로 등록·교체할 수 있다. 프론트는 재등록 진입점을 제공한다.
- 원본 파일의 보관·서빙은 이미지 서비스 책임이다. 파일은 영속 볼륨에 남고 정리 배치가 없어 URL 참조가 유지된다(파트간 요구사항 §3.1). 파일이 사라지면 표지가 깨진 링크가 되므로, 이미지 서비스가 정리 정책을 도입할 때는 이 계약을 먼저 확인해야 한다.

---

# 8. 공개 책장 탐색과 Follow

## 8.1 최초 공개 책장 탐색

```http
GET /api/core/v1/feed/collections/{collectionId}/shelf?cursor={cursor}&size=20&sort=CREATED_AT_ASC
```

`collectionId`를 공개 진입점으로 사용해 해당 Collection 작성자의 다른 공개 Collection을 조회한다.

`size`는 공통 커서 계약을 따른다 — 기본값 `CursorPage.DEFAULT_SIZE`(20), 서버 방어 상한 `CursorPage.MAX_SIZE`(100), 범위 밖 값은 `CursorPage.normalizeSize`가 보정한다. 같은 Feed 네임스페이스의 `GET /feed/collections`와 기본 크기를 맞춘다.

정렬은 7.2와 같다 — 기본 `collection.created_at ASC`(오래된순), `sort=CREATED_AT_DESC`로 최신순. 같은 작성자의 발행 Collection 조회를 9.3과 공유하므로 규칙도 같이 간다.

응답:

```json
{
  "success": true,
  "data": {
    "sourceCollectionId": 7001,
    "follow": {
      "followed": false,
      "followId": null,
      "alias": null
    },
    "collections": {
      "items": [
        {
          "collectionId": 7001,
          "title": "성수 산책 코스",
          "recordCount": 5,
          "keywords": ["산책", "카페"],
          "coverImageUrl": null,
          "createdAt": "2026-07-18T10:00:00Z"
        }
      ],
      "nextCursor": null,
      "hasNext": false
    }
  }
}
```

응답에 작성자의 내부 사용자 ID를 포함하지 않는다.

## 8.2 Follow 생성

```http
POST /api/core/v1/follows
```

```json
{
  "collectionId": 7001
}
```

- `collectionId`는 공개 진입점이다. 작성자의 사용자 ID를 프론트가 알 수 없으므로, 발견한 Collection의 id로 그 작성자의 책장을 팔로우한다.
- **생성 시 별칭은 없다.** 별칭은 이후 라이브러리에서 `PATCH /follows/{followId}`(8.3)로 등록한다.

서버 처리:

```text
공개 Collection 조회 (collectionId)
→ 작성자 식별
→ 자기 자신 Follow 금지 확인
→ 활성 중복 Follow 확인
→ Follow 생성
```

응답:

```json
{
  "success": true,
  "data": {
    "followId": 701,
    "alias": null,
    "createdAt": "2026-07-23T10:00:00Z"
  }
}
```

## 8.3 별칭 수정·제거

```http
PATCH /api/core/v1/follows/{followId}
```

```json
{
  "alias": "취향 좋은 카페"
}
```

별칭 제거:

```json
{
  "alias": null
}
```

`alias` **키를 생략한 요청(`{}`)도 제거로 처리한다.** 서버는 키 부재와 명시적 `null`을 구분하지 않는다.

```json
{}
```

규칙:

- 최대 20자
- 공백 제거 후 빈 문자열은 `null`
- 키 생략과 명시적 `null`은 같다 — 둘 다 제거
- 별칭은 지정한 본인만 볼 수 있음
- 동일 별칭 중복 허용

> **변경된 필드만 모아 보내는 방식이면 주의한다.** 별칭을 건드리지 않았는데 `alias` 키가 빠지면 지워진다. 유지하려면 현재 값을 그대로 실어 보낸다.
>
> Follow는 수정 가능한 필드가 `alias` 하나뿐이라 부분 수정 요청이 나올 이유가 없어 구분하지 않기로 했다. 구분이 필요한 리소스가 생기면 그때 도입한다.

## 8.4 Follow 해제

```http
DELETE /api/core/v1/follows/{followId}
```

성공:

```http
204 No Content
```

---

# 9. Follow 목록과 Library 화면 구성

Library는 프론트 페이지 명칭이고, Shelf(책장)는 사용자별 Collection 모음의 명칭이다. 전용 Endpoint 없이 아래 조합으로 구성한다.

## 9.1 구성과 커서

```text
내 책장          : GET /collections (내 Collection 목록)
팔로우 책장 이동  : GET /follows (팔로우 유저 페이지네이션 — 기본 이동 단위)
책장별 Collection : GET /follows/{followId}/collections (개별 페이지네이션)
책 내부 Record    : GET /collections/{collectionId}?recordCursor=… (9.4)
```

세 커서(팔로우 목록·책장별 Collection·Record)는 독립적이며 혼용할 수 없다.

**첫 화면은 `GET /follows`에 `collectionSize`를 더해 한 번에 받는다.** 책장마다 표지를 그려야 하는데 팔로우 목록 응답에 Collection이 없으면 책장 N개에 호출이 `1 + N`회가 된다. `collectionSize`를 주면 각 항목에 그 책장의 Collection 첫 페이지가 함께 실린다(9.2).

커서 독립 원칙은 그대로다 — 커서를 합치는 것이 아니라 **각 축의 첫 페이지를 한 응답에 실어 보내는 것**이다. 더보기는 여전히 `GET /follows/{followId}/collections`(9.3)이며, 9.2가 준 `collections.nextCursor`를 그대로 넣는다.

## 9.2 팔로우 목록

```http
GET /api/core/v1/follows?cursor={cursor}&size=2
```

```json
{
  "success": true,
  "data": {
    "items": [
      { "followId": 701, "alias": "서울 카페", "createdAt": "2026-07-23T10:00:00Z" },
      { "followId": 702, "alias": null, "createdAt": "2026-07-20T10:00:00Z" }
    ],
    "nextCursor": "opaque-cursor",
    "hasNext": true
  }
}
```

- 현재 로그인 사용자의 활성 Follow만 반환한다.
- 팔로우 대상의 신원 정보(내부 사용자 ID 등)는 포함하지 않는다.

### 책장별 Collection 함께 받기 — `collectionSize`

```http
GET /api/core/v1/follows?cursor={cursor}&size=10&collectionSize=5&collectionSort=CREATED_AT_ASC
```

| 파라미터 | 필수 | 설명 |
|---|:---:|---|
| `cursor`·`size` | X | **팔로우 축**. 공통 커서 계약(1.4)을 따른다 |
| `collectionSize` | X | **각 책장의 Collection 축**. 주면 항목마다 `collections`가 실린다. 없으면 위 기본 응답과 같다 |
| `collectionSort` | X | 동봉 `collections`의 정렬. `CREATED_AT_ASC`(기본) 또는 `CREATED_AT_DESC`. 팔로우 축 정렬(최신순)에는 영향이 없다 |

중첩 축에 접두어를 붙이는 것은 7.3(`recordCursor`·`recordSize`)과 같은 규약이다. 바깥 축은 이 Endpoint가 돌려주는 자기 축이므로 접두어 없이 `cursor`·`size`를 쓴다.

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "followId": 701,
        "alias": "서울 카페",
        "createdAt": "2026-07-23T10:00:00Z",
        "collections": {
          "items": [
            {
              "collectionId": 7001,
              "title": "연남 카페",
              "recordCount": 3,
              "keywords": ["조용한", "커피"],
              "coverImageUrl": "/image/files/3f2a9c1e-8d4b-4f6a-9c0e-5b7d2e8a1c44_image_0.webp",
              "createdAt": "2026-07-18T10:00:00Z"
            }
          ],
          "nextCursor": "opaque-cursor",
          "hasNext": true
        }
      }
    ],
    "nextCursor": "opaque-cursor",
    "hasNext": true
  }
}
```

- `collections`의 항목 형태는 9.3과 같다.
- `collections.nextCursor`는 **그 책장 전용**이며 9.3 Endpoint에 그대로 넣어 이어받는다. 바깥 `nextCursor`(팔로우 축)와 섞지 않는다. `collectionSort`를 바꿔 받았다면 9.3에도 같은 방향의 `sort`를 줘야 이어진다(1.4).
- Collection이 없는 책장도 항목으로 나오며 `collections.items`가 빈 배열이다.
- `collectionSize`를 주지 않으면 `collections` 필드 자체가 없다. 기존 호출은 영향받지 않는다. `size` 기본값도 1.4(20) 그대로다 — `collectionSize`가 있다고 달라지지 않는다.
- `size`·`collectionSize`에 0 이하나 상한 초과 값을 주면 400이 아니라 서버가 범위 안으로 보정한다.
- 첫 화면 권장 호출은 `size=10`·`collectionSize=5`(합계 최대 50행)다. 화면의 줄 수·표지 수에 맞춰 값을 바꾸면 된다.
- 서버는 페이지 전체의 Collection을 **한 번의 질의로** 모은다. 책장 수만큼 질의하지 않는다.

## 9.3 팔로우 책장의 Collection 목록

```http
GET /api/core/v1/follows/{followId}/collections?cursor={cursor}&size=6&sort=CREATED_AT_ASC
```

정렬은 7.2와 같다 — 기본 `collection.created_at ASC`(오래된순), `sort=CREATED_AT_DESC`로 최신순.

검증:

- `followId`가 현재 로그인 사용자의 활성 Follow인지 확인 (아니면 404)
- Follow 대상 사용자의 활성 공개 Collection만 반환
- 소프트 삭제된 데이터 제외

책을 선택하면 공통 상세 API(`GET /collections/{collectionId}`)를 호출한다. 타인 Collection이므로 각 Record의 `contexts`는 `null`이다. 내 책장의 Collection은 `GET /collections`를 그대로 사용한다.

## 9.4 펼친 책의 Record 페이지

```http
GET /api/core/v1/collections/{collectionId}?recordCursor={cursor}&recordSize=2
```

- 모바일 한 페이지에 Record 하나: `recordSize=1`
- 웹 펼친 책의 양쪽 페이지: `recordSize=2`
- 다음 페이지 이동 시 응답의 `records.nextCursor` 사용
- 정렬은 `collection_records.created_at ASC`(기본, 담은 순서 오래된순). `recordSort=ADDED_AT_DESC`로 최신순(7.3)

---

# 10. Feed·추천 상세

## 10.1 추천 목록

```http
GET /api/core/v1/feed/collections?cursor={cursor}&size=20
```

응답 생성 시 서버는 포함된 각 Collection의 IMPRESSION을 기록한다.

```json
{
  "success": true,
  "data": {
    "requestId": "5b2c0000-0000-0000-0000-000000000000",
    "items": [
      {
        "position": 0,
        "collectionId": 7001,
        "title": "비 오는 날의 카페",
        "recordCount": 5,
        "keywords": ["조용한", "커피"],
        "coverImageUrl": null,
        "createdAt": "2026-07-18T10:00:00Z"
      }
    ],
    "nextCursor": "opaque-feed-cursor",
    "hasNext": true
  }
}
```

규칙:

- `size` 기본 20. 커서는 공통 페이지네이션 계약(1.4)을 따르며 `cursor`는 opaque 문자열이다.
- `requestId`는 Feed Session 식별자다. 같은 Session의 다음 페이지는 `nextCursor`로 이어받고, 클라이언트는 이 값을 10.2의 이벤트 요청에 그대로 돌려보낸다.
- 공개 가능한 `PUBLIC` Keyword만 반환한다. `PRIVATE_ONLY`·`BLOCKED`는 타인 노출과 타인 Collection 특징 계산 모두에서 제외한다.
- AI 처리가 끝나지 않았다면 `keywords: []`다. 오류가 아니다.
- AI 미완료 Collection도 Feed 후보에 포함한다.
- Context 원문과 사용자 신원은 반환하지 않는다. **소유자 식별자(`memberId` 등)를 응답에 넣지 않는다.**
- 상세 조회는 IMPRESSION 기록 대상이 아님

후보 채널·점수 구성·가중치 등 추천 정책은 [AI 설계](05_AI_설계.md) 14장이 정본이다.

Collection 선택:

```http
GET /api/core/v1/collections/{collectionId}
```

타인 Collection이면 `contexts: null`이다.

## 10.2 추천 이벤트

```http
POST /api/core/v1/feed/events
```

`requestId`는 배열 바깥의 별도 필드다. 10.1 응답에서 받은 값을 그대로 돌려보낸다. 이벤트는 배열로 묶어 한 번에 보낸다.

```json
{
  "requestId": "5b2c0000-0000-0000-0000-000000000000",
  "events": [
    { "event": "CLICK", "collectionId": 7001, "placeId": null, "position": 0 },
    { "event": "SAVE",  "collectionId": 7001, "placeId": 5501, "position": 0 }
  ]
}
```

성공:

```http
204 No Content
```

규칙:

- `events` 배열의 크기 상한은 **100개**다. 초과하면 `400 INVALID_INPUT`이다(1.9).
- `event`는 `CLICK`·`SAVE`만 허용한다. **IMPRESSION은 서버가 10.1 응답 생성 시 기록하므로 클라이언트가 보내면 `400`으로 거부한다.**
- 사용자 식별자는 본문으로 받지 않는다. 인증 컨텍스트에서 가져온다.
- `placeId`는 Collection 안의 특정 Place를 대상으로 한 경우에만 채우고, 아니면 `null`이다.
- `position`은 10.1 응답에서 받은 값을 그대로 돌려보낸다.
- 이벤트는 관측 로그이므로 개별 항목이 유효하지 않으면(예: 삭제된 Collection) 그 항목만 버리고 나머지는 저장한다. 부분 실패로 전체를 실패시키지 않는다.
- 쓰기 전용이며 어떤 조회 결과도 반환하지 않는다.

---

# 11. 주요 DTO

## 11.0 `ApiResponse<T>`

모든 응답의 봉투다(1.6). 아래 DTO들은 항상 `data` 안에 담겨 전달된다.

```typescript
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

type ApiError = {
  code: string;
  message: string;
  fieldErrors: FieldError[];
  traceId: string;
  // 일부 code는 추가 필드를 더한다. 예: DELETE_CONFIRMATION_REQUIRED → impact
  impact?: { recordDeleted: boolean; collectionIds: number[] };
};

type FieldError = {
  field: string;
  message: string;
};
```

조합 예시:

```typescript
// GET /collections/{collectionId}
type CollectionDetailResponse = ApiResponse<CollectionDetail>;

// GET /follows
type FollowListResponse = ApiResponse<CursorPage<FollowSummary>>;
```

- `success`로 좁히면(`if (res.success)`) `data`와 `error`가 타입 수준에서 배타적으로 갈린다.
- `204 No Content`는 본문이 없으므로 이 타입으로 파싱하지 않는다.

## 11.1 `RecordDetail`

```typescript
type RecordDetail = {
  recordId: number;
  place: PlaceSummary;
  contexts: ContextDetail[] | null;
  keywords: string[];
  createdAt: string;
  addedToCollectionAt?: string;
};
```

규칙:

```text
본인 Record 조회         → contexts = ContextDetail[]
타인 공개 Collection 조회 → contexts = null
```

`PlaceSummary`:

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

- `thumbnailUrl`은 장소 대표 썸네일 이미지 URL이다. 없으면 `null`이며 필드를 생략하지 않는다 — 프론트는 `null`이거나 이미지 로드에 실패하면 기본 이미지로 폴백한다.
- 이미지는 **4:3 비율**로 제공된다. 프론트는 `aspect-ratio: 4 / 3` + `object-fit: cover`로 표시하면 로딩 전 영역이 확보되고 모바일·PC 폭 모두에 적응한다.
- 현 단계 값은 같은 origin의 절대 경로(`/api/core/images/places/…`)다. 이후 외부 절대 URL로 바뀔 수 있으며 `<img src>` 사용법은 동일하다.

## 11.2 `ContextDetail`

```typescript
type ContextDetail = {
  contextId: number;
  body: string;
  createdAt: string; // 최초 작성 시각(origin_created_at). 수정으로 contextId가 바뀌어도 승계되어 변하지 않는다
};
```

## 11.3 `CollectionDetail`

```typescript
type CollectionDetail = {
  collectionId: number;
  title: string;
  ownedByMe: boolean;
  follow: {
    followed: boolean;
    followId: number | null;
    alias: string | null;
  } | null;
  coverImageUrl: string | null; // 표지 이미지 상대 경로. null이면 기본 표지로 폴백(7.7)
  records: CursorPage<RecordDetail>;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
};
```

## 11.4 `CursorPage<T>`

```typescript
type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasNext: boolean;
};
```

## 11.5 `RecentRecordCard`

```typescript
type RecentRecordCard = {
  recordId: number;
  place: PlaceSummary;
  keywords: string[];   // 없으면 [] — null이 아니다
  createdAt: string;
};
```

5.9 전용이다. `RecordDetail`(11.1)과 달리 `contexts` 필드 자체가 없다 — 본문을 담을 자리를 두지 않는다.

## 11.6 `RecordCollectionCard`

```typescript
type RecordCollectionCard = {
  collectionId: number;
  title: string;
  recordCount: number;
  keywords: string[];          // PUBLIC 집계. 없으면 [] — null이 아니다
  coverImageUrl: string | null;
  publishedAt: string;
  createdAt: string;
};
```

5.10 전용이다. `CollectionDetail`(11.3)과 달리 `records`가 없고, Feed 항목(10.1)과 달리 `position`이 없다 — 목록 카드에 필요한 것만 싣는다.

---

# 12. 접근 권한표

| 기능 | 본인 | 팔로우한 사용자 | 팔로우하지 않은 사용자 |
|---|---:|---:|---:|
| 공개 Collection 목록 조회 | O | O | O |
| 공개 Collection 상세 조회 | O | O | O |
| Record Place 조회 | O | O | O |
| Record Keyword 조회 | O | O | O |
| Record 생성일 조회 | O | O | O |
| Record Context 원문 조회 | O | X, `null` | X, `null` |
| Collection 제목·표지·구성 수정 | 소유자만 | X | X |
| Context 수정·삭제 | 소유자만 | X | X |
| Follow 별칭 조회 | 지정한 본인만 | 해당 없음 | 해당 없음 |

---

# 13. 화면별 호출 흐름

## 13.1 Library 최초 진입

```text
GET /collections?cursor=&size={초기 책 수}          -- 내 책장
GET /follows?size={화면에 보일 팔로우 책장 수}       -- 팔로우 책장 목록
→ 각 followId로 GET /follows/{followId}/collections?size={초기 책 수}
```

## 13.2 팔로우 책장 이동

```text
GET /follows?cursor={followCursor}&size={size}
→ 다음 팔로우 유저 size개
→ 각 followId의 Collection은 개별 조회
```

## 13.3 책장별 세로 스크롤

내 책장:

```text
GET /collections?cursor={collectionCursor}&size={size}
```

팔로우 책장:

```text
GET /follows/{followId}/collections?cursor={collectionCursor}&size={size}
```

## 13.4 Collection 열기

```text
GET /collections/{collectionId}?recordSize=2
```

서버 판별:

```text
소유자
→ contexts = 실제 배열

타인 공개 Collection
→ contexts = null
```

## 13.5 Collection 내부 다음 페이지

```text
GET /collections/{collectionId}?recordCursor={recordCursor}&recordSize=2
```

## 13.6 Feed에서 책장 탐색·Follow

```text
GET  /feed/collections
→ GET  /collections/{collectionId}
→ GET  /feed/collections/{collectionId}/shelf
→ POST /follows { collectionId }
→ followId 반환
```

## 13.7 AI 검색에서 Context 수정

```text
POST /search/records
→ matchedContext의 recordId·contextId 확인
→ PATCH /records/{recordId}/contexts/{contextId}
```

## 13.8 AI 검색에서 Context 삭제

```text
POST /search/records
→ matchedContext의 recordId·contextId 확인
→ DELETE /records/{recordId}/contexts/{contextId}
```

## 13.9 컬렉션 상세에서 Context 수정

```text
GET /collections/{collectionId}
→ records[].contexts[]의 recordId·contextId 확인
→ PATCH /records/{recordId}/contexts/{contextId}
```

화면이 다를 뿐 엔드포인트는 5.5와 동일하다.

## 13.10 컬렉션 상세에서 Context 삭제

```text
GET /collections/{collectionId}
→ records[].contexts[]의 recordId·contextId 확인
→ DELETE /records/{recordId}/contexts/{contextId}
```

위와 동일하게 5.6을 그대로 호출한다. 마지막 Context 삭제 시 409 `DELETE_CONFIRMATION_REQUIRED` 처리도 레코드 상세와 동일하다.

## 13.11 컬렉션 만들기에서 담을 장소 검색

컬렉션에 담을 장소 선택 화면은 별도 목록 API 없이 4.2를 목록으로 재사용한다.

```text
GET /records/map                     -- 최초 진입: 내 전체 장소
GET /records/map?keyword={검색어}     -- 검색어 입력 시
→ items에서 장소 선택
→ POST /collections { title, recordIds } (7.1)
```

지도 화면이 아니므로 `bounds`는 사용하지 않고 `items`만 사용한다. `items`는 장소명 오름차순이라 그대로 목록에 그리면 된다.

## 13.12 컬렉션 만들기에서 표지 생성

```text
POST /collections { title, recordIds } (7.1)   -- 즉시 생성, coverImageUrl: null
→ 이미지 서비스 후보 생성·폴링·화풍 선택 (7.7)
→ PATCH /collections/{collectionId} { coverImageUrl } (7.4)
```

생성 완료 화면은 표지 자리에 스켈레톤을 먼저 그리고, 후보가 `done`이 되는 대로 채운다. 사용자가 화풍 선택 전에 떠나도 Collection은 이미 생성되어 있다(7.7).

## 13.13 홈 화면 최근 기록

```text
GET /records/recent                              -- 최초 진입: 최신 1건
GET /records/recent?cursor={nextCursor}          -- 카드를 넘길 때마다
→ hasNext가 false면 더 넘기지 않는다
```

카드를 여러 장 미리 받아 두려면 `size`를 올린다. 카드에 Context 본문이 없으므로, 사용자가 카드를 눌러 상세로 들어가는 시점에 `recordId`로 5.2를 호출한다.

최근 7일 안에 기록이 없으면 `items: []`가 온다. 오류가 아니므로 빈 화면 안내로 처리한다.

---

# 14. 구현 시 반드시 지킬 사항

1. 공개 Collection Record의 `contexts`는 항상 `null`이다.
2. 같은 Record DTO를 개인·공개 응답에서 공통 사용한다.
3. Collection 상세은 Feed·Library·직접 진입 모두 `/collections/{collectionId}`를 사용한다.
4. Collection 수정·삭제·구성 변경은 소유자만 가능하다.
5. Library는 전용 Endpoint 없이 `GET /collections` + `GET /follows` + `GET /follows/{followId}/collections` 조합으로 구성한다.
6. 팔로우 목록 커서와 각 책장 Collection 커서를 혼용하지 않는다.
7. 내 책장은 `GET /collections`로 프론트가 별도 구성·유지한다.
8. Collection 내부 Record는 `collection_records.created_at ASC`(담은 순서 오래된순)를 기본으로 정렬하고, `recordSort=ADDED_AT_DESC`로 최신순을 지원한다. Collection 목록(7.2·9.3)도 같은 방식이다 — 기본 오래된순, `sort` 파라미터로 최신순.
9. AI 검색 결과에 `matchedContext.body`, `recordId`, `contextId`를 제공한다.
10. Record·Context 생성 직후 `keywords: []`를 정상 상태로 취급한다.
11. Feed IMPRESSION은 목록 응답 생성 시 서버가 기록한다.
12. Feed CLICK·SAVE만 클라이언트가 이벤트 API로 보낸다.
13. 내부 사용자 ID와 신원 정보는 공개 응답에 포함하지 않는다.
14. 모든 조회에서 소프트 삭제 데이터를 제외한다.
15. Context 추가·수정 시 `records.updated_at`을 갱신한다(최신 활동 시각 기록).
16. 검색 응답 `keywords`는 Record의 활성 Context 전체 Keyword 집계값이며, 그 배열이 최종인지 여부는 같은 응답의 `keywordStatus`가 가른다(6.1).
17. 연쇄 삭제가 발생하는 삭제 요청은 409로 거절하고, 프론트 확인 후 강제 삭제 API(`/records/{recordId}/force`) 또는 Collection 삭제 API로만 수행한다.
18. Collection 생성은 표지 생성을 기다리지 않는다. `coverImageUrl`은 `null` 허용이며, 서버는 저장 전 `/image/files/*.webp` 경로 패턴을 검증한다(7.4·7.7).

---

# 15. 확정된 구현 세부사항

미확정 항목 없음. 주요 확정 내역:

| 항목 | 확정 내용 |
|---|---|
| 인증 | JWT. Access 30분, Refresh 7일(Redis 저장, 회전 발급) |
| 커서 | Base64(정렬키+id). `size` 기본 20, 명세상 상한 없음(서버 방어 상한 권장) |
| Feed SAVE 이벤트 | 클라이언트가 저장 성공 후 `/feed/events`로 전송 |
| `similarity` | 검색 응답에 항상 포함. UI 노출은 프론트 결정 |
| `keywordStatus` | 검색 응답에만 포함하며 항상 반환. `COMPLETED`·`PROCESSING`·`FAILED` 셋(6.1) |
| Context 수정 응답 | `PATCH 200` (사용자 관점의 수정. 새 `contextId` 반환) |
| Collection 표지 | core는 URL만 저장(7.7). 등록·교체만 있고 제거는 없다. 생성은 표지를 기다리지 않으며 `coverImageUrl`은 `null` 허용 |
