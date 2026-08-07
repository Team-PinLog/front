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
- **하나의 사실을 두 변수가 나눠 들지 않는다.** 특히 외부 라이브러리 인스턴스의 준비 여부가 렌더에 영향을 준다면 ref가 아니라 state로 든다 — ref는 갱신해도 리렌더가 없어 effect가 다시 돌지 않는다(`docs/troubleshooting/2026-08-06-map-remount-ref-state-race.md`, S15P11A705-346).
- **Tailwind 클래스는 리터럴로만 쓴다.** Tailwind는 소스를 원시 텍스트로 스캔해 양방향으로 조용히 틀린다 — 문자열 조작으로 만든 클래스는 스캔되지 않아 **스타일이 없고**, 주석에 클래스처럼 생긴 문자열을 적으면 스캔돼 **없는 규칙이 생긴다**. 조건부는 완성된 리터럴 중 하나를 고르는 형태로 쓰고, 주석에서 클래스를 언급할 때 대괄호 arbitrary value를 그대로 적지 않는다(`docs/troubleshooting/2026-08-06-collection-spread-redesign-lessons.md`·`2026-08-06-silent-css-traps-nav-shell.md`).
- **새 컴포넌트를 만들기 전에 기존 구현을 먼저 찾는다.** 병렬 작업에서 배정받은 "내 파일 목록"은 쓰기 권한의 경계이지 **탐색 범위의 경계가 아니다**. 배정 밖 파일을 고쳐야 하면 우회해서 새로 만들지 말고 보고한다(S15P11A705-332).
- **모듈 스코프 플래그·전역 상태의 소비자를 지울 때 생산자도 함께 확인한다.** 타입으로 이어지지 않아 컴파일러가 알려주지 않는다 — 읽는 쪽을 지우면 쓰는 쪽이 아무도 안 보는 값을 계속 쓴다. 당장 지울 수 없으면 후속 정리 대상으로 명시한다(S15P11A705-332 → 350).
- **`httpClient`로 `FormData`(multipart) 요청을 보낼 때는 `Content-Type` 헤더를 지운다.** `httpClient`가 기본 헤더로 `Content-Type: application/json`을 고정하고 있어서, 그대로 두면 브라우저가 multipart boundary를 붙이지 못해 요청이 깨진다(서버가 `image/jpeg` 등을 JSON으로 파싱하려다 실패).

  ```typescript
  const formData = new FormData();
  formData.append('image', image, image.name);

  const { data } = await httpClient.post('/places/suggestions', formData, {
    headers: { 'Content-Type': undefined },
  });
  ```

  `'multipart/form-data'`를 직접 지정하지 않는다 — boundary 값을 브라우저가 요청 생성 시점에 채워야 하므로, 헤더를 아예 비워(`undefined`) 브라우저가 자동으로 채우게 한다. 예시: `suggestPlacesFromImage.ts`(S15P11A705-345).

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

## 5. 작업 진행 절차

아래 순서를 따른다. **각 단계는 사용자의 명시적 신호로만 다음 단계로 넘어간다.**

| 단계                     | 주체     | 내용                                                                          |
| ------------------------ | -------- | ----------------------------------------------------------------------------- |
| 1. 작업 제시             | 사용자   | 대화로 오늘 할 일을 말한다                                                    |
| 2. 티켓 작성             | 에이전트 | `/ticket`으로 인터뷰해 티켓 본문을 만든다. **git 조작 없음**                  |
| 3. 티켓 등록             | 사용자   | Jira에 등록하고 이슈키를 알려준다                                             |
| 4. 브랜치 생성·계획 보고 | 에이전트 | 이슈키를 받으면 `dev`에서 브랜치를 만들고(3장 명명 규칙) 작업 계획을 보고한다 |
| 5. 착수 승인             | 사용자   | "진행해"                                                                      |
| 6. 작업·**커밋 전 보고** | 에이전트 | 코드를 고치고 **커밋하지 않은 채** 변경 내용을 보고하고 멈춘다                |
| 7. `/pr`                 | 사용자   |                                                                               |
| 8. 커밋·push·PR          | 에이전트 | 커밋을 기능별로 나누고 push, PR 생성. **머지는 하지 않는다**                  |

- **이슈키 없이 브랜치를 만들지 않는다.** 다른 작업의 이슈키를 재사용하는 것도 금지다.
- **6단계를 건너뛰지 않는다.** 검사(타입체크·테스트)가 다 통과해도 커밋 전에 보고하고 멈춘다.
- **merge는 항상 사용자가 GitHub 웹에서 직접 한다.** 에이전트는 머지 가능 여부(충돌·CI)만 확인해 보고한다.
- 위 절차 밖에서는 `checkout`·`branch`·`pull`·`push`·`merge`·`commit`·`add`를 실행하지 않는다. 필요하면 사용자에게 요청한다.
- 판단 근거는 추측이 아니라 실제 문서·코드·레포 상태여야 한다. 다른 레포(`Team-PinLog/back`·`docs`) 상태가 걸리면 `gh`로 직접 확인한다.

## 6. 데이터 처리

- 목록 순서는 서버 응답 순서를 그대로 사용한다. 프론트에서 재정렬하지 않는다.
- Feed `position`·`requestId`는 응답 값을 그대로 사용하고 프론트에서 재계산하지 않는다.
- Keyword의 식별 키는 `code`다. 표시 문자열(`display_name`, 구 컬럼명 `label`)을 상태 키·매핑 키로 쓰지 않는다.
- [해결됨] origin(Team-PinLog/docs)이 `keyword_preset`의 DB 컬럼명을 label→display_name으로 변경함(2026-07 업데이트). API 응답(`keywords`)은 원래도 code/label 구분 없는 순수 문자열 배열이라 JSON 계약 변경 없음(`08_API_명세` §6.1, `05_AI_설계` §12.1, 2026-08 재확인).

## 7. 개발 전용 라우트

- `/dev/*` 등 개발·QA 전용 라우트는 `router.tsx`에서 `import.meta.env.DEV` 조건으로 라우트 트리 등록 자체를 감싼다(예시: `placeRecordPreviewRoute`). Vite가 빌드 타임에 상수로 치환해 프로덕션 빌드에서는 조건이 `false`로 굳어지므로 라우트가 등록되지 않아 해당 경로는 `NotFoundPage`로 떨어진다 — URL을 알아도 접근할 수 없다. (페이지 컴포넌트 자체는 모듈 그래프에서 정적으로 참조되므로 번들에는 남지만, 라우터가 마운트하지 않아 실행되지는 않는다.)
- `beforeLoad` 인증 가드(`requireLoggedIn` 등)로는 대체하지 않는다. 개발 전용 라우트는 종종 "로그인 없이 테스트 세션을 발급"하는 등 인증 가드와 목적이 상충하는 기능을 담기 때문이다.
- 개발 전용 라우트가 호출하는 API가 있다면, 그 API가 운영 백엔드에도 노출되어 있는지 별도로 확인한다. 프론트에서 라우트를 숨겨도 백엔드 엔드포인트 자체가 운영에 살아 있으면 URL을 아는 누구나 호출할 수 있다 — 이건 프론트만으로는 막을 수 없는 백엔드 이슈다(S15P11A705-342).
