## 관련 이슈

<!-- 예: S15P11A705-42 -->

## 작업 내용

<!-- 무엇을 왜 했는지 간결하게 -->

## 변경 유형

- [ ] feat (기능)
- [ ] fix (버그)
- [ ] refactor / chore / docs / style / test

## 확인 방법

<!-- 리뷰어가 검증할 방법: 화면 경로, 재현 절차 등 -->

## 체크리스트

- [ ] 공개 화면(Feed, 타인 Shelf, Collection 상세)에 Context 원문·신원 정보를 노출하지 않았다
- [ ] `member.id`(내부 사용자 ID)를 URL·요청·응답에 사용하지 않았다 (진입점은 Collection id)
- [ ] Keyword는 `label`만 사용하고 `code`를 노출하지 않았다
- [ ] Context 수정 후 새 `contextId`로 쿼리 키·URL·선택 상태를 교체했다
- [ ] `keywords: []` 등 빈 결과를 오류로 처리하지 않았고 로딩·오류·401 상태를 처리했다
- [ ] `docs/conventions.md`(용어·`any`·컴포넌트 직접 API 호출 금지)를 지켰다

---

<!-- hotfix인 경우에만 체크 -->
- [ ] (hotfix) main 반영 후 dev에도 반영했다
