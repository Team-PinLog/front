/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // 카카오 Place 검색(REST)·지도 렌더링(JS SDK) 키. 프론트 직접 호출 확정(docs/api-contract.md Place·지도·검색).
  readonly VITE_KAKAO_REST_KEY: string;
  readonly VITE_KAKAO_JS_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
