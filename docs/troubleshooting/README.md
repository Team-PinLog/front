# troubleshooting

해결한 문제를 기록해 재발을 막고, 유사 오류를 만났을 때 먼저 참고하는 공간이다.
새 문제를 겪고 해결하면 여기에 문서를 추가한다(`/ts` 커맨드 사용).

## 파일명 규칙

- `YYYY-MM-DD-slug.md` (예: `2026-07-24-axios-401-refresh-loop.md`)
- `slug`는 영소문자·하이픈. 증상을 짧게 요약한다.

## 각 문서 섹션

```markdown
# <제목>

- 날짜: YYYY-MM-DD
- 관련 이슈키: S15P11A705-<번호>

## 증상

## 원인

## 해결

## 재발 방지

## 관련 이슈키
```

## 작성 규칙

- **추측은 "추정"으로 명시**하고 확인된 사실과 섞지 않는다.
- 재현 조건·에러 메시지·스택을 가능한 한 원문 그대로 남긴다.
- `docs/conventions.md`에 반영할 규칙이 생겼으면 문서에 그 사실을 표시한다.

## 인덱스

<!-- 새 문서를 추가하면 아래에 한 줄로 추가한다: - [제목](YYYY-MM-DD-slug.md) — 한 줄 요약 -->

- [인증 방식 BFF 전환 결정](2026-07-27-auth-bff-decision.md) — 인증이 JWT/Bearer 전제에서 BFF/쿠키 전제로 바뀐 배경과 문서 영향
- [카카오 장소 검색·지도 — 프론트 직접 호출로 확정](2026-07-27-kakao-search-direct-call.md) — api-contract.md의 "BFF 경유" 서술과 원본 명세의 모순을 프론트 직접 호출로 정정
- [운영 백엔드 /dev/auth/login 노출 여부 확인](2026-08-06-dev-auth-login-prod-check.md) — 실측 결과 운영에서 인증 없이 세션을 내주는 경로로 동작하지 않음을 확인
- [화면을 다녀오면 지도 마커가 다시 그려지지 않는다](2026-08-06-map-remount-ref-state-race.md) — 같은 사실을 ref와 state가 나눠 들어 재마운트 시 effect가 재실행되지 않던 문제
- [백그라운드 폴링이 화면을 옮기면 취소된다](2026-08-06-background-polling-provider-lifetime.md) — 구독자 수명 문제와 Provider를 라우터 바깥(main.tsx)에 둬야 하는 이유
- [OAuth 왕복을 건너 사실을 전달한다](2026-08-06-sessionstorage-across-oauth-roundtrip.md) — sessionStorage 패턴과 표시가 살아남아 거짓을 말하는 함정 셋
- [`overflow-y-auto`가 가로도 클리핑한다](2026-08-06-overflow-y-auto-clips-horizontally.md) — 선반 판 그림자가 좌우에서 잘리던 원인
- [책장 열 헤더 행 높이가 행 수·선반 위치를 좌우한다](2026-08-06-shelf-column-header-height-coupling.md) — 헤더 높이가 바뀌면 열마다 스크롤 박스 남는 높이가 달라진다
- [컬렉션 펼친 화면 재설계에서 반복된 함정들](2026-08-06-collection-spread-redesign-lessons.md) — 레인 시야가 좁혀 만든 중복 구현·죽은 소비자, Tailwind 동적 클래스·지도 마커·레이아웃 증폭 함정
- [조용히 잘못되는 CSS 셋](2026-08-06-silent-css-traps-nav-shell.md) — viewport-fit 없으면 safe-area가 0, :focus-within이 클릭 후 안 풀림, Tailwind가 주석을 스캔
- [git worktree로 세션을 나눠 병렬 작업하기](2026-08-06-parallel-worktree-sessions.md) — 레인 분할 기준과 세팅 단계에서 조용히 잘못되는 함정 6개
- [Home 컨텐츠 레이어가 지도·지역 클릭을 통째로 삼켰다](2026-08-07-content-layer-swallows-map-clicks.md) — 투명 z-10 사각형의 히트 박스 + 5.7×3.1px 클릭 타깃, pointer-events 재구성과 22px 클릭 원으로 해소
- [스택 브랜치가 부모 squash 머지 후 CONFLICTING이 된다](2026-08-07-squash-merge-stacked-branch-rebase.md) — `git rebase --onto origin/dev <머지된 마지막 커밋>`으로 범위를 제외하면 충돌 0건
- ["무료 폰트"여도 서브셋·WOFF2 변환이 라이선스 위반일 수 있다](2026-08-07-free-font-license-blocks-subset-pipeline.md) — 교보·온글잎 반입 불가 판정 경위와 폰트 라이선스 3단계 검증 절차
- [병렬 dev 서버(5174·5175)에서 카카오맵이 안 뜬다](2026-08-07-kakao-sdk-401-on-parallel-dev-ports.md) — 카카오 콘솔에 5173만 등록돼 SDK 401, 코드 회귀로 오인 주의
