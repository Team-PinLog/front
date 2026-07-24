# PinLog Front — 에이전트 하네스

PinLog 프론트엔드(PC 웹). 스택 예정: React + TypeScript + Vite + Tailwind + TanStack Query/Router + Axios + React Hook Form + Zod.
백엔드: Spring Boot 4.1.0 / PostgreSQL / Redis / OAuth2. 구현은 나, UI/UX는 동료(ghkim1632).

> Vite 프로젝트는 아직 생성 전이다. 현재 레포에는 문서·설정만 있다.

## 작업 전 반드시 읽는다

- `docs/conventions.md` — 용어·코드·Git·Jira 규칙
- `docs/architecture.md` — 데이터 흐름, 폴더 계획, 상태 분리
- `docs/privacy-rules.md` — 공개 범위와 노출 금지 규칙
- `docs/api-contract.md` — API 계약(확정/협의 필요). 원본은 `docs/reference/08_API_명세.md`
- 도메인 판단이 필요하면 `docs/reference/`의 원본 문서를 근거로 삼는다. 추측 금지.

## 절대 금지 (확정 사실 기반)

1. 타인 화면(Feed·타인 Shelf·Collection 상세)에 **Context 원문 노출**. 타인 응답의 `contexts`는 `null`이다.
2. **`member.id`(내부 사용자 ID)를 URL·요청·응답에 사용**. 진입점은 Collection id다.
3. **Keyword `code` 노출**. Keyword는 `label`만 사용한다.
4. Context 수정 후 **구 `contextId`를 쿼리 키·URL·선택 상태로 계속 사용**. 응답의 새 id로 교체한다.
5. AI 미완료 상태인 **`keywords: []`를 오류·로딩 실패로 처리**. 정상 응답이다.

## 규칙

- 문서에 없는 정책·엔드포인트를 추측해서 구현하지 않는다. `api-contract.md`의 "협의 필요" 항목은 확정된 것처럼 구현하지 않는다.
- 유사한 오류를 만나면 `docs/troubleshooting/`을 먼저 확인한다.
- 참조 문서 원본은 Team-PinLog/docs 레포다. 직접 수정하지 말고 doc-syncer로 갱신한다.
- 커밋은 사용자가 직접 한다. 요청 없이 커밋·푸시하지 않는다.
