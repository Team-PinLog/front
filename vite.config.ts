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
        changeOrigin: true,
      },
    },
  },
  test: {
    // 현재는 순수 함수(봉투 언랩·에러 변환) 테스트만 있어 DOM 없이 node 환경으로 충분하다.
    // 컴포넌트 테스트 도입 시 jsdom으로 교체.
    environment: 'node',
  },
});
