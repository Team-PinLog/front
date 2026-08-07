import type { Plugin } from 'vite';

/**
 * 로컬 백엔드 없이 화면을 확인하기 위한 **개발 전용** API 목업.
 *
 * `.env`에 `VITE_MOCK_API=1`이 있을 때만 vite.config.ts가 이 플러그인을 끼운다. `configureServer`는
 * dev 서버에만 붙는 훅이라 프로덕션 번들·빌드 산출물에는 어떤 형태로도 들어가지 않는다
 * (docs/conventions.md 7장이 개발 전용 라우트에 요구하는 것과 같은 성격의 격리다 — 다만 그쪽은
 * 앱 코드라 `import.meta.env.DEV`로 감싸고, 이건 아예 빌드 파이프라인 밖이다).
 *
 * ⚠️ 여기 있는 응답은 **실제 계약이 아니라 화면 확인용 더미다.** 스키마는 각 API 함수의 Zod
 * 스키마(getRecordMapMarkers·getMyCollections·searchRecords·getMeSummary)에 맞춰 두었으므로,
 * 계약이 바뀌면 이 파일이 아니라 그쪽이 기준이다. 계약 자체를 여기서 추측해 늘리지 않는다.
 */

/** 08_API_명세 11.0 봉투. httpClient 인터셉터가 이 껍데기를 벗긴다. */
function envelope(data: unknown) {
  return JSON.stringify({ success: true, data });
}

/**
 * 더미 Collection. id는 마커 색을 정하는 해시 입력이라(getRecordMarkerColor) 값을 바꾸면 색도
 * 바뀐다 — 1~4는 rose/green/denim/teal로 서로 뚜렷이 구분되는 조합이라 그대로 둔다.
 */
const COLLECTIONS = [
  { collectionId: 1, title: '비 오는 날의 카페', recordCount: 3 },
  { collectionId: 2, title: '혼자 걷기 좋은 길', recordCount: 2 },
  { collectionId: 3, title: '늦게까지 하는 곳', recordCount: 2 },
  { collectionId: 4, title: '성수동 산책', recordCount: 1 },
];

/**
 * 더미 Record 10개. 전부 서울이라 fitBounds가 한 화면에 담기고, 마커가 적당히 흩어져 겹침·범례를
 * 함께 확인할 수 있다. latestCollectionId가 null인 둘은 "아직 담지 않음"(slate) 마커가 된다.
 */
const RECORDS = [
  {
    recordId: 1,
    placeId: 101,
    name: '연남동 어반플랜트',
    lat: 37.5622,
    lng: 126.9256,
    latestCollectionId: 1,
  },
  {
    recordId: 2,
    placeId: 102,
    name: '망원 헤이든',
    lat: 37.5556,
    lng: 126.9046,
    latestCollectionId: 1,
  },
  {
    recordId: 3,
    placeId: 103,
    name: '합정 앤트러사이트',
    lat: 37.5495,
    lng: 126.9139,
    latestCollectionId: 1,
  },
  {
    recordId: 4,
    placeId: 104,
    name: '서촌 대오서점',
    lat: 37.5799,
    lng: 126.97,
    latestCollectionId: 2,
  },
  {
    recordId: 5,
    placeId: 105,
    name: '부암동 클럽에스프레소',
    lat: 37.592,
    lng: 126.9666,
    latestCollectionId: 2,
  },
  {
    recordId: 6,
    placeId: 106,
    name: '을지로 커피한약방',
    lat: 37.5665,
    lng: 126.991,
    latestCollectionId: 3,
  },
  {
    recordId: 7,
    placeId: 107,
    name: '안국 어니언',
    lat: 37.5765,
    lng: 126.9856,
    latestCollectionId: 3,
  },
  {
    recordId: 8,
    placeId: 108,
    name: '성수 대림창고',
    lat: 37.5445,
    lng: 127.0557,
    latestCollectionId: 4,
  },
  {
    recordId: 9,
    placeId: 109,
    name: '이태원 새비지가든',
    lat: 37.5345,
    lng: 126.9946,
    latestCollectionId: null,
  },
  {
    recordId: 10,
    placeId: 110,
    name: '한남 사운즈한남',
    lat: 37.5348,
    lng: 127.0016,
    latestCollectionId: null,
  },
];

const BOUNDS = {
  swLat: Math.min(...RECORDS.map((r) => r.lat)),
  swLng: Math.min(...RECORDS.map((r) => r.lng)),
  neLat: Math.max(...RECORDS.map((r) => r.lat)),
  neLng: Math.max(...RECORDS.map((r) => r.lng)),
};

/**
 * 검색 결과 더미. matchedContext.contextId는 포스트잇의 색·기울기·테이프 각도를 정하는 해시
 * 입력이라(ContextStickyNote) 서로 다른 값을 줘서 세 장이 각각 다른 색으로 나오게 했다.
 * keywords: []와 keywordStatus는 AI 미완료 상태 표시를 확인하려고 일부러 섞어 두었다.
 */
