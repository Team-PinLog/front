# 화면을 다녀오면 지도 마커가 다시 그려지지 않는다 — ref와 state의 이중 관리

- 날짜: 2026-08-06
- 관련 이슈키: Jira 작업

## 증상

배포 환경 QA에서 확인됐다. 홈 → 탐색 → 홈, 홈 → 나의 책장 → 홈으로 돌아오면 지도에 마커가 하나도 그려지지 않는다. 지도 타일과 줌·"내 주변" 버튼은 정상이고 마커만 없다. 에러 메시지는 없다 — 콘솔에 아무것도 남지 않는다.

**최초 진입은 멀쩡하다.** 새로고침하면 다시 정상으로 돌아오고, 그 뒤 다른 화면을 한 번 다녀오면 재현된다.

## 원인

`RecordMapView`에서 **"지도가 준비됐다"는 하나의 사실을 `sdkStatus`(state)와 `mapRef`(ref) 두 곳이 나눠 들고 있었다.** 둘은 갱신 시점이 달라 어긋날 수 있는 구조였고, 재마운트에서 실제로 어긋났다.

재마운트 시 순서는 이렇다.

1. SDK는 module-level 싱글턴(`loadKakaoMaps()`)이라 이미 로드돼 있다. 그래서 `sdkStatus`의 `useState` 초기화 함수(`isKakaoMapsSdkReady()`)가 처음부터 `'ready'`를 돌려준다. 이 초기화는 307에서 재마운트 시 컨트롤 버튼이 깜빡이는 것을 없애려고 넣은 것이다.
2. 그런데 `mapRef`는 새 컴포넌트 인스턴스의 새 ref라 `null`이다.
3. 마커 effect가 `sdkStatus !== 'ready' || !map` 가드에서 **early return**한다. `sdkStatus`는 통과하지만 `map`이 없다.
4. 비동기 지도 생성이 끝나 `mapRef.current`를 채우고 `setSdkStatus('ready')`를 부른다. **그런데 값이 이미 `'ready'`라 리렌더가 일어나지 않는다.**
5. `data`는 TanStack Query 캐시에서 즉시 오므로 재요청도, 참조 변경도 없다. 마커 effect의 deps 중 바뀌는 값이 하나도 없어 **다시 돌 기회 자체가 사라진다.**

핵심은 4번이다. ref에 값을 채우는 것은 리렌더를 일으키지 않고, 리렌더를 일으킬 유일한 수단인 `setSdkStatus`는 같은 값이라 무시된다. 최초 진입만 멀쩡한 이유는 그때는 `sdkStatus`가 실제로 `'loading'` → `'ready'`로 **바뀌기** 때문이다.

## 해결

지도 인스턴스를 `useState<KakaoMap | null>`로 승격했다. 인스턴스가 생기는 것이 곧 리렌더가 되어, 마커·`focusRecordId` 이동·리스너 effect가 `map`을 deps로 두고 자연히 다시 돈다. 줌·"내 주변"·"전체 보기" 핸들러도 같은 state를 본다.

**StrictMode 이중 생성 가드만은 ref로 남겼다**(`createdMapRef`). dev의 setup → cleanup → setup 사이에는 렌더가 끼지 않아, 첫 `.then()`의 `setMap()`이 반영되기 전에 두 번째 `.then()`이 실행된다. 여기서 state를 읽으면 여전히 `null`이라 중복 생성을 막지 못한다 — 같은 컨테이너에 Map이 둘 생기면 리스너가 겹친다(307에서 실제로 겪은 문제). 이 ref는 "이미 만들었다"는 생성 래치일 뿐이고 지도를 다루는 쪽에서는 어디서도 읽지 않는다. 읽는 순간 다시 두 개의 진실이 된다.

`sdkStatus`는 남겼다. "SDK 스크립트가 로드됐다"는 "인스턴스가 준비됐다"와 다른 사실이고, 307이 없애려던 깜빡임은 전자로 UI를 게이팅해야 막힌다. 다만 이제 오버레이 문구·컨트롤 표시에만 쓰이고 **지도 조작 경로에서는 전부 빠졌다.**

### 곁다리로 걸린 lint 규칙

