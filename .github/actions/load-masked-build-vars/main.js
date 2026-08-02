import { appendFileSync, writeSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const inputs = [
  ['VITE_API_BASE_URL', 'INPUT_VITE_API_BASE_URL'],
  ['VITE_KAKAO_REST_KEY', 'INPUT_VITE_KAKAO_REST_KEY'],
  ['VITE_KAKAO_JS_KEY', 'INPUT_VITE_KAKAO_JS_KEY'],
  ['DEPLOY_CANARY_REV', 'INPUT_DEPLOY_CANARY_REV'],
];

const githubEnv = process.env.GITHUB_ENV;
if (!githubEnv) {
  throw new Error('GITHUB_ENV is unavailable');
}

let loaded = 0;
for (const [name, inputName] of inputs) {
  if (!Object.hasOwn(process.env, inputName)) {
    continue;
  }

  const value = process.env[inputName];
  if (value.length === 0 || value.trim().length === 0) {
    throw new Error(`${name} must be non-empty`);
  }

  const escaped = value.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
  writeSync(process.stdout.fd, `::add-mask::${escaped}\n`);

  const delimiter = `pinlog_${randomUUID()}`;
  appendFileSync(githubEnv, `${name}<<${delimiter}\n${value}\n${delimiter}\n`, {
    encoding: 'utf8',
  });
  loaded += 1;
}

if (loaded === 0) {
  throw new Error('At least one build variable input is required');
}
