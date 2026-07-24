# PinLog API 명세

MVP REST API 명세입니다. 데이터 구조는 데이터 모델 및 무결성 문서를, 화면 흐름은 유저플로우 문서를 따릅니다.

- 기본 경로: `/api/core/v1`
- 페이지네이션: 커서 기반
- 시간 형식: ISO 8601 UTC
- 삭제 정책: 소프트 삭제

---

# 1. 공통 규약

## 1.1 인증

- 방식: **JWT (확정)**. Access Token + Refresh Token.
- 만료: Access **30분**, Refresh **7일**.
- Refresh Token은 **Redis**에 저장한다(로그아웃 무효화·회전 발급 관리, TTL 자동 만료).
- 보호 Endpoint는 `Authorization: Bearer {accessToken}` 헤더가 필요하다.
- Access 만료(401) 시 `POST /auth/refresh`로 재발급한다.
- 개인 API에서 사용자 ID를 요청 Query나 Body로 받지 않는다. 서버가 토큰으로 식별한다.
- 내부 사용자 ID는 공개 응답에 포함하지 않는다(로그인·가입 응답에서 본인 `memberId`를 받는 것만 예외).

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
  "keywords": []
}
```

위 응답은 오류가 아니다.

## 1.4 페이지네이션

목록 조회는 커서 기반을 기본으로 한다.

```json
{
  "items": [],
  "nextCursor": "opaque-cursor-or-null",
  "hasNext": true
}
```

커서는 불투명 문자열이며 클라이언트가 내부 값을 해석하거나 수정하지 않는다.

- 인코딩: **Base64(정렬키 + id)**. 예: `Base64("2026-07-23T10:00:00Z,8801")`.
- `size` 기본 20, 명세상 상한 없음. 단, 구현 시 서버 내부 방어 상한을 두는 것을 권장한다.

## 1.5 공통 에러 형식

```json
{
  "code": "RESOURCE_NOT_FOUND",
  "message": "요청한 리소스를 찾을 수 없습니다.",
  "fieldErrors": []
}
```

권장 상태 코드:

| 상태 | 의미 |
|---:|---|
| `200` | 조회·수정 성공 |
| `201` | 리소스 생성 성공 |
| `204` | 응답 본문 없는 성공 |
| `400` | 형식 또는 입력값 오류 |
| `401` | 인증 필요 |
| `404` | 리소스 없음 또는 접근 권한 없음 |
| `409` | 상태 충돌 (연쇄 삭제 확인 필요 등) |
| `422` | 도메인 규칙 위반 |

---

# 2. Endpoint 전체 목록

## 2.1 인증·계정

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/auth/{provider}/login` | 소셜 로그인 시작 |
| GET | `/auth/{provider}/callback` | 소셜 로그인 콜백 (토큰 발급 또는 가입 분기) |
| POST | `/auth/refresh` | Access Token 재발급 |
| POST | `/auth/logout` | 로그아웃 (Refresh Token 무효화) |
| POST | `/me/agreements` | 필수 약관 동의 + 가입 확정 |
| GET | `/me/summary` | 마이페이지 요약 (계정 정보 + Record·Collection·팔로워·팔로잉 수) |
| DELETE | `/me` | 회원 탈퇴 |

