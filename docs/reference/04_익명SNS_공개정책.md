# PinLog 익명 SNS 공개 정책

## 1. 익명 구조

- 실명, 소셜 계정을 공개하지 않습니다.
- 동일 User의 Collection은 하나의 Shelf로 연결됩니다.
- 다른 사용자는 Shelf와 그 안의 Collection을 조회할 수 있습니다.

## 2. 공개 범위

| 데이터 | 본인 | 다른 사용자 |
|---|---:|---:|
| Place | 공개 | 공개 Collection 안에서 공개 |
| Context 원문 | 공개 | 비공개 |
| PUBLIC Keyword | 공개 | 공개 Collection 안에서 공개 |
| PRIVATE_ONLY Keyword | 공개 | 비공개 |
| BLOCKED Keyword | 비공개 | 비공개 |
| Record 생성일 | 공개 | 공개 |
| Collection 제목·생성일 | 공개 | 공개 |
| 실명·소셜 계정 | 계정 설정에서 확인 | 비공개 |
| 팔로워·팔로잉 수 | 본인만 확인 | 비공개 |
| 팔로워·팔로잉 목록 | 미제공 | 미제공 |
| Follow 별칭 | 지정한 본인만 확인 | 비공개 |

Keyword는 사전 정의된 프리셋에서만 선택하며, 타인에게 공개되는 것은 비식별 표현으로 설계된 `PUBLIC` 프리셋뿐입니다. 사람 이름, 구체적인 회사·학교, 정확한 일정, 식별 가능한 사건은 공개 프리셋으로 만들지 않습니다. Keyword 등급의 정의와 계산 범위는 [AI 설계](05_AI_설계.md)를 따릅니다.

## 3. Collection 발행

- Collection은 생성 즉시 자동 발행됩니다.
- MVP에서는 발행 취소와 비공개 전환을 제공하지 않습니다.
- 제목과 Record 구성 수정은 별도 스냅샷 없이 공개본에 반영됩니다.
- 자동 발행과 공개 범위는 최초 가입 약관 동의 화면에서 안내합니다.

## 4. Shelf Follow

- Follow 대상은 Shelf입니다.
- 자신의 Shelf와 이미 Follow 중인 Shelf를 다시 Follow할 수 없습니다.
- Follow한 Shelf에 개인 별칭을 지정할 수 있습니다.
- 별칭은 최대 20자이며 본인에게만 보입니다.
- 같은 Shelf라도 팔로워마다 다른 별칭을 지정할 수 있습니다.

## 5. Feed

- 추천 단위는 Collection입니다.
- 공개 화면에서 다른 사용자의 Context 원문을 제공하지 않습니다.
- 소프트 삭제된 User, Shelf, Collection, Record, CollectionRecord는 제외합니다.
- 탈퇴한 User의 Collection은 Feed에서 즉시 제외합니다.
- 신고·차단은 MVP에 포함하지 않습니다.

## 6. 회원 탈퇴 영향

회원 탈퇴 시 해당 User의 Shelf와 관련 Follow를 소프트 삭제합니다.

- 팔로워의 Library에서 해당 Shelf와 Collection 제거
- Feed에서 해당 Collection 제거
- 신원과 개인 Context 비공개 원칙 유지
