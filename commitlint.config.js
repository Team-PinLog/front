export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'chore', 'docs', 'style', 'test', 'perf', 'ci'],
    ],
    // 이슈키(S15P11A705-42)가 길어 기본 72자로는 막히므로 완화
    'header-max-length': [2, 'always', 100],
    // 한글 제목 허용을 위해 case 검사 비활성화
    'subject-case': [0],
  },
};
