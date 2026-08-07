# 스택 브랜치가 부모 squash 머지 후 CONFLICTING이 된다 — `--onto` 재배치로 해소

- 날짜: 2026-08-07
- 관련 이슈키: S15P11A705-374 (외 371·376·377·378·379·386·389 동일 패턴)

## 증상

브랜치를 스택으로 쌓아 작업(A→B, B가 A 위)한 뒤 A의 PR을 **Squash and merge**로 머지하면, B의 PR이 `CONFLICTING/DIRTY`로 바뀐다. `git rebase origin/dev`를 그냥 돌리면 이미 머지된 A의 커밋들이 patch-equivalent로 인식되지 않아 자동 스킵되지 못하고 충돌로 남는다(#157에서 실측).

## 원인

squash 머지는 A의 커밋들을 **내용은 같지만 해시가 다른 새 커밋 하나**로 dev에 넣는다. B 브랜치에는 원래 A 커밋들이 그대로 남아 있어, 일반 rebase가 이를 "이미 적용됨"으로 판정하지 못하고 같은 변경을 두 번 적용하려다 충돌한다.

## 해결

이미 머지된 구간을 rebase **범위에서 제외**한다:

```bash
git fetch origin
git rebase --onto origin/dev <B가 얹혀 있던 A의 마지막 커밋 해시>
# 검사(tsc·test·lint·build) 재실행 후
git push --force-with-lease origin <B 브랜치>
```

이 방식으로 이 날 스택 재배치를 7회 이상 수행했고 **충돌 0건**이었다 — B의 diff가 A의 최종 상태 기준이고, dev의 squash 결과가 그와 내용상 동일하기 때문이다. 재배치 후 PR diff에는 B 자기 분량만 남는다.

## 재발 방지

- 스택 PR은 본문 상단에 머지 순서를 명시하고, **부모가 머지될 때마다 자식을 `--onto`로 재배치 → `--force-with-lease` push**를 표준 절차로 한다.
- `git rebase origin/dev`(범위 미지정)를 스택 브랜치에 그냥 돌리지 않는다.
- force push는 반드시 `--force-with-lease`.

## 관련 이슈키

S15P11A705-374(PR #157 — 최초 발생·해법 확립), 이후 371/376/377/378/379/386/389 스택 정리에 동일 적용
