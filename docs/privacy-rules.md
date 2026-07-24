# 공개 범위 규칙

근거: `docs/reference/04_익명SNS_공개정책.md`, `docs/reference/06_데이터모델_및_무결성.md`(5장 공개 범위), `docs/reference/08_API_명세.md`(7·12·14장).

PinLog은 익명 SNS다. 타인에게는 발행된 Collection과 공개 가능한 정보만 보인다. 아래는 프론트가 지켜야 할 최소 규칙이며, 위반은 즉시 개인정보·신원 노출 사고다.

## 1. Context 원문은 타인에게 노출하지 않는다

- 타인 조회 응답에서 Record의 `contexts`는 **항상 `null`**이다(`08_API_명세` 14.1, DTO `RecordDetail.contexts: ContextDetail[] | null`).
- 공개 진입 경로는 **Feed / 타인 Shelf / Collection 상세** 셋뿐이다. 이 화면에서 Context 원문을 렌더링하지 않는다.
- `ownedByMe`(Collection 상세) 또는 `contexts === null` 여부로 소유자/타인을 구분한다. 타인이면 원문 영역 자체를 그리지 않는다.

## 2. `member.id`(내부 사용자 ID)를 쓰지 않는다

- 내부 사용자 ID는 순차값이라 노출 시 사용자 열거·가입 순번 추론이 가능하다. **URL·요청·응답 어디에도 쓰지 않는다.**
- 예외: 로그인·가입 확정 응답의 본인 `memberId`만 수신한다(타인 식별에 쓰지 않는다).
- 타인 접근의 **진입점은 Collection id**다. 팔로우·책장 탐색은 Collection id로 시작한다.
  - `POST /follows { collectionId }`, `GET /feed/collections/{collectionId}/shelf`, `GET /follows/{followId}/collections`

## 3. Keyword는 `label`만, `code`는 노출하지 않는다

- 모든 Keyword 응답은 `keyword_preset`의 `label` 문자열 배열이다. `code`는 내부 식별용이며 노출·전송하지 않는다(`08_API_명세` 6.1).
- Keyword는 사전 정의 프리셋에서만 온다. 프론트가 임의 Keyword를 만들거나 편집하지 않는다.

## 4. Keyword 공개 등급 (참조: `03_공식_용어사전.md`, `04_익명SNS_공개정책.md`)

| 등급 | 본인 | 타인 |
|---|---|---|
| `PUBLIC` | 제공 | 제공(공개 Collection 안에서) |
| `PRIVATE_ONLY` | 제공 | 비공개(서버가 필터) |
| `BLOCKED` | 비공개 | 비공개 |

- 타인 화면에는 서버가 `PUBLIC`만 내려준다. 프론트가 등급으로 필터링을 재구현하지 않는다(서버 계약을 신뢰하되, 타인 화면에 등급 원본을 노출하지 않는다).
- 본인 화면에서 `PRIVATE_ONLY`를 **시각적으로 구분 표시할지는 제품 미결정**이다(`05-1_파트간_요구사항` 1.4). `docs/api-contract.md`의 "협의 필요"를 확인하고, 확정 전까지 구분 UI를 임의로 만들지 않는다.

## 5. 공개 조회에서 금지되는 정보 (`08_API_명세` 7.3)

Context 원문, 사용자 내부 ID, 실명, 닉네임, 소셜 계정, 팔로워·팔로잉 목록, 다른 팔로워가 설정한 별칭.

- Follow 별칭(`alias`)은 지정한 본인에게만 보인다. 타인 화면에 노출하지 않는다.

## 6. 예시

### 잘못된 예 — 타인 Collection에서 Context 원문 렌더

```tsx
// ❌ 타인 응답의 contexts는 null이다. 아래는 런타임 크래시이자 노출 시도다.
function RecordCard({ record }: { record: RecordDetail }) {
  return <p>{record.contexts[0].body}</p>;
}
```

### 올바른 예 — 소유 여부로 분기

```tsx
// ✅ 타인이면 원문 영역을 그리지 않고 공개 정보(Place, Keyword, 생성일)만 표시
function RecordCard({ record }: { record: RecordDetail }) {
  const isOwner = record.contexts !== null;
  return (
    <article>
      <PlaceInfo place={record.place} />
      <KeywordList labels={record.keywords} />       {/* label 문자열만 */}
      {isOwner && <ContextList contexts={record.contexts!} />}
    </article>
  );
}
```

### 잘못된 예 — 내부 ID를 URL에 사용

```ts
// ❌ member.id를 경로에 노출
navigate(`/shelf/${authorMemberId}`);
```

### 올바른 예 — Collection id를 진입점으로

```ts
// ✅ 발행된 Collection id로 책장/팔로우 진입
navigate(`/collections/${collectionId}`);
followMutation.mutate({ collectionId });
```

### 잘못된 예 — Keyword code 전송·노출

```ts
// ❌ code는 내부 식별용. 응답에 없고, 있어도 노출하지 않는다.
sendEvent({ keywordCode: kw.code });
```

### 올바른 예 — label만 사용

```tsx
// ✅ 화면·전송 모두 label 문자열만 사용
{record.keywords.map((label) => <Chip key={label}>{label}</Chip>)}
```