`map`을 state로 바꾸자 마커 effect 안의 `setOffscreenRecordCount` 호출이 `react-hooks/set-state-in-effect`에 걸렸다(변경 전에는 걸리지 않았다).

```
Error: Calling setState synchronously within an effect can trigger cascading renders
```

최초 `fitBounds`를 별도 effect로 분리해 해소했다. 마커를 그리는 일(외부 시스템 동기화)과 그 결과를 배지 상태로 되돌리는 일은 원래 다른 관심사라 분리 자체가 타당했다. 분리하면서 `hasFitInitialBoundsRef`를 세우는 시점 의미는 그대로 뒀다 — `bounds`가 `null`(저장된 기록 없음)이어도 가드를 세운다. 세우지 않으면 첫 기록 저장 후 재조회 시점에 `fitBounds`가 뒤늦게 걸려 325의 `focusRecordId` `panTo`와 카메라를 두고 다툰다.

## 재발 방지

- **외부 SDK 인스턴스처럼 "생겼다"는 사실이 렌더를 좌우하는 값은 ref가 아니라 state로 든다.** ref에 담으면 그 사실이 리렌더를 일으키지 못해, 그 값을 기다리던 effect가 다시 돌 기회를 잃는다. ref는 리렌더가 필요 없는 값(생성 래치, 정리 대상 목록)에만 쓴다.
- **같은 사실을 두 변수가 나눠 들지 않는다.** 이번 버그는 `sdkStatus`와 `mapRef`가 각자 "준비됨"의 일부를 들고 있어 생겼다. 나눠야 한다면 서로 다른 사실이어야 하고(여기서는 "스크립트 로드" vs "인스턴스 생성"), 각각이 무엇을 게이팅하는지 주석으로 못박는다.
- **"초기값이 곧바로 최종값"인 state는 전이가 없다.** `useState(() => 이미조건이면최종값)` 패턴은 깜빡임을 없애는 대신 그 state를 트리거로 쓰던 effect를 침묵시킨다. 초기화 함수로 값을 앞당길 때는 그 state에 의존하는 effect가 무엇인지 함께 확인한다.
- **재마운트 경로를 반드시 밟아본다.** 이 버그는 최초 진입만으로는 절대 드러나지 않고, 화면을 한 번 다녀와야 나타난다. 지도·에디터·차트처럼 명령형 인스턴스를 들고 있는 컴포넌트를 고쳤으면 다른 화면을 다녀오는 왕복을 검증 절차에 넣는다.

**같은 경합이 `CollectionSpreadMap`에는 없다**(확인함). 그쪽은 `status` 초기값이 항상 `'loading'`이라 재마운트 때도 `'loading'` → `'ready'` 전이가 실제로 일어나고 마커 effect가 다시 돈다. 다만 인스턴스를 ref로 드는 구조는 같으므로, 그 초기값을 앞당기는 변경을 하면 같은 버그가 생긴다.

**검증 한계**: 이 레포는 `@testing-library/*`가 없어 렌더 수명주기를 자동으로 검증할 수 없다. 원인은 코드로 확인했고 `typecheck`·`lint`·`test`는 통과했지만, **수정 결과의 최종 확인은 육안뿐이다** — 홈 → 탐색 → 홈, 홈 → 책장 → 홈을 여러 번 왕복해 매번 마커가 그려지는지, 그 과정에서 307이 없앤 버튼 깜빡임이 재발하지 않는지 본다.

## 관련 이슈키

- Jira 작업 (GitHub front#128) — 이 문서
- Jira 작업 — SDK 재로드 깜빡임 제거(`isKakaoMapsSdkReady` 초기화), StrictMode 이중 Map 생성 가드, `isolate` stacking context
- Jira 작업 — 가시 영역 보정(`topObstructionPx`, `readInsets`, 저장 후 `focusRecordId` `panTo`)

---

**→ conventions.md 반영 필요**(직접 수정은 사용자 확인 후)

- "외부 라이브러리 인스턴스가 준비됐다는 사실이 렌더에 영향을 준다면 ref가 아니라 state로 든다. ref는 리렌더가 불필요한 값에만 쓴다."
- "하나의 사실을 두 변수가 나눠 들지 않는다."
