import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
});
