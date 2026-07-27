#!/usr/bin/env bash
# PreToolUse(Bash) 훅: 위험한 명령 패턴을 차단한다.
# 규약: exit 0 = 통과, exit 2 = 차단(stderr가 에이전트에게 전달됨).
# jq가 모든 팀원 머신에 있다는 보장이 없어, 이 프로젝트의 필수 의존성인 Node로 stdin JSON을 파싱한다.

COMMAND=$(node -e "
let data = '';
process.stdin.on('data', (c) => { data += c; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    process.stdout.write((input.tool_input && input.tool_input.command) || '');
  } catch (e) {
    process.stdout.write('');
  }
});
")

if [ -z "$COMMAND" ]; then
  exit 0
fi

check_pattern() {
  printf '%s' "$COMMAND" | grep -qE "$1"
}

if check_pattern 'rm[[:space:]]+(-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*|-[a-zA-Z]*f[a-zA-Z]*r[a-zA-Z]*)([[:space:]]|$)'; then
  echo "차단: 위험한 명령(rm -rf 계열)이 감지되었습니다: $COMMAND" >&2
  exit 2
fi

if check_pattern 'git[[:space:]]+reset[[:space:]]+--hard'; then
  echo "차단: 위험한 명령(git reset --hard)이 감지되었습니다: $COMMAND" >&2
  exit 2
fi

if check_pattern 'git[[:space:]]+push[[:space:]].*--force'; then
  echo "차단: 위험한 명령(git push --force)이 감지되었습니다: $COMMAND" >&2
  exit 2
fi

if check_pattern 'git[[:space:]]+clean[[:space:]]+-[a-zA-Z]*(f[a-zA-Z]*d|d[a-zA-Z]*f)[a-zA-Z]*'; then
  echo "차단: 위험한 명령(git clean -fd 계열)이 감지되었습니다: $COMMAND" >&2
  exit 2
fi

exit 0
