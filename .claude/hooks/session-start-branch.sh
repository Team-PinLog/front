#!/usr/bin/env bash
# SessionStart 훅: 현재 git 브랜치를 컨텍스트로 제공한다.
# dev/main에서 실수로 작업하는 것을 방지하기 위해 보호 브랜치는 별도 경고를 덧붙인다.

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

if [ -z "$BRANCH" ] || [ "$BRANCH" = "HEAD" ]; then
  exit 0
fi

echo "현재 git 브랜치: $BRANCH"

if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "dev" ]; then
  echo "주의: 보호 브랜치($BRANCH)에서 세션이 시작되었습니다. docs/conventions.md 기준 feature 브랜치로 전환 후 작업하세요."
fi

exit 0