## 2.2 Place·지도

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/records/map` | 내 활성 Record 기반 지도 마커 조회 |

장소 검색은 서버 API가 아니다. 프론트가 카카오 로컬 API를 직접 호출하고, Record 생성 시 카카오 응답의 장소 데이터를 서버에 전달한다(5.1).

## 2.3 Record·Context

| Method | Endpoint | 설명 |
|---|---|---|
| POST | `/records` | 카카오 Place와 첫 Context로 Record 생성 |
| GET | `/records/{recordId}` | 내 Record 상세 조회 |
| GET | `/records/by-place` | kakaoPlaceId로 이 장소의 내 활성 Record 조회 |
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
| PATCH | `/collections/{collectionId}` | 소유자의 Collection 제목 수정 |
| DELETE | `/collections/{collectionId}` | 소유자의 Collection 삭제 |
| POST | `/collections/{collectionId}/records` | 소유자의 Record 추가 |
| DELETE | `/collections/{collectionId}/records/{recordId}` | 소유자의 Record 제거 |
공개 책장 탐색은 Feed 네임스페이스(2.7), 책장 Follow는 Follow 네임스페이스(2.6)를 사용한다.

## 2.6 Follow

| Method | Endpoint | 설명 |
|---|---|---|
| POST | `/follows` | Follow 생성 (body의 `collectionId`로 작성자 식별) |
| GET | `/follows` | 내 팔로우 목록 페이지네이션 |
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

공급자 인증 후 분기한다.

기존 회원 (활성 `social_account` 존재):

```json
{ "status": "LOGIN", "memberId": 1201, "accessToken": "…", "refreshToken": "…" }
```

신규 (가입 미완료):

```json
{ "status": "SIGNUP_REQUIRED", "signupToken": "…" }
```

- 신규는 이 시점에 `member`를 생성하지 않는다. 약관 동의 화면으로 유도할 **가입 토큰**(단기, 예: 10분)만 발급한다.
- `signupToken`으로는 3.3 외 어떤 API도 호출할 수 없다.

## 3.3 약관 동의 (가입 확정)

```http
POST /api/core/v1/me/agreements
Authorization: Bearer {signupToken}
```

```json
{
  "agreed": true
}
```

- 필수 동의가 `true`가 아니면 400.
- 동작: `member` + `social_account` 생성(가입 확정) 후 토큰 발급.

```json
{ "memberId": 1201, "accessToken": "…", "refreshToken": "…" }
```

201.

## 3.4 토큰 재발급

```http
POST /api/core/v1/auth/refresh
```

```json
{ "refreshToken": "…" }
```

- 200: `{ "accessToken": "…", "refreshToken": "…" }` (Refresh도 회전 발급)
- 만료·무효 Refresh: 401 → 프론트는 재로그인으로 유도.

## 3.5 로그아웃

```http
POST /api/core/v1/auth/logout
```

- 동작: Refresh Token 무효화. Access는 만료로 자연 소멸.
- 204.

## 3.6 마이페이지 요약

```http
GET /api/core/v1/me/summary
```

마이페이지 진입 시 1회 호출한다.

```json
{
  "provider": "KAKAO",
  "email": "user@example.com",
  "recordCount": 20,
  "collectionCount": 9,
  "followerCount": 12,
  "followingCount": 8
}
```

- 카운트는 모두 활성 데이터 기준 집계다.
- 팔로워·팔로잉 목록은 제공하지 않는다. 수치는 본인만 볼 수 있다.
- `memberId`는 로그인 응답(3.2 LOGIN, 3.3)에서 이미 전달되므로 여기서는 반환하지 않는다.

---

# 4. Place·지도 상세

## 4.1 카카오 Place 검색

장소 검색은 서버 API가 아니다. **프론트가 카카오 로컬 API를 직접 호출한다.**

- 검색 결과 조회만으로 내부 Place를 저장하지 않는다.
- 사용자가 검색 결과에서 장소를 선택해 기록을 저장할 때, 프론트가 카카오 응답의 장소 데이터를 Record 생성 요청(5.1)에 담아 전달한다.
- 서버는 `kakaoPlaceId` 기준으로 내부 Place를 upsert한다(이미 있으면 재사용).

## 4.2 내 Record 지도

```http
GET /api/core/v1/records/map?swLat={swLat}&swLng={swLng}&neLat={neLat}&neLng={neLng}
```

Query:

| 이름 | 필수 | 설명 |
|---|---:|---|
| `swLat` | X | 남서 위도 |
| `swLng` | X | 남서 경도 |
| `neLat` | X | 북동 위도 |
| `neLng` | X | 북동 경도 |

- bbox 파라미터 없이 호출하면(최초 진입) 내 **전체** 마커를 반환한다.
- bbox를 주면 해당 범위의 마커만 반환한다(지도 이동 시).
- 응답은 현재 로그인 사용자의 활성 Record와 연결된 Place만 포함한다.

```json
{
  "bounds": { "swLat": 37.4979, "swLng": 126.9270, "neLat": 37.5665, "neLng": 127.0557 },
  "items": [
    { "recordId": 8801, "placeId": 5501, "name": "앤트러사이트 성수", "lat": 37.5447, "lng": 127.0557 }
  ]
}
```

- `bounds`는 반환된 마커 전체를 포함하는 **최소 사각형**이다. 프론트는 최초 진입 시 `fitBounds(bounds, padding)`으로 모든 마커가 한눈에 보이는 최소 화면(여유 포함)을 만든다.
- 결과가 없으면 `bounds: null`, 1개면 해당 좌표의 점 사각형(sw = ne)이다.

## 4.3 발견한 Place 저장

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

동일 장소에 내 활성 Record가 이미 있으면 거절하지 않고 **기존 Record에 Context만 추가**한다.

```text
내 활성 Record 없음 → Record + 첫 Context 생성 → 201 (result: RECORD_CREATED)
내 활성 Record 존재 → 기존 Record에 Context 추가 → 200 (result: CONTEXT_ADDED)
```

응답(공통):

```json
{
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
```

- `CONTEXT_ADDED`일 때 `contexts`는 기존 것을 포함한 활성 Context 전체다.

## 5.2 Record 상세

```http
GET /api/core/v1/records/{recordId}
```

본인 소유 Record만 조회한다. `contexts`는 배열이다.

## 5.3 장소로 내 Record 조회

```http
GET /api/core/v1/records/by-place?kakaoPlaceId=1234567
```

프론트가 카카오 장소 상세 화면에서 이 장소에 내 기록이 이미 있는지 확인할 때 사용한다.

```json
{ "record": null }
```

```json
{
  "record": {
    "recordId": 8801,
    "place": { },
    "contexts": [ ],
    "keywords": []
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

201:

```json
{
  "contextId": 91003,
  "body": "실제로 방문했고 창가 자리가 좋았음",
  "createdAt": "2026-07-23T10:10:00Z",
  "keywords": []
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

Context 수정은 내부적으로 기존 Context를 소프트 삭제하고 새 Context를 생성하는 교체 방식으로 처리할 수 있다.

응답은 최신 ID를 반환한다.

```json
{
  "contextId": 91002,
  "body": "주말 오후에 다시 가고 싶은 카페",
  "createdAt": "2026-07-23T10:05:00Z",
  "keywords": []
}
```

프론트는 기존 `contextId`를 새 ID로 교체해야 한다.

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
  "code": "DELETE_CONFIRMATION_REQUIRED",
  "message": "마지막 Context를 삭제하면 Record와 일부 Collection이 함께 삭제됩니다.",
  "impact": {
    "recordDeleted": true,
    "collectionIds": [7001]
  }
}
```

프론트는 `impact`를 기반으로 사용자에게 안내한 뒤, 확인을 받으면 `DELETE /records/{recordId}/force`(5.8)를 호출한다.

## 5.7 Record 삭제

```http
DELETE /api/core/v1/records/{recordId}
```

- 프론트는 이 Record가 어떤 Collection의 마지막 Record인지 알 수 없다. 서버가 DB에서 확인한다.
- 마지막 Record인 활성 Collection이 없으면: Record·Context 소프트 삭제, Collection 연결 소프트 삭제, AI 파생 데이터 파기(204).
- 마지막 Record인 활성 Collection이 있으면: 삭제하지 않고 409로 거절한다.

```http
409 Conflict
```

```json
{
  "code": "DELETE_CONFIRMATION_REQUIRED",
  "message": "이 기록을 삭제하면 일부 컬렉션이 함께 삭제됩니다.",
  "impact": {
    "recordDeleted": true,
    "collectionIds": [7001, 7002]
  }
}
```

## 5.8 Record 강제 삭제

```http
DELETE /api/core/v1/records/{recordId}/force
```

- 5.6·5.7에서 409를 받은 프론트가 사용자 안내·확인 후 호출한다.
- Record·활성 Context 전체 소프트 삭제, Collection 연결 소프트 삭제, **마지막 Record였던 Collection 소프트 삭제**, AI 파생 데이터 파기를 한 트랜잭션으로 수행한다.
- 204.
- 연쇄 삭제 대상이 없어도 정상 수행한다(일반 삭제와 동일 결과).

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

- 현재 로그인 사용자의 Place
- 현재 로그인 사용자의 Context
- 현재 로그인 사용자의 Keyword

응답:

```json
{
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
      "keywords": ["친구", "비 오는 날", "카페"],
      "createdAt": "2026-07-20T09:00:00Z"
    }
  ]
}
```

- `bounds`는 검색 결과 Record들의 Place 전체를 포함하는 최소 사각형이다(4.2와 동일 규칙: 결과 없으면 `null`). 프론트는 검색 결과를 지도에 띄울 때 `fitBounds(bounds, padding)`을 사용한다.
- `keywords`는 매칭된 Context의 Keyword가 아니라 **해당 Record의 활성 Context 전체 Keyword 집계값**이다(`ai.context_keyword`를 Record 단위로 집계, 중복 제거).
- `keywords`는 `keyword_preset`의 `label` 문자열 배열이다. `code`는 내부 식별용으로 노출하지 않는다(모든 Keyword 응답 공통).

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
- Record 1개 이상
- 본인 활성 Record만 추가 가능
- 생성 즉시 자동 발행
- 동일 Record 중복 추가 금지

응답:

```json
{
  "collectionId": 7050,
  "title": "비 오는 날의 카페",
  "recordCount": 3,
  "publishedAt": "2026-07-23T10:00:00Z",
  "createdAt": "2026-07-23T10:00:00Z"
}
```

## 7.2 내 Collection 목록

```http
GET /api/core/v1/collections?cursor={cursor}&size=10
```

이 Endpoint는 일반적인 내 Collection 관리 화면에서 사용한다.  
Library 내 책장 세로 스크롤에서는 Library 전용 Endpoint를 사용한다.

## 7.3 Collection 상세 통합 조회

```http
GET /api/core/v1/collections/{collectionId}?recordCursor={cursor}&recordSize=2
```

Query:

| 이름 | 필수 | 설명 |
|---|---:|---|
| `recordCursor` | X | 다음 CollectionRecord 커서 |
| `recordSize` | X | 반환할 Record 수, 기본 1 |
| `recordSort` | X | MVP에서는 `ADDED_AT_DESC` 고정 권장 |

정렬:

```text
collection_records.created_at DESC
```

### 소유자 조회 응답

```json
{
  "collectionId": 7050,
  "title": "비 오는 날의 카페",
  "ownedByMe": true,
  "follow": null,
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
```

### 타인 공개 Collection 응답

같은 DTO를 사용하되 `contexts`를 `null`로 반환한다.

```json
{
  "collectionId": 7001,
  "title": "성수 산책 코스",
  "ownedByMe": false,
  "follow": {
    "followed": true,
    "followId": 701,
    "alias": "서울 카페"
  },
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
```

공개 조회에서 금지되는 정보:

- Context 원문
- 사용자 내부 ID
- 실명
- 닉네임
- 소셜 계정
- 팔로워·팔로잉 목록
- 다른 팔로워가 설정한 별칭

## 7.4 제목 수정

```http
PATCH /api/core/v1/collections/{collectionId}
```

소유자만 가능하다.

```json
{
  "title": "비 오는 날 다시 갈 카페"
}
```

## 7.5 Record 추가

```http
POST /api/core/v1/collections/{collectionId}/records
```

```json
{
  "recordIds": [8804, 8805]
}
```

- 이미 담긴 Record가 섞여 있으면 실패시키지 않고 **중복만 건너뛰고 나머지를 담는다**(멱등).
- 각 관계의 `collection_records.created_at`이 Collection 내부 표시 순서의 기준이 된다.

## 7.6 Record 제거

```http
DELETE /api/core/v1/collections/{collectionId}/records/{recordId}
```

마지막 Record 제거 요청은 409 `DELETE_CONFIRMATION_REQUIRED`로 거절한다. 프론트는 "컬렉션도 함께 사라짐"을 안내한 뒤, 확인을 받으면 `DELETE /collections/{collectionId}`를 호출한다.

---

# 8. 공개 책장 탐색과 Follow

## 8.1 최초 공개 책장 탐색

```http
GET /api/core/v1/feed/collections/{collectionId}/shelf?cursor={cursor}&size=10
```

`collectionId`를 공개 진입점으로 사용해 해당 Collection 작성자의 다른 공개 Collection을 조회한다.

응답:

```json
{
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
        "createdAt": "2026-07-18T10:00:00Z"
      }
    ],
    "nextCursor": null,
    "hasNext": false
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
  "followId": 701,
  "alias": null,
  "createdAt": "2026-07-23T10:00:00Z"
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

규칙:

- 최대 20자
- 공백 제거 후 빈 문자열은 `null`
- 별칭은 지정한 본인만 볼 수 있음
- 동일 별칭 중복 허용

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

## 9.2 팔로우 목록

```http
GET /api/core/v1/follows?cursor={cursor}&size=2
```

```json
{
  "items": [
    { "followId": 701, "alias": "서울 카페", "createdAt": "2026-07-23T10:00:00Z" },
    { "followId": 702, "alias": null, "createdAt": "2026-07-20T10:00:00Z" }
  ],
  "nextCursor": "opaque-cursor",
  "hasNext": true
}
```

- 현재 로그인 사용자의 활성 Follow만 반환한다.
- 팔로우 대상의 신원 정보(내부 사용자 ID 등)는 포함하지 않는다.

## 9.3 팔로우 책장의 Collection 목록

```http
GET /api/core/v1/follows/{followId}/collections?cursor={cursor}&size=6
```

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
- 정렬은 `collection_records.created_at DESC`

---

# 10. Feed·추천 상세

## 10.1 추천 목록

```http
GET /api/core/v1/feed/collections?cursor={cursor}&size=20
```

응답 생성 시 서버는 포함된 각 Collection의 IMPRESSION을 기록한다.

```json
{
  "requestId": "5b2c0000-0000-0000-0000-000000000000",
  "items": [
    {
      "position": 0,
      "collectionId": 7001,
      "title": "비 오는 날의 카페",
      "recordCount": 5,
      "keywords": ["조용한", "커피"],
      "createdAt": "2026-07-18T10:00:00Z"
    }
  ],
  "nextCursor": "opaque-feed-cursor",
  "hasNext": true
}
```

규칙:

- 공개 가능한 Keyword만 반환
- AI 처리가 끝나지 않았다면 `keywords: []`
- AI 미완료 Collection도 Feed 후보에 포함 가능
- Context 원문과 사용자 신원은 반환하지 않음
- 상세 조회는 IMPRESSION 기록 대상이 아님

Collection 선택:

```http
GET /api/core/v1/collections/{collectionId}
```

타인 Collection이면 `contexts: null`이다.

## 10.2 추천 이벤트

```http
POST /api/core/v1/feed/events
```

CLICK:

```json
{
  "event": "CLICK",
  "collectionId": 7001,
  "placeId": null,
  "requestId": "5b2c0000-0000-0000-0000-000000000000",
  "position": 0
}
```

SAVE:

```json
{
  "event": "SAVE",
  "collectionId": 7001,
  "placeId": 5501,
  "requestId": "5b2c0000-0000-0000-0000-000000000000",
  "position": 0
}
```

성공:

```http
204 No Content
```

IMPRESSION은 클라이언트가 보내지 않는다.

---

# 11. 주요 DTO

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

## 11.2 `ContextDetail`

```typescript
type ContextDetail = {
  contextId: number;
  body: string;
  createdAt: string;
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
| Collection 제목·구성 수정 | 소유자만 | X | X |
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

---

# 14. 구현 시 반드시 지킬 사항

1. 공개 Collection Record의 `contexts`는 항상 `null`이다.
2. 같은 Record DTO를 개인·공개 응답에서 공통 사용한다.
3. Collection 상세은 Feed·Library·직접 진입 모두 `/collections/{collectionId}`를 사용한다.
4. Collection 수정·삭제·구성 변경은 소유자만 가능하다.
5. Library는 전용 Endpoint 없이 `GET /collections` + `GET /follows` + `GET /follows/{followId}/collections` 조합으로 구성한다.
6. 팔로우 목록 커서와 각 책장 Collection 커서를 혼용하지 않는다.
7. 내 책장은 `GET /collections`로 프론트가 별도 구성·유지한다.
8. Collection 내부 Record는 `collection_records.created_at DESC`(최신 담은 순)로 정렬한다.
9. AI 검색 결과에 `matchedContext.body`, `recordId`, `contextId`를 제공한다.
10. Record·Context 생성 직후 `keywords: []`를 정상 상태로 취급한다.
11. Feed IMPRESSION은 목록 응답 생성 시 서버가 기록한다.
12. Feed CLICK·SAVE만 클라이언트가 이벤트 API로 보낸다.
13. 내부 사용자 ID와 신원 정보는 공개 응답에 포함하지 않는다.
14. 모든 조회에서 소프트 삭제 데이터를 제외한다.
15. Context 추가·수정 시 `records.updated_at`을 갱신한다(최신 활동 시각 기록).
16. 검색 응답 `keywords`는 Record의 활성 Context 전체 Keyword 집계값이다.
17. 연쇄 삭제가 발생하는 삭제 요청은 409로 거절하고, 프론트 확인 후 강제 삭제 API(`/records/{recordId}/force`) 또는 Collection 삭제 API로만 수행한다.

---

# 15. 확정된 구현 세부사항

미확정 항목 없음. 주요 확정 내역:

| 항목 | 확정 내용 |
|---|---|
| 인증 | JWT. Access 30분, Refresh 7일(Redis 저장, 회전 발급) |
| 커서 | Base64(정렬키+id). `size` 기본 20, 명세상 상한 없음(서버 방어 상한 권장) |
| Feed SAVE 이벤트 | 클라이언트가 저장 성공 후 `/feed/events`로 전송 |
| `similarity` | 검색 응답에 항상 포함. UI 노출은 프론트 결정 |
| Context 수정 응답 | `PATCH 200` (사용자 관점의 수정. 새 `contextId` 반환) |
