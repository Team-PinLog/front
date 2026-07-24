# API 계약

> 기준: docs 레포 `static/08_API_명세.md` (2026-07-24 확인). 원본 사본은 `docs/reference/08_API_명세.md`.
> 아래 [확정]만 근거로 구현한다. [협의 필요]는 확정된 것처럼 구현하지 않는다. 문서에 없는 엔드포인트·필드는 추측해서 채우지 않는다.

## [확정]

### 공통

- **base path**: `/api/core/v1`
- **인증**: JWT. Access **30분** / Refresh **7일**. Refresh는 **Redis** 저장, 요청 시 **회전 발급**.
- **헤더**: 보호 엔드포인트는 `Authorization: Bearer {accessToken}`.
- **토큰 갱신**: `POST /auth/refresh` (바디에 `refreshToken`). 성공 시 새 access·refresh 반환. **만료·무효 시 401 → 재로그인 유도.**
- 개인 API는 사용자 ID를 쿼리·바디로 받지 않는다. 서버가 토큰으로 식별한다.
- **에러 형식**: `{ code, message, fieldErrors }`.
- **상태 코드**: `200` / `201` / `204` / `400` / `401` / `404` / `409` / `422`.
- **권한 실패는 403이 아니라 `404`로 응답한다**(존재 여부 은닉). 타인 비공개 데이터·소유자 전용 자원 접근 포함.
- **시간 형식**: ISO 8601 **UTC**.

### 페이지네이션

- **커서 기반**: `{ items, nextCursor, hasNext }`. 커서는 불투명 문자열(클라이언트가 해석·수정하지 않음). `size` 기본 **20**.
- 세 커서(팔로우 목록 · 책장별 Collection · Record)는 독립적이며 혼용하지 않는다.
- **검색은 페이지네이션하지 않는다.** 유사도 상위 `size`(기본 20) 단일 응답.

### Place · 지도 · 검색

- **장소 검색은 서버 API가 아니다.** 프론트가 **카카오 로컬 API를 직접 호출**하고, Record 생성 시 카카오 응답의 장소 데이터를 서버에 전달한다.
- 지도(`GET /records/map`)·검색(`POST /search/records`) 응답의 `bounds`는 `fitBounds`용 **최소 사각형**이다. 결과 없으면 **`null`**, 1개면 sw=ne 점 사각형.

### Record · Context

- **`POST /records`는 `result`로 분기한다.**
  - `RECORD_CREATED` → `201` (내 활성 Record 없음 → Record + 첫 Context 생성)
  - `CONTEXT_ADDED` → `200` (내 활성 Record 존재 → 기존 Record에 Context 추가, `contexts`는 기존 포함 전체)
- **`GET /records/by-place`는 미저장 시 404가 아니라 `record: null`(200)**이다. 미저장 장소 조회는 정상 흐름.
- **Context 수정 `PATCH .../contexts/{contextId}`는 `200`이며 새 `contextId`를 반환한다.** 프론트는 구 id를 새 id로 교체한다(→ `docs/architecture.md` 4장).
- **Record/Context 삭제는 연쇄 삭제 시 `409` + `impact { recordDeleted, collectionIds }`**를 반환한다. 사용자 확인 후 **`DELETE /records/{recordId}/force`** 호출.
  - Context 삭제: 마지막 Context가 아니면 `204`, 마지막이면 `409`.
  - Record 삭제: 마지막 Record인 Collection이 있으면 `409`, 없으면 `204`.
  - Collection에서 마지막 Record 제거도 `409` → 확인 후 `DELETE /collections/{collectionId}`.

### Collection

- **Collection 상세는 단일 DTO**(`GET /collections/{collectionId}`, Feed·Library·직접 진입 공통).
- **`ownedByMe` 플래그로 소유자/타인을 구분**하고, **타인 조회 시 각 Record의 `contexts`는 `null`**이다.

### Feed 이벤트

- `POST /feed/events`. **`CLICK`·`SAVE`만 프론트가 전송**하며 `requestId`·`position`을 포함한다.
- **`IMPRESSION`은 서버가 목록 응답 생성 시 기록**한다(프론트가 보내지 않는다).

## [협의 필요]

> 이 섹션은 임의로 채우지 않는다. 확정 전까지 구현에서 확정된 것으로 가정하지 않는다.

1. **소셜 콜백 토큰 수신 방식** — `GET /auth/{provider}/callback`이 문서상 JSON(`status`, `accessToken`, `refreshToken` 또는 `signupToken`)을 반환하는데, 실제로는 브라우저 리다이렉트로 도달한다. 프론트가 이 토큰을 어떻게 수신하는지 미정.
2. **`refreshToken` 저장 위치** — localStorage vs HttpOnly 쿠키. 문서에 명시 없음.
3. **카카오 로컬 API** — 브라우저 CORS 통과 여부, 키 관리 주체(프론트 노출 vs 프록시). 문서에 명시 없음.
4. **Collection 상세 `recordSize` 기본값** — 명세 7.3에서 기본 **1**. PC 웹(펼친 책 2페이지, `recordSize=2`) 기준에서 기본 1이 의도인지 확인 필요.
5. **Feed 응답의 `requestId` 포함 여부·필드명** — `CLICK`/`SAVE` 전송에 필요.
   - 참고: `08_API_명세` 10.1 응답 예시에는 `requestId`(문자열)와 각 item의 `position`이 포함되어 있다. 필드명이 `requestId`로 확정인지 최종 확인 필요.
6. **Keyword 등급의 응답 포함 여부** — 본인 화면에서 `PRIVATE_ONLY`를 구분 표시하려면 등급이 응답에 실려야 한다(`05-1_파트간_요구사항` 1.4). 제품 결정 + 응답 스키마 확인 필요.
