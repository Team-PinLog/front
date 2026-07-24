# PinLog MVP 기능 범위

## 1. 포함 기능

### 계정

- Google, Kakao, Naver 소셜 로그인
- 최초 로그인 시 User 생성과 필수 약관 동의
- 로그아웃, 회원 탈퇴
- User와 SocialAccount 분리 저장

### Place

- 카카오맵 Place 검색·선택·기본 정보 조회
- 지도 마커 표시
- 카카오 Place 식별자 기준 중복 처리
- Record 생성 시점의 내부 Place 저장

### Record와 Context

- User당 Place별 활성 Record 최대 1개
- 첫 Context 필수
- Record 조회·재생성 방식 수정·소프트 삭제
- Context 복수 생성·조회·수정·삭제
- 마지막 Context 삭제 시 Record 삭제 확인
- 삭제한 Place 재저장 시 새 Record 생성
- Record 재생성 시 Collection 연결 승계

### Keyword와 AI 자연어 검색

세부 설계는 [AI 설계](05_AI_설계.md)를 따릅니다.

- Spring과 FastAPI 분리
- Context 단위 비동기 AI 처리
- Context 단위 Embedding 생성
- AI 프리셋 Keyword 매핑과 LLM 판정
- Keyword 공개 등급(`PUBLIC` / `PRIVATE_ONLY` / `BLOCKED`)
- Context 불변 모델(수정 = 삭제 + 생성)
- AI State 기반 삭제·수정 경합 방어
- 부분 재개와 Spring 재스캔
- 본인 Context 기반 정확 벡터 검색
- Record 단위 중복 제거와 결과 반환
- 검색 결과 없음 처리
- AI 미완료·실패 시 Keyword만 생략

### Collection

- Record 1개 이상으로 생성
- 제목 필수, 최대 20자
- 생성 즉시 자동 발행
- 제목 수정, Record 추가·제거, 소프트 삭제
- 마지막 Record 제거 시 Collection 삭제 확인
- Record 생성 시각 오름차순 정렬

### Shelf, Library, Follow

- User당 Shelf 1개
- 내 Shelf와 팔로우한 Shelf 조회
- Shelf Follow·해제
- 최대 20자 개인 별칭
- 팔로워·팔로잉 수 본인 조회
- 탈퇴 Shelf를 팔로워 Library에서 제거

### Feed와 공개

- Spring 규칙 기반 발행 Collection 추천·상세 조회
- Redis 기반 Feed Cache와 노출·클릭·저장 이벤트 수집
- 같은 Shelf의 다른 Collection 조회
- Feed에서 Shelf Follow
- Place 선택 후 내 Record 생성 또는 Context 추가
- 탈퇴 및 소프트 삭제 데이터 제외
- Context 원문과 신원 정보 비공개

## 2. MVP 제외

- 자체 아이디·비밀번호 로그인
- 비밀번호 찾기·변경
- Collection 비공개 전환과 발행 취소
- Collection 설명
- 사용자 Keyword 생성·수정·삭제
- 검색 결과 선택 이유
- User·Collection 직접 검색
- 신고·차단
- 개별 Record 추천 Feed
- AI Collection 자동 생성·분류
- 자연어 기반 생성·수정·삭제
- 주차 정보
- 인스타그램 URL 자동 등록
- 카카오톡 대화 분석
- 사진 메타데이터 기반 자동 Place 등록
- 그룹 Library

### AI 기술 범위 제외

- 메시지 큐(Kafka, RabbitMQ)와 별도 Outbox
- ANN 인덱스(HNSW, IVFFlat)
- RAG, GraphRAG
- 자유 생성 공개 Keyword
- 검색어 LLM 분해
- 학습형 Feed Ranking과 Multi-Armed Bandit
- 자동 Collection Keyword 물리 집계
