export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 카카오 Place 검색·지도는 백엔드 프록시 없이 프론트가 직접 호출한다(docs/api-contract.md Place·지도·검색).
export const KAKAO_REST_KEY = import.meta.env.VITE_KAKAO_REST_KEY;
export const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY;

// 317: Collection 표지 생성(AI 파트 이미지 서비스). core API와 다른 서비스이고 봉투도 쓰지 않는다.
// VITE_* 환경변수로 두지 않는 이유: 이 경로는 배포 환경에 따라 달라지는 값이 아니라 Traefik이
// 같은 호스트에서 /image/* 를 이미지 서비스로 보내도록 고정한 라우팅이다(docs/api-contract.md
// Collection 표지 생성). 환경변수로 만들면 GitHub Actions Variables에 값을 심어야 하는데,
// 심을 값이 항상 이 리터럴이라 관리 지점만 늘어난다.
export const IMAGE_API_BASE_URL = '/image/api';
