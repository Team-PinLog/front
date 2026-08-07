# 아키텍처

대상: PC 웹. 스택: React + TypeScript + Vite + Tailwind + TanStack Query + TanStack Router + Axios + React Hook Form + Zod.

> 아래 폴더 구조는 계획이 아니라 **현행**이다. 새 도메인을 추가하면 2장 목록을 함께 갱신한다.

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
- **세상의 장소를 찾는 검색**(아직 내 기록이 없는 장소)과 지도 렌더링은 프론트가 카카오를 직접 호출한다. 검색은 카카오 로컬 API(REST), 렌더링은 카카오 지도 JS SDK이며 백엔드 프록시를 경유하지 않는다.
- **내 기록 안의 장소를 찾는 검색은 카카오가 아니라 서버 `GET /records/map?keyword=`다** — 카카오는 내가 무엇을 기록했는지 모른다. 컬렉션 만들기의 장소 선택도 별도 API 없이 이 엔드포인트를 재사용한다. 세 종류 검색(카카오 / `records/map?keyword` / `POST /search/records`)의 구분은 `docs/api-contract.md` [확정] Place·지도·검색 표를 따른다.
- 인증·에러·페이지네이션 규약은 `docs/api-contract.md`를 따른다.

### 1-1. 인증 (쿠키 기반)

인증은 **쿠키 기반**이다. BFF와 리소스 서버는 별도 계층이 아니라 Spring 단일 앱이 겸한다(`docs/reference/11_인증_설계.md` 2장).

- Axios는 **`withCredentials: true`**로 인증 쿠키를 자동 전송한다(fetch는 `credentials: 'include'`). **Bearer 토큰을 헤더에 직접 주입하지 않는다.** 프론트는 accessToken/refreshToken을 저장하지 않는다 — 서버가 `HttpOnly`+`Secure`+`SameSite=Lax` 쿠키로 관리한다.
- **401 시 프론트가 `POST /auth/refresh`를 직접 호출한다**(요청 본문 없음, Refresh 쿠키로 동작). 성공하면 새 쿠키가 `Set-Cookie`로 갱신되고 원래 요청을 재시도한다. 실패(401)하면 재로그인 화면으로 유도한다.
- **재발급은 동시에 하나만 보낸다(single-flight 필수).** 회전 발급이라 여러 요청이 401을 한꺼번에 받아도 재발급 호출은 한 번만 하고 나머지는 그 결과를 기다린다. **재발급 요청 자체의 401은 재시도하지 않는다**(무한 루프 방지) — 즉시 재로그인으로 유도한다. 이 401 응답이 인증 쿠키 세 개(`access_token`·`refresh_token`·`logged_in`)를 함께 만료시키므로 프론트가 표시 쿠키를 따로 지우지 않는다.
- **single-flight는 탭·창 사이에서도 묶는다.** 인증 쿠키는 오리진 단위로 탭이 공유하므로, 탭마다 따로 묶으면 두 탭이 같은 Refresh 토큰으로 동시에 회전시켜 늦게 도착한 쪽이 401을 받고 사용자가 로그아웃된다(`docs/reference/11_인증_설계.md` 4.4).
  - 수단은 **Web Locks(`navigator.locks.request`)**다. `BroadcastChannel`은 메시지 전달 수단일 뿐이라 리더 선출·타임아웃을 직접 구현해야 하고 **락을 쥔 탭이 닫히면 남은 탭이 영구 대기**하는 반면, Web Locks는 브라우저가 상호배제를 보장하고 탭이 죽으면 락을 자동 회수한다.
  - 락은 **동시 호출만 막고 중복 호출은 막지 않는다.** 두 번째 탭은 락을 얻은 뒤 이미 회전된 새 Refresh 쿠키로 다시 재발급하므로 성공한다 — 문제였던 것은 순서가 아니라 동시성이다. "이미 누가 갱신했는지" 공유하는 추가 상태를 두지 않는 이유다.
  - `navigator.locks`가 없는 환경(비보안 컨텍스트, 테스트 환경 등)은 탭 내 single-flight로 폴백한다. 크로스탭 보장만 없어지고 기존 동작보다 나빠지지 않는다.
