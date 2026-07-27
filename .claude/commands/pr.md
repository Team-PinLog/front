---
description: .github/pull_request_template.md 형식에 맞춰 PR 본문 초안을 작성한다
---

현재 브랜치의 변경으로 PR 본문 초안을 작성한다. 커밋·PR 생성은 하지 않고 **본문 텍스트만** 출력한다.

추가 맥락(선택): $ARGUMENTS

## 진행

1. 현재 브랜치 이름과 변경 내역을 확인한다.
   - `git rev-parse --abbrev-ref HEAD`
   - `git log dev..HEAD --oneline` (대상 브랜치는 보통 `dev`)
   - `git diff --stat dev...HEAD`
2. **브랜치 이름에서 이슈키를 추출**한다. `feature/S15P11A705-42-...` → `S15P11A705-42`. 추출 실패 시 자리표시자로 두고 표시한다.
3. `.github/pull_request_template.md`의 섹션 구조를 그대로 채운다.
   - 관련 이슈: 추출한 이슈키
   - 작업 내용 / 변경 유형 / 확인 방법 / 체크리스트
4. 체크리스트의 공개 범위 항목(Feed·타인 Shelf·Collection 상세에 Context 원문·신원 정보 미노출)은 변경 내용에 비추어 충족 여부를 실제로 판단해 표시한다. 확신 없으면 미체크로 두고 이유를 적는다.
5. hotfix라면(대상이 `main`) 하단의 "main 반영 후 dev에도 반영했다" 항목을 포함한다.

## 출력

PR 제목: `[<이슈키>] <설명>` 한 줄과, 템플릿 형식을 채운 본문을 코드블록으로 출력한다.
