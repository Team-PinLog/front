# PinLog Front — 에이전트 하네스

PinLog 프론트엔드(PC 웹). 스택: React + TypeScript + Vite + Tailwind + TanStack Query/Router + Axios + React Hook Form + Zod.
백엔드: Spring Boot 4.1.0 / PostgreSQL / Redis / OAuth2. 구현은 나, UI/UX는 동료(ghkim1632).

> Vite 프로젝트는 생성돼 있고 기능 구현이 진행 중이다. 폴더 구조는 `docs/architecture.md` 2장이 현행 기준이다.

## 작업 전 반드시 읽는다

- `docs/conventions.md` — 용어·코드·Git·Jira 규칙
- `docs/architecture.md` — 데이터 흐름, 폴더 계획, 상태 분리
- `docs/privacy-rules.md` — 공개 범위와 노출 금지 규칙
- `docs/api-contract.md` — API 계약(확정/협의 필요). 원본은 `docs/reference/08_API_명세.md`
- 도메인 판단이 필요하면 `docs/reference/`의 원본 문서를 근거로 삼는다. 추측 금지.

## 절대 금지 (확정 사실 기반)

1. 공개 화면(Feed·타인 Shelf·Collection 상세)에 타인 **Context 원문**, **`member.id`**(내부 사용자 ID), **Keyword `code`** 노출. 타인 응답의 `contexts`는 `null`이며, 진입점은 Collection id, Keyword 표시는 `label`만 쓴다.
2. **Keyword `label`을 식별 키로 사용**. 식별자는 불변인 `code`이고, `label`은 표시 전용이라 변경될 수 있다.
3. Context 수정 후 **구 `contextId`를 쿼리 키·URL·선택 상태로 계속 사용**. 응답의 새 id로 교체한다.
4. AI 미완료 상태인 **`keywords: []`를 오류·로딩 실패로 처리**. 정상 응답이다.
5. **Feed `position`/`requestId`를 프론트에서 재계산**. 응답 값을 그대로 사용한다.
6. **토큰(access/refresh)을 프론트가 저장**. 서버가 `HttpOnly`+`Secure`+`SameSite=Lax` 쿠키로 관리하며, 프론트는 값을 읽거나 보관하지 않는다.
   - ⚠️ 이것이 "재발급 로직을 만들지 말라"는 뜻은 **아니다**. 401 시 프론트가 `POST /auth/refresh`를 **single-flight**로 직접 호출해 재발급해야 한다(본문 없음, 쿠키로 동작). 재발급 자체의 401은 재시도하지 않고 즉시 재로그인 화면으로 유도한다(`docs/api-contract.md` 401 처리, `docs/reference/11_인증_설계.md` 4.4, `docs/troubleshooting/2026-07-27-auth-bff-decision.md`).

## 규칙

- 문서에 없는 정책·엔드포인트를 추측해서 구현하지 않는다. `api-contract.md`의 "협의 필요" 항목은 확정된 것처럼 구현하지 않는다.
- 유사한 오류를 만나면 `docs/troubleshooting/`을 먼저 확인한다.
- 참조 문서 원본은 Team-PinLog/docs 레포다. 직접 수정하지 말고 doc-syncer로 갱신한다.
- **작업 진행은 `docs/conventions.md` 5장 절차를 따른다** — 티켓 → 이슈키 → 브랜치 생성 → 작업 → **커밋 전 보고** → `/pr`. 이슈키 없이 브랜치를 만들지 않고, `/pr` 없이 커밋·push하지 않으며, merge는 하지 않는다.
