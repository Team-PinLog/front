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

## 재발 방지

- 인증 관련 문서·코드를 다룰 때는 `docs/api-contract.md`의 [확정] 인증 섹션과 `docs/architecture.md` 1-1절을 먼저 확인한다.
- 프론트 코드에 `accessToken`/`refreshToken` 저장 로직이나 `Authorization` 헤더 수동 주입, 프론트 자체 재발급 로직이 보이면 이 결정과 충돌하므로 즉시 확인한다.

## 관련 이슈키

(미정)
