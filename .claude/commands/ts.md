---
description: 방금 해결한 문제를 docs/troubleshooting/에 기록한다
---

방금 이 세션에서 해결한 문제를 `docs/troubleshooting/`에 기록한다.

추가 맥락(선택): $ARGUMENTS

## 진행

1. `docs/troubleshooting/README.md`의 파일명·섹션 규칙을 따른다.
2. 파일명은 `YYYY-MM-DD-slug.md`. 날짜는 오늘, `slug`는 증상을 요약한 영소문자-하이픈.
3. 아래 섹션으로 작성한다.

```markdown
# <제목>

- 날짜: YYYY-MM-DD
- 관련 이슈키: S15P11A705-<번호> (없으면 "없음")

## 증상
## 원인
## 해결
## 재발 방지
## 관련 이슈키
```

4. **추측은 "추정"으로 명시**하고 확인된 사실과 섞지 않는다. 에러 메시지·재현 조건은 원문 그대로 남긴다.
5. `docs/troubleshooting/README.md`의 인덱스에 한 줄을 추가한다: `- [제목](YYYY-MM-DD-slug.md) — 한 줄 요약`.
6. `docs/conventions.md`에 반영할 규칙이 생겼으면, 문서 하단에 **"→ conventions.md 반영 필요"**로 별도 표시한다(직접 수정은 사용자 확인 후).

커밋은 하지 않는다. 파일만 만들고 알린다.
