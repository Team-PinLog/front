# 컨벤션

## 1. 용어

- 공식 용어는 `docs/reference/03_공식_용어사전.md`를 기준으로 사용한다.
- 코드 식별자·주석·UI 텍스트·커밋 메시지에 공식 영문 용어를 그대로 쓴다.
  - User, Place, Record, Context, Keyword, Collection, CollectionRecord, Shelf, Library, Follow, Feed, Feed Event, Impression
- 폐기·비공식 용어를 쓰지 않는다.
  - `Memory` → `Record` 또는 `Context` (문맥에 맞게)
  - `Folder` → `Collection`, `Tag`(사용자 입력 태그) → `Keyword`(AI 매핑)
  - `Bookmark`/`Post`/`Review` 같은 임의 명칭 금지
- Shelf·Library는 화면·조회 개념이며 물리 테이블이 아니다(`docs/reference/06_데이터모델_및_무결성.md` 1.4). 저장 구조를 가정하지 않는다.

## 2. 코드

- `any` 금지. 불가피하면 `unknown` 후 좁히기. 타입을 못 정하면 스펙(`docs/api-contract.md`)을 먼저 확인한다.
- **컴포넌트에서 API를 직접 호출하지 않는다.** 데이터 흐름은 `docs/architecture.md`를 따른다(화면 → Hook → API 함수 → HTTP Client).
- 서버 상태(TanStack Query)와 UI 상태(Context API)를 한 곳에 섞지 않는다.
- 검증 스키마는 Zod로 정의하고 API 경계에서 파싱한다.

## 3. Git

- 브랜치: `main`(배포), `dev`(통합). 기능은 항상 `dev`에서 분기한다.
- Jira 이슈키 형식: `S15P11A705-숫자` (예: `S15P11A705-42`).

| 대상    | 형식                               | 예시                                  |
| ------- | ---------------------------------- | ------------------------------------- |
| 브랜치  | `feature/S15P11A705-<번호>-<설명>` | `feature/S15P11A705-42-record-map`    |
| 커밋    | `type(S15P11A705-<번호>): 설명`    | `feat(S15P11A705-42): 지도 마커 조회` |
| PR 제목 | `[S15P11A705-<번호>] 설명`         | `[S15P11A705-42] 지도 마커 조회`      |

- 커밋 `type`: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `style` 등 Conventional Commits.
- 설명은 한국어로 간결하게 쓴다.

## 4. Merge 규칙

| 방향                | 방식                 | 이유                                     |
| ------------------- | -------------------- | ---------------------------------------- |
| `feature/*` → `dev` | **Squash and merge** | 기능 단위로 커밋 히스토리를 한 줄로 압축 |
| `dev` → `main`      | **Merge commit**     | 릴리스 시점을 병합 커밋으로 보존         |

- hotfix는 `main`에 반영한 뒤 반드시 `dev`에도 반영한다(PR 템플릿 하단 항목 참조).

## 5. 커밋

- 커밋·푸시는 사용자가 직접 한다. 에이전트는 요청 없이 커밋하지 않는다.
- 단, Claude Code `/pr` 커맨드 실행 시에는 예외로 커밋 메시지 생성(한 줄, `type(이슈키): 설명` 형식)·commit·push·PR 생성까지 자동 수행한다. 이는 `/pr` 호출 자체를 사용자의 명시적 트리거로 간주하기 때문이며, 그 외 모든 git 조작 명령어(checkout/branch/pull/push/merge/commit/add)는 여전히 사용자가 직접 실행한다. merge는 항상 사용자가 GitHub 웹에서 직접 한다.

## 6. 데이터 처리

- 목록 순서는 서버 응답 순서를 그대로 사용한다. 프론트에서 재정렬하지 않는다.
- Feed `position`·`requestId`는 응답 값을 그대로 사용하고 프론트에서 재계산하지 않는다.
- Keyword의 식별 키는 `code`다. 표시 문자열(`display_name`, 구 컬럼명 `label`)을 상태 키·매핑 키로 쓰지 않는다.
- [해결됨] origin(Team-PinLog/docs)이 `keyword_preset`의 DB 컬럼명을 label→display_name으로 변경함(2026-07 업데이트). API 응답(`keywords`)은 원래도 code/label 구분 없는 순수 문자열 배열이라 JSON 계약 변경 없음(`08_API_명세` §6.1, `05_AI_설계` §12.1, 2026-08 재확인).
