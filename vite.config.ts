import { fileURLToPath, URL } from 'node:url';
// defineConfig는 test 옵션을 함께 받으려고 vitest/config에서 가져온다. loadEnv는 vitest가
// 재수출하지 않으므로 vite에서 직접 가져온다.
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// 확장자를 명시한다 — tsconfig.node.json이 moduleResolution:nodenext라 상대 경로에 확장자가
// 필요하고, allowImportingTsExtensions가 켜져 있어 .ts를 그대로 쓸 수 있다.
import { devMockApi } from './tools/devMockApi.ts';

// https://vite.dev/config/
// .env의 VITE_MOCK_API를 읽어야 해서 객체가 아니라 함수 형태로 둔다 — 설정 파일은 Vite가
// .env를 process.env에 넣어주기 전에 평가되므로 loadEnv로 직접 읽는다.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // 로컬 백엔드 없이 화면만 볼 때 켠다(tools/devMockApi.ts). 기본은 꺼짐이라 값을 지우면
  // 예전처럼 /api 프록시가 그대로 동작한다.
  const useMockApi = env.VITE_MOCK_API === '1';

  return {
    plugins: [
      react(),
      ...(useMockApi ? [devMockApi(env.VITE_API_BASE_URL || '/api/core/v1')] : []),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        // 로컬 BFF 우회용. 실제 백엔드 포트/도메인은 인프라 확정 후 조정.
        // target 포트는 임시값이며 백엔드 로컬 실행 포트 확정 시 교체한다.
        // 쿠키 전송은 axios withCredentials로 처리 예정(프론트는 프록시로 쿠키를 직접 다루지 않음).
        '/api': {
          target: 'http://localhost:8080',
          // target: 'https://pin-log.com',
          changeOrigin: true,
          secure: true,
        },
        // 317: Collection 표지 생성(AI 파트 이미지 서비스). 운영은 Traefik이 같은 호스트에서
        // /image/* 를 이 서비스로 보내므로 same-origin이지만, 로컬에는 이미지 서비스도 GPU 워커도
        // 없어 운영으로 직접 프록시한다 — 로컬에서 표지 생성을 확인하려면 이 경로가 필요하다.
        // /api와 달리 target을 localhost로 둘 선택지가 없다.
        // 프론트가 쓰는 경로는 /image/api/*(생성·상태·선택)와 /image/files/*(결과 이미지) 둘뿐이다.
        // ❌ /image/jobs/* 는 워커 전용이라 호출하지 않는다(docs/api-contract.md Collection 표지 생성).
        '/image': {
          target: 'https://pin-log.com',
          changeOrigin: true,
          secure: true,
        },
      },
    },
    test: {
      // document.cookie(CSRF 헤더 인터셉터) 테스트를 위해 jsdom 필요.
      environment: 'jsdom',
    },
  };
});
