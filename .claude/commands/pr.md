---
description: 변경사항을 분석해 커밋 → push → PR 생성까지 전체 자동화한다.
---

현재 브랜치의 변경사항으로 커밋을 생성하고, push한 뒤, 가능하면 PR까지 생성한다.

추가 맥락(선택): $ARGUMENTS

## 0. 사전 확인

- `git status`, `git diff dev...HEAD` (base 브랜치는 `dev` 고정, 단 `git rev-parse --verify dev`로 실제 존재 여부 먼저 확인한다. 없으면 즉시 중단하고 보고한다.)
- `git status`로 스테이징 대상에 `.env`, 빌드 산출물(`dist/`, `node_modules/` 등) 같은 의도치 않은 파일이 보이면, 커밋을 진행하지 말고 사용자에게 먼저 보고한다.

## 1. 커밋 메시지 생성

- 형식: `type(이슈키): 설명` 한 줄, body 없음. (`docs/conventions.md` 3장 기준)
- `type`은 Conventional Commits 중 `commitlint.config.js`가 허용하는 값(`feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`, `perf`, `ci`)으로 고른다.
- 이슈키는 `.husky/prepare-commit-msg`와 동일한 방식으로 현재 브랜치명에서 추출한다: `S15P11A705-[0-9]+` 패턴을 찾는다(`git symbolic-ref --short HEAD` 결과에서 정규식으로 추출). 못 찾으면 스코프 없이 `type: 설명`으로 작성한다.
- `header-max-length: 100`(commitlint.config.js)을 넘지 않게 설명을 간결히 쓴다.
- 설명은 한국어로 쓴다.
- 변경사항에 여러 논리적 단위가 섞여 있어도 커밋을 쪼개지 않는다. 하나의 메시지로 요약해 지금 만들 커밋 하나만 생성한다(기존에 이미 존재하는 커밋은 건드리지 않는다).

## 2. 커밋 실행

- `git add -A && git commit -m "<위에서 만든 한 줄 메시지>"`
- 실패하면(예: pre-commit 훅 실패) 다음 단계로 넘어가지 않고 즉시 중단, 원인과 함께 보고한다.

## 3. Push

- `git push -u origin <현재 브랜치>`
- reject(원격이 앞서 있음) 시 강제 push를 시도하지 않는다. 즉시 중단하고 "원격이 앞서 있음 — 사용자 확인 필요"로 보고 후 종료한다.
- 그 외 실패도 다음 단계로 넘어가지 않고 즉시 중단·보고한다.

## 4. PR 생성

- `gh auth status`로 인증 여부를 확인한다.
- **미인증**: push까지는 완료된 상태다. PR 제목/본문 텍스트를(`.github/pull_request_template.md` 형식에 맞춰) 생성해 출력하고, "gh 미인증 — GitHub 웹에서 직접 PR 생성 필요"로 안내한다. 여기서 종료한다.
- **인증됨**: 아래 규칙으로 PR 제목/본문을 만든 뒤 `gh pr create --base dev --head <현재 브랜치> --title "..." --body "..."`를 실행한다.
  - 제목: `[<이슈키>] <설명>` (이슈키 없으면 자리표시자 표기)
  - 본문: `.github/pull_request_template.md`의 섹션 구조를 그대로 채운다(관련 이슈 / 작업 내용 / 변경 유형 / 확인 방법 / 체크리스트).
  - 체크리스트의 공개 범위 항목(Feed·타인 Shelf·Collection 상세에 Context 원문·신원 정보 미노출 등)은 실제 변경 내용에 비추어 충족 여부를 판단해 표시한다. 확신 없으면 미체크로 두고 이유를 적는다.
  - hotfix(대상이 `main`)라면 하단의 "main 반영 후 dev에도 반영했다" 항목을 포함한다.
  - PR 생성 실패 시 원인과 함께 즉시 보고한다.

## 5. 결과 보고

대화로 보고한다:

- 생성한 커밋 메시지
- push된 브랜치명
- PR URL(생성됐다면) 또는 fallback 안내(미인증 시)
- 확인이 필요한 사항(예: base 브랜치 존재 여부, gh 인증 여부, reject로 인한 중단 등)
