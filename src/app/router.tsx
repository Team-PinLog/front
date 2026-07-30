import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { z } from 'zod';
import { RootLayout } from './RootLayout';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { OAuthCallbackPage } from '@/pages/OAuthCallbackPage';
import { RecordDetailPage } from '@/pages/RecordDetailPage';
import { CollectionDetailPage } from '@/pages/CollectionDetailPage';
import { SearchPage } from '@/pages/SearchPage';
import { MapPage } from '@/pages/MapPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { requireLoggedIn } from '@/features/auth/lib/requireLoggedIn';
import { handleOAuthCallback } from '@/features/auth/lib/handleOAuthCallback';
import { oauthCallbackSearchSchema } from '@/features/auth/lib/oauthCallbackSearchSchema';

const recordIdParamSchema = z.coerce.number().int().positive();
const collectionIdParamSchema = z.coerce.number().int().positive();

const rootRoute = createRootRoute({
  component: RootLayout,
  // TODO: 목업 확정 후 로딩 UI로 교체. 위치만 잡아둔다.
  pendingComponent: () => <p>Loading...</p>,
  // TODO: 목업 확정 후 에러 UI로 교체. 위치만 잡아둔다.
  errorComponent: () => <p>문제가 발생했습니다.</p>,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  // 보호 라우트: logged_in 쿠키 없으면 /login으로 리다이렉트(requireLoggedIn.ts).
  // 앞으로 보호할 라우트가 늘어나면 각 라우트에 동일하게 beforeLoad: requireLoggedIn만 추가하면 된다.
  beforeLoad: requireLoggedIn,
  component: HomePage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  // 보호 대상 아님(beforeLoad 없음) — 걸면 무한 리다이렉트가 된다.
  component: LoginPage,
});

const callbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  validateSearch: (search) => oauthCallbackSearchSchema.parse(search),
  // 성공/실패 모두 beforeLoad에서 리다이렉트로 처리한다(handleOAuthCallback.ts).
  beforeLoad: handleOAuthCallback,
  component: OAuthCallbackPage,
});

const recordDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/records/$recordId',
  // 보호 라우트: 본인 Record만 조회 가능(GET /records/{recordId}, 08_API_명세 5.2).
  beforeLoad: requireLoggedIn,
  params: {
    parse: (rawParams) => ({ recordId: recordIdParamSchema.parse(rawParams.recordId) }),
    stringify: (params) => ({ recordId: String(params.recordId) }),
  },
  component: RecordDetailPage,
});

const mapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/map',
  // 보호 라우트: 내 Record 지도 마커 조회는 개인 데이터다(GET /records/map, 08_API_명세 4.2).
  // 검색(149)과 동일하게 requireLoggedIn을 적용한다.
  beforeLoad: requireLoggedIn,
  component: MapPage,
});

const collectionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/collections/$collectionId',
  // 공개 진입 라우트: Collection 상세는 Feed·타인 Shelf와 함께 비로그인도 접근 가능한 3대 공개 진입점 중 하나다
  // (privacy-rules.md 1장 — "공개 진입 경로는 Feed / 타인 Shelf / Collection 상세 셋뿐이다"). requireLoggedIn을
  // 걸지 않는다 — 소유자/타인 구분은 ownedByMe로 서버가 응답한다(08_API_명세 7.3).
  params: {
    parse: (rawParams) => ({ collectionId: collectionIdParamSchema.parse(rawParams.collectionId) }),
    stringify: (params) => ({ collectionId: String(params.collectionId) }),
  },
  component: CollectionDetailPage,
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/search',
  // 보호 라우트: 본인 소유 Record만 검색 대상이다(08_API_명세 6.1) — collectionDetailRoute(140, 공개
  // 진입점)와 달리 개인 데이터 조회라 requireLoggedIn을 건다. recordDetailRoute와 동일 패턴.
  beforeLoad: requireLoggedIn,
  component: SearchPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  callbackRoute,
  recordDetailRoute,
  collectionDetailRoute,
  searchRoute,
  mapRoute,
]);

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFoundPage,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
