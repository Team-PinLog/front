# 백그라운드 폴링이 화면을 옮기면 취소된다 — 구독자 수명과 Provider 위치

- 날짜: 2026-08-06
- 관련 이슈키: S15P11A705-326

## 증상

표지 인쇄본은 GPU 잡이라 완성에 몇 분이 걸릴 수 있다. 이것을 모달 안에서 폴링하면 두 가지가 동시에 걸린다.

- 컬렉션은 이미 만들어졌는데도 사용자가 모달에 계속 붙잡혀 있다.
- 모달을 닫거나 다른 화면으로 이동하면 **저장이 조용히 취소된다.** 에러도 로그도 남지 않고, 나중에 보면 표지만 없다.

## 원인

**TanStack Query는 구독자가 사라지면 폴링을 멈춘다.** `refetchInterval`은 해당 쿼리를 구독하는 컴포넌트가 마운트돼 있는 동안만 돈다. 폴링을 시작한 컴포넌트가 언마운트되면 그 시점에 진행 중이던 잡의 완료를 아무도 기다리지 않게 되고, 완성된 결과를 저장하는 후속 처리도 함께 사라진다.

즉 문제는 **상태 공유가 아니라 수명**이다. 진행 중인 잡 목록을 화면이 읽을 일은 없다 — 필요한 것은 폴링의 구독자를 모달보다 오래 사는 곳에 두는 것뿐이다.

### 그런데 "오래 사는 곳"이 AppLayout이면 부족하다

Provider를 라우터 안(특히 `AppLayout` 안)에 두면 여전히 취소된다. 이 레포의 `RootLayout`은 **제외 목록 방식**으로 특정 경로에서 `AppLayout`을 통째로 걷어내기 때문이다.

```ts
// src/app/RootLayout.tsx
const ROUTES_WITHOUT_APP_LAYOUT = [
  '/login',
  '/auth/callback',
  '/collections/',
  '/terms',
  '/privacy',
];
```

`shouldSkipAppLayout(pathname)`이 참이면 `<AppLayout />` 대신 `<Outlet />`을 렌더한다. 즉 `/collections/...`로 이동하는 순간 `AppLayout` 서브트리가 통째로 빠진다. 그런데 **표지 저장 직후 컬렉션 상세로 들어가는 것은 아주 흔한 동선이다.** 하필 가장 흔한 경로에서 저장이 취소된다.

(제외 목록 방식을 쓰는 이유 자체는 별개다 — pathless layout route가 TanStack Router GitHub Issue #2130에 걸려 `rootRoute`의 `component`에서 직접 분기한다. `RootLayout.tsx` 주석 참고.)

## 해결

`CoverJobProvider`를 **`QueryProvider` 안쪽, `RouterProvider` 바깥**에 뒀다.

```tsx
// src/main.tsx
<QueryProvider>
  <CoverJobProvider>
    <RouterProvider router={router} />
  </CoverJobProvider>
</QueryProvider>
```

- **안쪽인 이유**: 폴링·저장이 TanStack Query를 쓴다.
- **바깥인 이유**: 어떤 화면 전환으로도 트리에서 빠지지 않아야 한다. 라우터 안에 두면 위의 제외 경로에서 빠진다.

Provider가 하는 일은 잡 목록 관리뿐이고, 폴링·저장은 잡마다 마운트되는 `CoverFinalizationRunner`가 각자 한다. 러너는 끝나면(저장 완료·잡 실패·상한 5분 초과) 스스로 물러나 목록이 저절로 빈다. Context 값이 `enqueue` 하나뿐인 것이 이 설계를 그대로 드러낸다 — 읽을 상태가 없다.

`enqueue`는 같은 `coverRequestId`를 무시한다. 두 번 맡기면 러너가 둘이 되어 같은 URL을 두 번 저장한다.

## 재발 방지

- **"화면을 떠나도 계속돼야 하는 작업"은 그 작업을 시작한 화면에 폴링 구독자를 두지 않는다.** TanStack Query의 `refetchInterval`은 구독자가 사라지면 멈춘다. 백그라운드로 돌려야 하는 일은 구독자를 라우터 바깥 Provider로 올린다.
- **Provider를 어디에 둘지는 "무엇을 공유하는가"가 아니라 "얼마나 오래 살아야 하는가"로 정한다.** 이 경우 공유할 상태는 사실상 없고 수명만이 이유였다.
- **`AppLayout` 안은 "앱 전역"이 아니다.** `ROUTES_WITHOUT_APP_LAYOUT`에 걸리는 경로로 이동하면 그 서브트리는 사라진다. 전역 수명이 필요하면 `main.tsx`다. 이 목록에 경로를 추가할 때는 그 안에 수명을 의존하는 Provider가 없는지 함께 본다.
- **조용히 취소되는 실패는 로그가 남지 않는다.** 이런 종류는 "에러를 찾는" 방식으로는 못 찾는다. 결과물이 없는데 아무 흔적도 없으면 구독자 수명을 먼저 의심한다.

**표지 없는 컬렉션은 정상 상태다**(`docs/api-contract.md`). 그래서 러너는 실패해도 화면에 알리지 않는다 — 이 조용함은 의도된 것이고, 위의 "조용히 취소"와는 다른 이야기다.

## 관련 이슈키

- S15P11A705-326 (PR #125) — 이 문서
- S15P11A705-318 — 표지 선택 모달(`CollectionCoverModal`), "나중에 하기"를 두지 않기로 한 결정
- S15P11A705-327 (PR #131) — 장소 추가로 만든 새 컬렉션도 표지 선택을 거치게 함

---

이 문서는 326 작업 당시 남긴 코드 주석(`CoverJobContext.ts`, `main.tsx`)과 실제 배치를 근거로 정리했다. 재현 로그를 새로 채집한 것은 아니다.
