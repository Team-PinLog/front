# 병렬 dev 서버(5174·5175)에서 카카오맵이 안 뜬다 — SDK 401

- 날짜: 2026-08-07
- 관련 이슈키: 없음 (병렬 worktree 운영 이슈)

## 증상

worktree 3개(L1·L2·L3)의 dev 서버를 동시에 띄우면 Vite가 5173·5174·5175로 포트를 나눠 잡는데, **5174·5175로 열린 화면에서 "카카오 지도를 불러오지 못했습니다"**가 뜨고 지도가 통째로 렌더되지 않는다. 코드 회귀로 오인하기 쉽다(실제로 오인 보고가 있었다).

## 원인

카카오 개발자 콘솔의 Web 플랫폼 도메인에 `http://localhost:5173`만 등록돼 있다. JS SDK는 Referer 기준으로 도메인을 검사한다. 실측:

```
Referer localhost:5173 → 200 text/javascript
Referer localhost:5174 → 401 application/json
Referer localhost:5175 → 401 application/json
```

## 해결

- 즉시: 지도를 확인할 레인만 5173으로 띄운다(다른 dev 서버를 끄고 그 레인에서 `npm run dev`).
- 근본: 카카오 개발자 콘솔 > 플랫폼 > Web에 `http://localhost:5174`, `http://localhost:5175`를 추가 등록하면 병렬 확인이 가능하다(콘솔 권한 보유자만 가능).

## 재발 방지

- 병렬 레인에서 "지도가 안 뜬다"가 보고되면 **코드보다 먼저 dev 서버 포트를 확인**한다.
- `docs/troubleshooting/2026-08-06-parallel-worktree-sessions.md`의 worktree 체크리스트와 함께 참고.

## 관련 이슈키

없음