const SEARCH_ITEMS = [
  {
    recordId: 1,
    similarity: 0.91,
    place: {
      placeId: 101,
      name: '연남동 어반플랜트',
      address: '서울 마포구 성미산로 161-4',
      lat: 37.5622,
      lng: 126.9256,
    },
    matchedContext: {
      contextId: 3,
      body: '창가 자리에서 비 오는 거 보면서\n두 시간 앉아 있었다.\n아무도 말 안 걸어서 좋았음.',
      createdAt: '2026-07-14T10:12:00Z',
    },
    keywords: ['조용한', '창가자리', '비오는날'],
    keywordStatus: 'COMPLETED' as const,
    createdAt: '2026-07-14T10:12:00Z',
  },
  {
    recordId: 2,
    similarity: 0.84,
    place: {
      placeId: 102,
      name: '망원 헤이든',
      address: '서울 마포구 월드컵로19길 14',
      lat: 37.5556,
      lng: 126.9046,
    },
    matchedContext: {
      contextId: 4,
      body: '11시까지 한다.\n노트북 켜도 눈치 안 보임.',
      createdAt: '2026-06-02T13:40:00Z',
    },
    keywords: ['늦게까지', '혼자'],
    keywordStatus: 'COMPLETED' as const,
    createdAt: '2026-06-02T13:40:00Z',
  },
  {
    recordId: 6,
    similarity: 0.72,
    place: {
      placeId: 106,
      name: '을지로 커피한약방',
      address: '서울 중구 삼일대로12길 16-6',
      lat: 37.5665,
      lng: 126.991,
    },
    matchedContext: {
      contextId: 5,
      body: '골목 안쪽이라 찾기 어려웠는데\n들어가니까 조용하고 좋았다.',
      createdAt: '2026-05-21T09:05:00Z',
    },
    // AI 미완료 상태(정상 응답)를 화면에서 확인하기 위한 항목이다 — 오류 표시가 아니어야 한다.
    keywords: [],
    keywordStatus: 'PROCESSING' as const,
    createdAt: '2026-05-21T09:05:00Z',
  },
];

const ME_SUMMARY = {
  provider: 'kakao',
  email: 'dev@pinlog.local',
  recordCount: RECORDS.length,
  collectionCount: COLLECTIONS.length,
  followerCount: 12,
  followingCount: 8,
};

export function devMockApi(apiBase = '/api/core/v1'): Plugin {
  return {
    name: 'pinlog-dev-mock-api',
    // apply:'serve'로 dev 서버에서만 동작한다. build에서는 아예 호출되지 않는다.
    apply: 'serve',
    configureServer(server) {
      // ⚠️ configureServer 본문에서 바로 use()하면 Vite 내부 미들웨어(프록시 포함)보다 **먼저**
      // 실행된다. 이 순서가 핵심이다 — 뒤에 붙이면 /api 프록시가 먼저 낚아채 localhost:8080으로
      // 보내고 백엔드가 없으니 그대로 실패한다.
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url ?? '';
        if (!rawUrl.startsWith(apiBase)) {
          next();
          return;
        }

        // 쿼리스트링(cursor·size 등)을 떼고 경로만 본다.
        const [path, rawQuery = ''] = rawUrl.slice(apiBase.length).split('?');
        const method = (req.method ?? 'GET').toUpperCase();
        const query = new URLSearchParams(rawQuery);

        const body =
          resolve(path, method) ?? resolveFeed(path, method, query) ?? resolveFollows(path, method);
        if (body === null) {
          next();
          return;
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        // 목업 응답이 브라우저·프록시 캐시에 남으면 값을 고쳐도 화면이 안 바뀐다.
        res.setHeader('Cache-Control', 'no-store');
        res.statusCode = 200;
        res.end(body);
      });

      server.config.logger.info(
        '  [35m➜[0m  [1mdev mock API[0m: ' +
          `${RECORDS.length} records / ${COLLECTIONS.length} collections (VITE_MOCK_API=1)`,
      );
    },
  };
}

/** 아는 경로면 응답 문자열을, 모르면 null을 돌려준다(그 경우 기존 프록시로 넘어간다). */
function resolve(path: string, method: string): string | null {
  if (method === 'GET' && path === '/records/map') {
    return envelope({ bounds: BOUNDS, items: RECORDS });
  }
  if (method === 'GET' && path === '/collections') {
    // 커서 페이지네이션이지만 더미는 한 장에 다 담는다 — 범례가 이름을 못 채우는 경우를
    // 재현하려면 hasNext를 true로 두고 잘라서 주면 된다.
    return envelope({ items: COLLECTIONS.map(withCover), nextCursor: null, hasNext: false });
  }
  if (method === 'POST' && path === '/search/records') {
    return envelope({ bounds: BOUNDS, items: SEARCH_ITEMS });
  }
  if (method === 'GET' && path === '/me/summary') {
    return envelope(ME_SUMMARY);
  }
  return null;
}