- **`503`은 401과 같은 분기로 묶지 않는다.** 자격증명 거절이 아니라 인증 여부를 확인하지 못한 상태라 재발급해도 같은 결과가 반복된다 — 세션을 유지한 채 재시도하거나 오류를 표시한다. 묶으면 일시적 장애가 전체 로그아웃으로 번진다.
- **CSRF**: 서버가 내려주는 `XSRF-TOKEN` 쿠키(비-`HttpOnly`) 값을 상태 변경 요청(`POST`·`PUT`·`PATCH`·`DELETE`)의 `X-XSRF-TOKEN` 헤더로 실어 보낸다. `GET` 등 조회 요청은 해당 없음.
- **로그인 상태 확인**: `logged_in` 비-`HttpOnly` 쿠키로 앱 시작 시 초기 화면(로그인/메인)을 결정한다. **UI 힌트 전용이며 인가 판단에 쓰지 않는다** — 실제 인가는 서버가 매 요청 인증 쿠키로 검증한다.
- 세부 계약은 `docs/api-contract.md`의 [확정] 인증 섹션을 따른다.

## 2. 폴더 구조

```text
src/
  app/          # 라우터, 프로바이더, 전역 레이아웃
  pages/        # 라우트 단위 화면
  features/     # 도메인 단위 묶음 (아래 목록)
    <feature>/
      api/       # API 함수 + 요청/응답 타입(Zod 스키마)
      hooks/     # useXxxQuery / useXxxMutation
      components/
      lib/       # 그 도메인 안에서만 쓰는 순수 함수
  shared/
    http/        # Axios 인스턴스, 인터셉터
    ui/          # 공용 컴포넌트
    lib/         # 유틸
  contexts/     # UI 상태용 Context (아래 3장)
```

현재 `features/`는 12개다 — `auth`, `collections`, `feed`, `follows`, `home`, `layout`, `map`, `me`, `paper`, `places`, `records`, `search`.

- 폴더 소유자를 나누지 않는다. 구현은 한 사람이 담당한다.
- `layout`은 도메인이 아니라 AppShell(네비 카드·설정 모달) 묶음이고, `home`·`me`는 화면 단위 묶음이다 — 실제 도메인은 8개다.
- `paper`도 도메인이 아니라 **종이 지면의 공통 무대**다(409, design-ver2 이식 1/3). 홈·탐색·책장이 같은 종이 위에 있어야 한 제품으로 읽히므로, 지면 한 장(`.paper-sheet`)과 브랜드 토큰·질감 레이어(`.pl-stage` / `.pl-grain`·`.pl-emboss`·`.pl-spot`)와 그것들이 참조하는 SVG 필터(`PaperFilterDefs`)를 **여기 한 곳에만** 둔다. 화면은 이 무대 위에 자기 조판만 얹고 종이 자체를 만들지 않는다.
  - `PaperStage`는 `position:absolute; inset:0`이라 부모가 크기를 확정해 줘야 하고, `PaperFilterDefs`는 id 참조 묶음이라 한 화면에 무대를 둘 이상 세우면 깨진다.

## 3. 상태 분리

- **서버 상태 = TanStack Query.** 서버에서 온 데이터(Record, Collection, Feed, Follow, 검색 결과 등)는 Query로 관리한다. 캐시·무효화·재요청을 Query에 위임한다.
- **UI 상태 = Context API.** 서버와 무관한 화면 상태(모달 열림, 지도 선택, 검색어 입력, 삭제 확인 단계 등)는 Context로 관리한다.
- 두 상태를 한 store에 섞지 않는다. 서버 데이터를 Context에 복사해 들고 있지 않는다.
- Context가 **상태가 아니라 동작 하나만** 나르는 경우도 있다. `SettingsTriggerContext`(409)가 그렇다 — 설정 패널의 열림 상태와 포커스·ESC 처리는 전부 `AppLayout`이 계속 갖고, Context로는 `openSettings` 함수 하나만 내려 종이 화면이 자기 조판 안에 설정 진입점을 놓을 수 있게 한다. 상태를 복제하지 않으므로 진입점이 몇 개든 사실은 한 곳에만 있다.
  - 기본값은 no-op이다. 로그인·약관처럼 셸(Provider) 밖 경로에서 호출돼도 터지지 않아야 하고, 그쪽은 애초에 설정을 열 자리가 아니다.
  - Provider value는 `useMemo`로 고정한다 — 매 렌더 새 객체가 되면 구독 화면이 전부 다시 그려진다.

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
