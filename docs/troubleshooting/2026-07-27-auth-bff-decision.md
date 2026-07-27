# 인증 방식 BFF 전환 결정

- 날짜: 2026-07-27
- 관련 이슈키: (미정)

## 증상 (배경)

기존 `docs/api-contract.md`는 인증을 JWT(Access 30분 / Refresh 7일, Redis 저장·회전 발급) 기반으로 기술하고, 프론트가 `Authorization: Bearer {accessToken}` 헤더를 직접 주입하며 `POST /auth/refresh`로 재발급하는 흐름을 전제로 했다. `refreshToken` 저장 위치(localStorage vs HttpOnly 쿠키)는 [협의 필요]로 미정 상태였다.

백엔드·인프라 파트 회신에서 **BFF(Backend for Frontend) 채택**이 확정되면서 이 전제가 바뀌었다.

## 결정

- 프론트는 `accessToken`/`refreshToken`을 **저장하지 않는다.**
- 토큰 관리·갱신(회전 발급 포함)은 **서버(BFF)가 전담**한다.
- 프론트는 **401 수신 시 재로그인만 유도**한다. 프론트 쪽 재발급 로직은 작성하지 않는다.
- Axios는 **`withCredentials: true`**를 전제로 쿠키 기반 인증을 사용한다. `Authorization` 헤더를 프론트가 직접 주입하지 않는다.
- 쿠키명, 만료·로그아웃 처리 등 세부 계약은 아직 [협의 필요](`docs/api-contract.md`)이며, 백엔드 문서화를 대기한다.

## 영향

- `docs/api-contract.md`: 공통 인증 섹션을 JWT/Bearer 전제에서 BFF/쿠키 전제로 교체.
- `docs/architecture.md`: HTTP Client 설명에서 `Authorization` 헤더 주입을 제거하고, 별도 "1-1. 인증 (BFF)" 절 추가. Axios 인터셉터가 Bearer 토큰을 주입하지 않고 401 시 재로그인으로만 유도하도록 명시.
- `AGENTS.md`: 절대 금지 항목에 "프론트에 토큰 저장·재발급 로직 작성 금지(BFF 담당)" 추가.
- 소셜 로그인 콜백 토큰 수신 방식(구 [협의 필요] 항목)도 "별도 POST로 토큰 교환" 방식으로 함께 확정됨. 단, 엔드포인트 세부는 여전히 [협의 필요]로 남아 있다(**추정**: BFF 도입과 같은 결정 배경에서 나온 것으로 보이나, 두 결정의 인과관계는 문서상 명시되어 있지 않다).
  - ※ 이 "토큰 교환" 전제는 이후 폐기됨. 소셜 로그인은 302 리다이렉트 방식으로 변경됨(`08_API_명세` §3.2, `api-contract.md` 참조). 이 파일 상단 "후속 정정" 절 참고.

## 후속 정정 (2026-07-27, 같은 날 재확인)

위 "결정" 절은 BFF 도입 초기 판단 시점, 즉 세부 계약이 [협의 필요]로 비어 있던 시점의 내용이다. 이후 백엔드가 인증 설계를 문서화(`docs/reference/11_인증_설계.md`, `docs/reference/08_API_명세.md`)하면서 세부가 갈렸다.

- **바뀌지 않은 것**: 프론트는 `accessToken`/`refreshToken`을 저장하지 않는다. 서버가 `HttpOnly`+`Secure`+`SameSite=Lax` 쿠키로 관리한다. `Authorization` 헤더를 프론트가 직접 구성하지 않는다.
- **뒤집힌 것**: "401 시 재로그인만 유도, 프론트 재발급 로직 없음"은 틀렸다. **프론트가 `POST /auth/refresh`를 직접 호출해 재발급한다**(본문 없음, Refresh 쿠키로 동작). 회전 발급이라 **single-flight 필수** — 동시에 여러 요청이 401을 받아도 재발급은 한 번만 호출하고 나머지는 그 결과를 기다린다. 재발급 자체의 401은 재시도하지 않고 즉시 재로그인으로 유도한다.
- **추가로 확정된 것**: CSRF(`XSRF-TOKEN` 쿠키 → `X-XSRF-TOKEN` 헤더, `GET` 제외), 로그인 상태 확인용 `logged_in` 비-`HttpOnly` 쿠키(UI 힌트 전용, 인가 판단 금지).
- **위 "영향" 절의 오기(誤記)**: "소셜 로그인은 별도 POST로 토큰 교환 방식으로 확정"도 이후 폐기됐다. 소셜 로그인은 **302 리다이렉트 방식**이다(`08_API_명세` §3.2) — 클라이언트가 code나 토큰을 직접 다루는 지점이 없다.

**결론**: "토큰을 프론트가 보관하지 않는다"와 "프론트가 재발급을 호출하지 않는다"는 서로 다른 얘기였다. BFF가 요청 처리 도중 자기 토큰을 자동 갱신해주는 구조가 아니라, 클라이언트가 401을 받으면 명시적으로 재발급 엔드포인트를 호출해야 하는 구조다. 최신 근거: `docs/reference/11_인증_설계.md` 4.4, `docs/api-contract.md` 401 처리 항목.

`AGENTS.md` 절대 금지 6번과 `docs/architecture.md` 1-1절도 이 정정에 맞춰 갱신했다.

## 재발 방지

- 인증 관련 문서·코드를 다룰 때는 `docs/api-contract.md`의 [확정] 인증 섹션과 `docs/architecture.md` 1-1절을 먼저 확인한다.
- 프론트 코드에 `accessToken`/`refreshToken` 저장 로직이나 `Authorization` 헤더 수동 주입이 보이면 이 결정과 충돌하므로 즉시 확인한다. **단, `POST /auth/refresh` 호출과 single-flight 재발급 로직은 정상이며 금지 대상이 아니다** — 위 "후속 정정" 참고.

## 관련 이슈키

(미정)