/**
 * 탐색(Feed) 더미. 위 4개로는 한 쪽(최대 15칸)도 못 채워 선반이 늘 반쯤 비어 보이므로 제목 풀에서
 * 넉넉히 만들어 낸다. cursor는 서버가 주는 opaque 값이라 프론트가 해석하지 않으므로(08_API_명세 10.1)
 * 여기서는 offset을 문자열로 감싼 것을 그대로 돌려준다 — 프론트 입장에서는 여전히 불투명하다.
 */
const FEED_TITLES = [
  '비 오는 날의 카페',
  '혼자 걷기 좋은 길',
  '늦게까지 하는 곳',
  '성수동 산책',
  '창가 자리가 있는 곳',
  '책 읽기 좋은 자리',
  '골목 안쪽의 밥집',
  '해 질 무렵의 다리',
  '오래 앉아 있어도 되는 곳',
  '겨울에 다시 갈 곳',
  '조용한 전시',
  '문 닫기 전에 들르는 곳',
  '길 잃기 좋은 동네',
  '두 번째로 좋아하는 언덕',
  '아무도 없는 아침',
  '한 잔만 마시고 나오는 곳',
  '주말에만 여는 가게',
  '버스에서 내려 걷는 길',
  '노트를 펴 두는 자리',
  '다시 찾아가 본 곳',
];

const FEED_TOTAL = FEED_TITLES.length * 3;

/** 팔로우한 책장 더미. 책장 화면 아래 단(팔로우 단)과 좌우 쪽 넘김을 확인하려면 최소 몇 개는 있어야 한다. */
const FOLLOWS = [
  { followId: 1, alias: '유하람의 책장', createdAt: '2026-04-02T00:00:00Z' },
  { followId: 2, alias: null, createdAt: '2026-04-05T00:00:00Z' },
  { followId: 3, alias: '골목 수집가', createdAt: '2026-04-08T00:00:00Z' },
  { followId: 4, alias: '밤에 걷는 사람', createdAt: '2026-04-11T00:00:00Z' },
  { followId: 5, alias: null, createdAt: '2026-04-14T00:00:00Z' },
];

function resolveFollows(path: string, method: string): string | null {
  if (method !== 'GET') {
    return null;
  }
  if (path === '/follows') {
    return envelope({ items: FOLLOWS, nextCursor: null, hasNext: false });
  }
  // /follows/{followId}/collections — 책장마다 다른 권수를 주려고 followId로 개수를 흔든다.
  const match = /^\/follows\/(\d+)\/collections$/.exec(path);
  if (!match) {
    return null;
  }
  const followId = Number(match[1]);
  const count = (followId % 4) + 2;
  const items = Array.from({ length: count }, (_, i) => ({
    collectionId: followId * 100 + i,
    title: FEED_TITLES[(followId * 3 + i) % FEED_TITLES.length],
    recordCount: (i % 5) + 1,
    keywords: [],
    coverImageUrl: null,
    createdAt: '2026-04-01T00:00:00Z',
  }));
  return envelope({ items, nextCursor: null, hasNext: false });
}

function resolveFeed(path: string, method: string, query: URLSearchParams): string | null {
  if (method !== 'GET' || path !== '/feed/collections') {
    return null;
  }
  const size = Math.max(1, Math.min(50, Number(query.get('size')) || 10));
  const offset = Number(query.get('cursor')) || 0;
  const items = Array.from({ length: Math.min(size, Math.max(0, FEED_TOTAL - offset)) }, (_, i) => {
    const index = offset + i;
    return {
      // position·requestId는 서버가 정하는 값이고 프론트는 재계산하지 않는다(AGENTS.md 절대 금지 5).
      position: index,
      collectionId: index + 1,
      title: FEED_TITLES[index % FEED_TITLES.length],
      recordCount: (index % 7) + 1,
      // keywords: []는 AI 미완료 상태의 정상 응답이다 — 일부러 섞어 둔다.
      keywords: index % 4 === 0 ? [] : ['조용함', '재방문'],
      coverImageUrl: null,
      createdAt: '2026-05-01T00:00:00Z',
    };
  });
  const next = offset + items.length;
  return envelope({
    requestId: `dev-req-${offset}`,
    items,
    nextCursor: next < FEED_TOTAL ? String(next) : null,
    hasNext: next < FEED_TOTAL,
  });
}

function withCover(collection: (typeof COLLECTIONS)[number]) {
  // coverImageUrl은 null이어도 생략되지 않는 필드다(api-contract.md § Collection 표지 이미지).
  return { ...collection, coverImageUrl: null, createdAt: '2026-05-01T00:00:00Z' };
}
