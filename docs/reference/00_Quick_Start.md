# PinLog Quick Start

## 1. 한 문장 소개

PinLog은 장소를 저장한 이유와 경험을 `Context`로 남기고, 나중에 자연어로 다시 찾거나 익명 `Collection`을 통해 새 장소를 발견하는 서비스입니다.

## 2. 핵심 구조

```text
User별 동일 Place의 활성 Record는 최대 1개
Record = Place + Context 1개 이상 + Keyword
Collection = Record 1개 이상
Shelf = 한 User가 발행한 Collection 목록
Library = 내 Shelf + 팔로우한 Shelf
Feed = 익명 Collection 추천 영역
```

## 3. 사용자가 하는 일

### 기록

```text
카카오맵에서 Place 검색
→ Place 선택
→ Context 작성
→ Record 저장
→ (비동기) 서비스가 Keyword 매핑 및 임베딩 생성
```

AI 분석은 저장이 끝난 뒤 비동기로 진행합니다. 분석 완료를 기다리지 않고 Record가 바로 보이며, 완료 전에는 Keyword가 비어 있을 수 있습니다.

### 검색

```text
자연어 질의 입력
→ 서비스가 내 Context를 의미 기준으로 검색
→ 관련 Record 목록 표시
→ 원하는 Record 확인
```

예: “비 오는 날 친구와 가려고 저장한 카페”

### 발견

```text
Feed에서 Collection 확인
→ Shelf 탐색 또는 팔로우
→ Place 선택
→ 내 Context 작성
→ 내 Record로 저장
```

다른 사용자의 Context 원문은 가져오거나 공개하지 않습니다.

## 4. 반드시 알아야 할 정책

- Context 없는 Record와 Record 없는 Collection은 허용하지 않습니다.
- Collection은 생성 즉시 자동 발행되며 MVP에서는 비공개 전환이 없습니다.
- 다른 사용자에게 실명, 소셜 계정 등 사용자 신원 정보와 Context 원문을 공개하지 않습니다.
- 사용자 소유 데이터는 소프트 삭제하며 사용자 복구 기능은 제공하지 않습니다.
- Record 수정은 기존 행 수정이 아니라 기존 Record 소프트 삭제 후 새 Record 생성 방식입니다.
- Context도 같은 방식입니다. Context는 불변이며, 본문을 고치면 기존 Context를 삭제하고 새 Context를 만듭니다. 이때 식별자가 바뀝니다.
- AI 분석은 저장 이후 비동기로 처리하며, 분석 완료는 저장이나 발행의 조건이 아닙니다.

세부 정책은 [정책 정의서](02_정책_정의서.md), AI 설계는 [AI 설계](05_AI_설계.md), 구현 제약은 [데이터 모델 및 무결성](06_데이터모델_및_무결성.md)을 기준으로 확인합니다.
