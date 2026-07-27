# API 계약

> 기준: docs 레포 `static/08_API_명세.md` (2026-07-24 확인). 원본 사본은 `docs/reference/08_API_명세.md`.
> 아래 [확정]만 근거로 구현한다. [협의 필요]는 확정된 것처럼 구현하지 않는다. 문서에 없는 엔드포인트·필드는 추측해서 채우지 않는다.

## [확정]

### 공통

- **base path**: `/api/core/v1` (백엔드 최종 확인)
- **인증**: **BFF(Backend for Frontend) 채택.**
  - 프론트는 `accessToken`/`refreshToken`을 저장하지 않는다.
  - 토큰 관리·갱신(회전 발급 포함)은 서버(BFF)가 담당한다.
  - 프론트는 **401 수신 시 재로그인만 유도**한다(프론트 쪽 재발급 로직 없음).
  - Axios는 **`withCredentials: true`**를 전제로 쿠키 기반 인증을 사용한다.
- **소셜 로그인**: **별도 POST로 토큰 교환** 방식으로 확정. (엔드포인트 세부는 백엔드 구현·문서화 대기 → [협의 필요])
- 개인 API는 사용자 ID를 쿼리·바디로 받지 않는다. 서버가 세션(쿠키)으로 식별한다.
- **에러 형식**: `{ code, message, fieldErrors }`.
- **상태 코드**: `200` / `201` / `204` / `400` / `401` / `404` / `409` / `422`.
- **권한 실패는 403이 아니라 `404`로 응답한다**(존재 여부 은닉). 타인 비공개 데이터·소유자 전용 자원 접근 포함.
- **시간 형식**: ISO 8601 **UTC**.
- **OpenAPI(Swagger) 제공 예정** → 확정 후 `/v3/api-docs`로 타입 자동 생성 계획.

### 페이지네이션

- **커서 기반**: `{ items, nextCursor, hasNext }`. 커서는 불투명 문자열(클라이언트가 해석·수정하지 않음). `size` 기본 **20**.
- 세 커서(팔로우 목록 · 책장별 Collection · Record)는 독립적이며 혼용하지 않는다.
- **검색은 페이지네이션하지 않는다.** 유사도 상위 `size`(기본 20) 단일 응답.

### Place · 지도 · 검색

- **장소 검색은 BFF 경유로 확정.** 프론트는 카카오 로컬 API를 직접 호출하지 않는다.
  - 백엔드가 검색 프록시 API를 별도 제공 예정(명세 대기 → [협의 필요]).
  - `08_API_명세` §4.1의 "프론트 직접 호출" 서술은 이 결정으로 대체됨.
- **카카오 API 키**: 백엔드(BFF)·GitHub Secrets에서 관리. 프론트는 키를 다루지 않는다.
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
- **`recordSize` 기본값 1은 의도된 값**(책 넘김 UX). **모바일 = 1, 웹 펼침 = 2**로 명시해서 요청한다. 미전송 시 서버가 1을 주고, 다음 페이지는 `records.nextCursor`로 이어받는다.

### Feed 이벤트

- `GET /feed/collections` 응답 최상위에 `requestId`, 각 item에 `position`이 존재한다.
- `POST /feed/events`는 **`CLICK`·`SAVE` 두 가지만 프론트가 전송**한다. **`IMPRESSION`은 서버가 목록 응답 생성 시 기록**한다(프론트가 보내지 않는다).
- 이벤트 전송 시 다음 3가지를 반드시 지킨다.
  1. **Keyword의 키는 `label`이 아니라 `code`(불변 식별자)다.** `label`은 표시용이라 변경될 수 있다.
  2. **`position`은 배열 인덱스가 아니라 응답 값을 그대로 사용한다**(2페이지 첫 항목은 `0`이 아니다).
  3. **`requestId`는 응답 단위다.** 페이지를 넘기면 새 값이며, 그 페이지에서 발생한 이벤트는 그 페이지의 `requestId`를 쓴다.

### AI 검색 · Keyword

- **자연어 검색 응답 시간**: 정상 0.5~1초, 최악 2~3초, 장애 시 5~10초 타임아웃.
  - UI: 0~1.5초 스피너 → 1.5초 경과 후 "맥락을 분석하고 있어요" 문구 → 타임아웃 시 에러 처리.
- **Keyword 생성**: 정상 2초 이내 완료. 폴링은 저장 후 **3초·8초 2회만** 재조회하고 중단한다. **무한 폴링 금지** — 실패 복구는 분 단위로 이뤄져 폴링으로는 잡을 수 없다.
- **`keywords` 빈 배열은 정상**이다(COMPLETED 0건 포함). 실패로 처리하지 않는다.
- 현재 응답은 **실패 / 처리중 / 정상 0건을 구분하지 못한다**(A안 현행 유지).

### Keyword 등급 (MVP)

- **MVP에서는 Keyword 등급(`visibility`)을 사용하지 않는다.** 모든 Keyword를 `PUBLIC`처럼 취급하고 등급 구분 UI를 만들지 않는다.
- 응답은 **현행 `label` 문자열 배열**을 사용한다.
- `{ code, label, visibility }` 형태는 AI 파트가 확장용으로 보유하나 **MVP 범위 밖**이다.
- 단, 프론트가 Keyword를 내부 키로 다뤄야 하는 경우(아이콘 매핑·필터 상태)에는 `label`이 아니라 **향후 도입될 `code`**를 쓰도록 설계 여지를 남긴다.

## [협의 필요]

> 이 섹션은 임의로 채우지 않는다. 확정 전까지 구현에서 확정된 것으로 가정하지 않는다.

1. **BFF 세부 계약** — 쿠키명, 만료·로그아웃 처리 등 세부는 백엔드 문서화 대기.
2. **소셜 로그인 토큰 교환 엔드포인트** — "별도 POST 교환" 방식은 확정, 엔드포인트 경로·요청/응답 스키마는 명세 대기.
3. **카카오 검색 프록시 API** — BFF 경유 방식은 확정, 엔드포인트 경로·요청/응답 스키마는 명세 대기.
4. **Collection 내부 Record 정렬** — 정책(오름차순) vs 구현(`created_at DESC`) 충돌. 프론트는 서버 응답 순서를 그대로 쓰므로 코드 영향은 없다. 문서 정리는 백엔드/기획 대기.
5. **Context 본문 최대 길이** — 미정(`06_데이터모델_및_무결성.md` §8). Zod `maxLength` 확정 불가. 임시로 최소 길이(공백 아님)만 검증한다.
6. **provider 대소문자** — 경로는 소문자(`kakao`), 응답은 대문자(`KAKAO`). 타입은 대문자로 두고 경로 조립 시 `toLowerCase()`로 매핑한다.
