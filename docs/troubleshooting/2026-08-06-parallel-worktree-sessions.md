# git worktree로 세션을 나눠 병렬 작업하기 — 실제로 걸린 함정 6개

- 날짜: 2026-08-06
- 관련 이슈키: (없음 — 작업 방식)

## 배경

하루에 티켓 9개를 처리하려고 `git worktree`로 작업 폴더를 물리적으로 나눠 Claude 세션 3개를 동시에 돌렸다. 조율 세션 1개가 `dev`를 잡고 worktree 3개를 지휘하는 구성이다.

```
PinLog/
├── front/           dev                    ← 조율 전담(구현하지 않음)
├── front-detail/    332 → 333 → 334
├── front-cover/     326 → 327 → 346 → 347
└── front-shelf/     328 → 329 → 348
```

**결과적으로 잘 동작했다.** 레인 간 PR 3개(#125·#126·#127)의 파일 교집합을 실제로 대조했을 때 **0**이었고, 브랜치가 `dev`보다 7 커밋 뒤처진 상태에서도 전부 `MERGEABLE/CLEAN`이었다.

다만 **세팅 단계에서 조용히 잘못될 수 있는 지점이 여럿** 있었다. 아래는 실제로 걸렸거나, 걸리기 직전에 잡은 것들이다.

---

## 1. 폴더를 나눠도 충돌은 머지에서 난다

가장 먼저 바로잡아야 할 오해다. **worktree는 파일이 디스크에서 섞이는 것만 막는다.** 두 레인이 같은 파일을 고치면 편집 중에는 아무 신호가 없다가 머지에서 터진다.

그래서 폴더가 아니라 **파일 footprint로 나눠야 한다.** 이번에 묶은 근거:

| 쌍        | 공유 파일                   | 조치                                                                                             |
| --------- | --------------------------- | ------------------------------------------------------------------------------------------------ |
| 326 ↔ 327 | `NewCollectionModal.tsx`    | 같은 레인 순차 (326은 로직 이동, 327은 같은 블록을 컴포넌트로 추출 — 자동 머지 불가)             |
| 332 ↔ 334 | `ContextStickyNoteCard.tsx` | 같은 레인 순차 (포스트잇이 두 화면의 단일 구현)                                                  |
| 328 ↔ 331 | 없음                        | 병렬 가능. 단 328이 바꾸는 `widthPx`가 331의 `COVER_COMPACT_WIDTH_PX` 임계값을 건드려 328을 먼저 |

**재발 방지**: 레인을 나누기 전에 각 티켓의 대상 파일 집합을 확정하고 **교집합을 실제로 구해라.** `gh pr view <n> --json files`로 PR끼리 대조하면 사후 검증도 된다.

---

## 2. `dev`를 두 곳에서 체크아웃할 수 없다

git은 같은 브랜치를 두 worktree에서 체크아웃하지 못하게 막는다. 조율 세션이 `front/`에서 `dev`를 잡고 있으므로 **레인은 `dev`를 건드릴 수 없다.**

- 최신화: `git fetch origin && git rebase origin/dev`
- 다음 티켓 브랜치: `git checkout -b feature/Jira-XXX-... origin/dev`
- ❌ `git pull` / ❌ `git checkout dev`

**재발 방지**: worktree 브리프에 이 세 줄을 명시한다. 모르면 레인이 `git checkout dev`에서 막히고 원인을 못 찾는다.

## 3. `git worktree add -b`가 upstream을 `origin/dev`로 잡는다

```bash
git worktree add ../front-cover -b feature/<jira-key>-... origin/dev
# → branch '...' set up to track 'origin/dev'
```

`branch.autoSetupMerge` 때문이다. 이 상태로 두면:

- `git status`가 **"origin/dev와 동기화됨"이라고 거짓 보고**한다. 실제로는 자기 브랜치가 dev보다 앞서 있는데도.
- 실수로 `git push`를 치면 `dev`로 밀릴 뻔한다(`push.default=simple`이 이름 불일치로 막아 주긴 한다).

해결: 만든 직후 끊는다.

```bash
git branch --unset-upstream <branch>
```

`/pr` 절차가 `git push -u origin <branch>`로 upstream을 명시하므로 없어도 문제없다.

## 4. `npm ci`를 해야 husky 훅이 **생긴다**

`node_modules`는 gitignore라 worktree에 따라오지 않는다. 여기까지는 예상되는데, **`.husky/_` 디렉터리도 `prepare` 스크립트가 만드는 것**이라 설치 전에는 존재하지 않는다.

`core.hooksPath = .husky/_`는 repo-level 설정이라 worktree 간 공유되지만, **경로가 가리키는 디렉터리가 없으면 훅이 조용히 실행되지 않는다.** 즉:

- `lint-staged`(eslint --fix, prettier --write)가 안 돈다
- `commitlint`가 안 돈다
- `prepare-commit-msg`의 **이슈키 자동 삽입이 안 된다** → 커밋 규약이 소리 없이 깨진다

**재발 방지**: worktree를 만들면 곧바로 `npm ci`. 훅이 생겼는지 `ls .husky/_/pre-commit`로 확인한다.

## 5. `.env`는 따라오지 않는다 — 그런데 실패가 조용하다

gitignore라 당연히 안 따라오는데, 없으면 앱이 **에러 없이 반쯤 죽는다**:

- `VITE_KAKAO_JS_KEY` 없음 → 지도가 안 뜬다
- `VITE_API_BASE_URL`이 `undefined` → API 경로가 `undefined/auth/...`가 된다

이번에 세팅 직후 놓쳤고, 사용자가 "포트가 어떻게 되냐"고 물었을 때 확인하다 발견했다.

**재발 방지**: worktree 생성 스크립트에 `cp .env ../<worktree>/.env`를 포함한다. 이미 dev 서버를 띄운 뒤라면 **재시작해야 한다** — Vite는 `.env`를 시작 시점에만 읽는다.

## 6. `/pr`의 `git add -A`가 임시 파일을 쓸어담는다

레인마다 "이 worktree는 무슨 작업 담당"을 적은 안내 파일이 필요했다. 참고한 글은 `NOW.md`를 권했는데, **이 레포에서 그건 위험하다** — `/pr` 절차가 `git add -A`를 하므로 그대로 커밋에 섞인다.

`.gitignore`에 이미 **`CLAUDE.local.md`**가 있고, Claude Code가 세션 시작 시 자동으로 읽는다. 이걸 쓰면 두 문제가 함께 풀린다.

같은 이유로 `/ts` 문서를 레인에서 쓸 때도 주의가 필요했다 — untracked로 남겨 두면 **다음 티켓 PR에 딸려 들어간다.** 이번에는 조율 세션이 다음 티켓 착수 **전에** 회수해 한 PR로 묶었다.

---

## 부수적으로 확인한 것

- **포트**: `vite.config.ts`에 `server.port`도 `strictPort`도 없어 5173이 잡혀 있으면 자동으로 5174, 5175로 올라간다. 설정 불필요.
- **로그인은 한 번만**: 쿠키는 포트를 구분하지 않는다(RFC 6265 — 포트는 쿠키 스코프가 아니다). 5173에서 로그인하면 5174·5175도 같은 세션을 쓴다.
- **디스크**: worktree마다 `node_modules` 약 225MB.

## 재발 방지 — 세팅 체크리스트

```bash
git worktree add ../front-<name> -b feature/Jira-XXX-<desc> origin/dev
git branch --unset-upstream feature/Jira-XXX-<desc>   # 3번
cp .env ../front-<name>/.env                                 # 5번
(cd ../front-<name> && npm ci)                               # 4번
# CLAUDE.local.md 작성 (2번 규칙 + 담당 파일 목록 포함)        # 6번
```

끝나면:

```bash
git worktree remove ../front-<name> && git worktree prune
```

## 관련 이슈키

- Jira 작업·327·328·329·330·332·346·347 (이 방식으로 진행)
