# 아키텍처

대상: PC 웹. 스택 예정: React + TypeScript + Vite + Tailwind + TanStack Query + TanStack Router + Axios + React Hook Form + Zod.

> 프로젝트는 아직 생성 전이다. 아래 폴더 구조는 **계획**이며, 생성 시 이 문서를 기준으로 맞춘다.

## 1. 데이터 흐름

```text
화면(Component)
  → Query/Mutation Hook (TanStack Query)
    → API 함수 (엔드포인트별 함수, 요청/응답 타입 소유)
      → HTTP Client (Axios 인스턴스: baseURL, withCredentials, 401 처리)
        → Backend (/api/core/v1, BFF)
```

- 컴포넌트는 Hook만 호출한다. API 함수나 Axios를 직접 부르지 않는다.
- API 함수는 요청/응답 타입을 소유하고 Zod로 응답을 파싱한다.
- HTTP Client는 공통 관심사(baseURL, 쿠키 전송, 401 → refresh 시도 → 실패 시 재로그인 유도)를 담당한다.
- 장소 검색·지도 렌더링은 프론트가 카카오를 직접 호출한다. 장소 검색은 카카오 로컬 API(REST), 지도 렌더링은 카카오 지도 JS SDK이며, 백엔드 프록시를 경유하지 않는다(`docs/api-contract.md`).
- 인증·에러·페이지네이션 규약은 `docs/api-contract.md`를 따른다.

### 1-1. 인증 (쿠키 기반)

인증은 **쿠키 기반**이다. BFF와 리소스 서버는 별도 계층이 아니라 Spring 단일 앱이 겸한다(`docs/reference/11_인증_설계.md` 2장).

- Axios는 **`withCredentials: true`**로 인증 쿠키를 자동 전송한다(fetch는 `credentials: 'include'`). **Bearer 토큰을 헤더에 직접 주입하지 않는다.** 프론트는 accessToken/refreshToken을 저장하지 않는다 — 서버가 `HttpOnly`+`Secure`+`SameSite=Lax` 쿠키로 관리한다.
- **401 시 프론트가 `POST /auth/refresh`를 직접 호출한다**(요청 본문 없음, Refresh 쿠키로 동작). 성공하면 새 쿠키가 `Set-Cookie`로 갱신되고 원래 요청을 재시도한다. 실패(401)하면 재로그인 화면으로 유도한다.
- **재발급은 동시에 하나만 보낸다(single-flight 필수).** 회전 발급이라 여러 요청이 401을 한꺼번에 받아도 재발급 호출은 한 번만 하고 나머지는 그 결과를 기다린다. **재발급 요청 자체의 401은 재시도하지 않는다**(무한 루프 방지) — 즉시 재로그인으로 유도한다.
- **CSRF**: 서버가 내려주는 `XSRF-TOKEN` 쿠키(비-`HttpOnly`) 값을 상태 변경 요청(`POST`·`PUT`·`PATCH`·`DELETE`)의 `X-XSRF-TOKEN` 헤더로 실어 보낸다. `GET` 등 조회 요청은 해당 없음.
- **로그인 상태 확인**: `logged_in` 비-`HttpOnly` 쿠키로 앱 시작 시 초기 화면(로그인/메인)을 결정한다. **UI 힌트 전용이며 인가 판단에 쓰지 않는다** — 실제 인가는 서버가 매 요청 인증 쿠키로 검증한다.
- 세부 계약은 `docs/api-contract.md`의 [확정] 인증 섹션을 따른다.

## 2. 폴더 구조 계획

```text
src/
  app/          # 라우터, 프로바이더, 전역 레이아웃
  pages/        # 라우트 단위 화면
  features/     # 도메인 단위 묶음 (records, collections, feed, follow, search, auth ...)
    <feature>/
      api/       # API 함수 + 요청/응답 타입(Zod 스키마)
      hooks/     # useXxxQuery / useXxxMutation
      components/
  shared/
    http/        # Axios 인스턴스, 인터셉터
    ui/          # 공용 컴포넌트
    lib/         # 유틸
  contexts/     # UI 상태용 Context (아래 3장)
```

- 폴더 소유자를 나누지 않는다. 구현은 한 사람이 담당한다.

## 3. 상태 분리

- **서버 상태 = TanStack Query.** 서버에서 온 데이터(Record, Collection, Feed, Follow, 검색 결과 등)는 Query로 관리한다. 캐시·무효화·재요청을 Query에 위임한다.
- **UI 상태 = Context API.** 서버와 무관한 화면 상태(모달 열림, 지도 선택, 검색어 입력, 삭제 확인 단계 등)는 Context로 관리한다.
- 두 상태를 한 store에 섞지 않는다. 서버 데이터를 Context에 복사해 들고 있지 않는다.

## 4. Context 불변성 (참조: `docs/reference/05-1_파트간_요구사항.md` 1.1)

Context는 불변 엔티티다. 수정은 내부적으로 **기존 Context 삭제 + 새 Context 생성**으로 처리되고, 응답에 **새 `contextId`**가 온다.

수정 성공 시 프론트는:

- 응답의 새 `contextId`를 반영한다.
- 구 `contextId`로 재조회하지 않는다.
- 구 `contextId`를 쿼리 키·로컬 캐시 키로 계속 쓰지 않는다.
- URL·선택 상태가 Context id를 포함하면 **새 id로 교체**한다.
- Optimistic Update 시 새 id가 오기 전 구 id를 영구 확정하지 않는다.

즉, Context 수정 후에는 **쿼리 키·URL·선택 상태를 새 id로 갈아끼워야 한다.** 사용자에게는 "수정"이지만 데이터 관점에서는 새 맥락이다.

## 5. AI 미완료 상태 (참조: `docs/reference/05-1_파트간_요구사항.md` 1.2)

AI 분석은 저장 이후 비동기로 진행된다.

- **`keywords: []`(빈 배열)은 정상 응답이다.** 로딩 실패나 오류로 처리하지 않는다.
- Context 생성·수정 직후 Keyword가 잠시 비어 있을 수 있고, 잠시 후 표시된다.
- 수정 재분석 중에는 해당 Context가 자연어 검색·Keyword 응답에서 일시적으로 빠질 수 있다.
- **AI 실패가 기본 기능을 막지 않는다.** Place·Record·Collection은 Keyword 없이도 정상 표시한다.
