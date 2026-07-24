# 아키텍처

대상: PC 웹. 스택 예정: React + TypeScript + Vite + Tailwind + TanStack Query + TanStack Router + Axios + React Hook Form + Zod.

> 프로젝트는 아직 생성 전이다. 아래 폴더 구조는 **계획**이며, 생성 시 이 문서를 기준으로 맞춘다.

## 1. 데이터 흐름

```text
화면(Component)
  → Query/Mutation Hook (TanStack Query)
    → API 함수 (엔드포인트별 함수, 요청/응답 타입 소유)
      → HTTP Client (Axios 인스턴스: baseURL, 인증 헤더, 401 처리)
        → Backend (/api/core/v1)
```

- 컴포넌트는 Hook만 호출한다. API 함수나 Axios를 직접 부르지 않는다.
- API 함수는 요청/응답 타입을 소유하고 Zod로 응답을 파싱한다.
- HTTP Client는 공통 관심사(baseURL, `Authorization` 헤더 주입, 401 → 재발급/재로그인)를 담당한다.
- 인증·에러·페이지네이션 규약은 `docs/api-contract.md`를 따른다.

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
